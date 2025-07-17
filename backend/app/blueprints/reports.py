"""
Reports Blueprint - Community moderation and reporting system
GNU GPL v3 Licensed
"""

from flask import Blueprint, request, jsonify
from app.utils.auth import login_required, role_required, get_user_by_id
from app.utils.firebase_config import get_db
import datetime

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/', methods=['POST'])
@login_required
def create_report():
    """Create new report."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    required_fields = ['report_type', 'target_id', 'reason']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate report type
    valid_types = ['event', 'user', 'comment', 'organizer']
    if data['report_type'] not in valid_types:
        return jsonify({'error': 'Invalid report type'}), 400
    
    # Validate reason
    valid_reasons = [
        'inappropriate_content',
        'spam',
        'fake_event',
        'harassment',
        'copyright_violation',
        'fraud',
        'other'
    ]
    if data['reason'] not in valid_reasons:
        return jsonify({'error': 'Invalid reason'}), 400
    
    db = get_db()
    
    # Check if target exists
    target_exists = False
    target_data = None
    
    if data['report_type'] == 'event':
        event_doc = db.collection('events').document(data['target_id']).get()
        if event_doc.exists:
            target_exists = True
            target_data = event_doc.to_dict()
    elif data['report_type'] == 'user' or data['report_type'] == 'organizer':
        user_doc = db.collection('users').document(data['target_id']).get()
        if user_doc.exists:
            target_exists = True
            target_data = user_doc.to_dict()
    elif data['report_type'] == 'comment':
        # For comments, we'd need to search through events
        # This is a simplified implementation
        target_exists = True
    
    if not target_exists:
        return jsonify({'error': 'Target not found'}), 404
    
    # Create report
    report_data = {
        'reporter_id': user_id,
        'report_type': data['report_type'],
        'target_id': data['target_id'],
        'reason': data['reason'],
        'description': data.get('description', ''),
        'status': 'pending',
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow(),
        'moderator_id': None,
        'moderator_notes': '',
        'resolution': None
    }
    
    # Add target information for context
    if target_data:
        if data['report_type'] == 'event':
            report_data['target_info'] = {
                'title': target_data.get('title', ''),
                'organizer_id': target_data.get('organizer_id', '')
            }
        elif data['report_type'] in ['user', 'organizer']:
            report_data['target_info'] = {
                'username': target_data.get('username', ''),
                'email': target_data.get('email', '')
            }
    
    # Save report
    report_ref = db.collection('reports').add(report_data)
    report_id = report_ref[1].id
    
    return jsonify({
        'message': 'Report submitted successfully',
        'report_id': report_id
    }), 201


@reports_bp.route('/', methods=['GET'])
@role_required('moderator', 'admin')
def get_reports():
    """Get reports for moderation (Moderators and Admins only)."""
    db = get_db()
    
    # Query parameters
    status = request.args.get('status', 'pending')
    report_type = request.args.get('type')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    # Base query
    query = db.collection('reports').where('status', '==', status)
    
    if report_type:
        query = query.where('report_type', '==', report_type)
    
    # Execute query
    reports = query.order_by('created_at', direction='DESCENDING').limit(per_page).offset((page - 1) * per_page).stream()
    
    reports_list = []
    for report in reports:
        report_data = report.to_dict()
        report_data['id'] = report.id
        
        # Convert datetime objects to ISO format
        if 'created_at' in report_data and report_data['created_at']:
            report_data['created_at'] = report_data['created_at'].isoformat()
        if 'updated_at' in report_data and report_data['updated_at']:
            report_data['updated_at'] = report_data['updated_at'].isoformat()
        
        # Get reporter info
        reporter_data = get_user_by_id(report_data['reporter_id'])
        if reporter_data:
            report_data['reporter_info'] = {
                'username': reporter_data.get('username', 'Unknown'),
                'email': reporter_data.get('email', '')
            }
        
        reports_list.append(report_data)
    
    return jsonify({
        'reports': reports_list,
        'page': page,
        'per_page': per_page,
        'status': status
    }), 200


@reports_bp.route('/<report_id>', methods=['PUT'])
@role_required('moderator', 'admin')
def update_report(report_id):
    """Update report status and add moderator notes."""
    data = request.get_json()
    moderator_id = request.current_user['user_id']
    
    db = get_db()
    
    # Get report
    report_doc = db.collection('reports').document(report_id).get()
    
    if not report_doc.exists:
        return jsonify({'error': 'Report not found'}), 404
    
    # Update fields
    update_data = {
        'updated_at': datetime.datetime.utcnow(),
        'moderator_id': moderator_id
    }
    
    if 'status' in data:
        valid_statuses = ['pending', 'investigating', 'resolved', 'dismissed']
        if data['status'] in valid_statuses:
            update_data['status'] = data['status']
    
    if 'moderator_notes' in data:
        update_data['moderator_notes'] = data['moderator_notes']
    
    if 'resolution' in data:
        update_data['resolution'] = data['resolution']
    
    # Update report
    db.collection('reports').document(report_id).update(update_data)
    
    # Log moderation action
    moderation_log = {
        'moderator_id': moderator_id,
        'action': 'report_updated',
        'target_type': 'report',
        'target_id': report_id,
        'details': update_data,
        'timestamp': datetime.datetime.utcnow()
    }
    
    db.collection('moderation_logs').add(moderation_log)
    
    return jsonify({'message': 'Report updated successfully'}), 200


@reports_bp.route('/<report_id>/actions', methods=['POST'])
@role_required('moderator', 'admin')
def take_moderation_action(report_id):
    """Take moderation action based on report."""
    data = request.get_json()
    moderator_id = request.current_user['user_id']
    
    if not data.get('action'):
        return jsonify({'error': 'Action required'}), 400
    
    action = data['action']
    valid_actions = ['warn_user', 'suspend_user', 'ban_user', 'delete_content', 'hide_content']
    
    if action not in valid_actions:
        return jsonify({'error': 'Invalid action'}), 400
    
    db = get_db()
    
    # Get report
    report_doc = db.collection('reports').document(report_id).get()
    
    if not report_doc.exists:
        return jsonify({'error': 'Report not found'}), 404
    
    report_data = report_doc.to_dict()
    target_id = report_data['target_id']
    target_type = report_data['report_type']
    
    # Execute action
    if action in ['warn_user', 'suspend_user', 'ban_user']:
        # Actions on users
        if target_type in ['user', 'organizer']:
            user_id = target_id
        elif target_type == 'event':
            # Get event organizer
            event_doc = db.collection('events').document(target_id).get()
            if event_doc.exists:
                user_id = event_doc.to_dict().get('organizer_id')
            else:
                return jsonify({'error': 'Event not found'}), 404
        else:
            return jsonify({'error': 'Cannot apply user action to this target type'}), 400
        
        # Apply user moderation
        moderation_data = {
            'user_id': user_id,
            'action': action,
            'reason': data.get('reason', 'Moderation action'),
            'moderator_id': moderator_id,
            'duration_days': data.get('duration_days', 0),  # 0 = permanent
            'created_at': datetime.datetime.utcnow(),
            'is_active': True
        }
        
        if action == 'warn_user':
            # Add warning to user
            warnings_ref = db.collection('user_warnings')
            warnings_ref.add(moderation_data)
            
        elif action == 'suspend_user':
            # Suspend user account
            suspension_data = moderation_data.copy()
            if suspension_data['duration_days'] > 0:
                suspension_data['expires_at'] = datetime.datetime.utcnow() + datetime.timedelta(days=suspension_data['duration_days'])
            
            db.collection('user_suspensions').add(suspension_data)
            
            # Update user status
            db.collection('users').document(user_id).update({
                'is_suspended': True,
                'suspended_at': datetime.datetime.utcnow(),
                'suspended_by': moderator_id
            })
            
        elif action == 'ban_user':
            # Ban user permanently
            ban_data = moderation_data.copy()
            db.collection('user_bans').add(ban_data)
            
            # Update user status
            db.collection('users').document(user_id).update({
                'is_banned': True,
                'banned_at': datetime.datetime.utcnow(),
                'banned_by': moderator_id
            })
    
    elif action in ['delete_content', 'hide_content']:
        # Actions on content
        if target_type == 'event':
            if action == 'delete_content':
                db.collection('events').document(target_id).delete()
            elif action == 'hide_content':
                db.collection('events').document(target_id).update({
                    'is_public': False,
                    'hidden_at': datetime.datetime.utcnow(),
                    'hidden_by': moderator_id
                })
        
        elif target_type == 'comment':
            # This would need more complex logic to find and modify comments
            # For now, we'll just log the action
            pass
    
    # Log the moderation action
    action_log = {
        'moderator_id': moderator_id,
        'action': action,
        'target_type': target_type,
        'target_id': target_id,
        'report_id': report_id,
        'reason': data.get('reason', ''),
        'timestamp': datetime.datetime.utcnow()
    }
    
    db.collection('moderation_logs').add(action_log)
    
    # Update report status
    db.collection('reports').document(report_id).update({
        'status': 'resolved',
        'resolution': f'Action taken: {action}',
        'updated_at': datetime.datetime.utcnow()
    })
    
    return jsonify({
        'message': f'Moderation action "{action}" applied successfully'
    }), 200


@reports_bp.route('/stats', methods=['GET'])
@role_required('moderator', 'admin')
def get_moderation_stats():
    """Get moderation statistics."""
    db = get_db()
    
    # Get report counts by status
    reports_pending = len(list(db.collection('reports').where('status', '==', 'pending').stream()))
    reports_investigating = len(list(db.collection('reports').where('status', '==', 'investigating').stream()))
    reports_resolved = len(list(db.collection('reports').where('status', '==', 'resolved').stream()))
    reports_dismissed = len(list(db.collection('reports').where('status', '==', 'dismissed').stream()))
    
    # Get recent moderation actions
    recent_actions = db.collection('moderation_logs').order_by('timestamp', direction='DESCENDING').limit(10).stream()
    
    actions_list = []
    for action in recent_actions:
        action_data = action.to_dict()
        action_data['id'] = action.id
        
        if 'timestamp' in action_data and action_data['timestamp']:
            action_data['timestamp'] = action_data['timestamp'].isoformat()
        
        # Get moderator info
        moderator_data = get_user_by_id(action_data['moderator_id'])
        if moderator_data:
            action_data['moderator_name'] = moderator_data.get('username', 'Unknown')
        
        actions_list.append(action_data)
    
    return jsonify({
        'report_stats': {
            'pending': reports_pending,
            'investigating': reports_investigating,
            'resolved': reports_resolved,
            'dismissed': reports_dismissed,
            'total': reports_pending + reports_investigating + reports_resolved + reports_dismissed
        },
        'recent_actions': actions_list
    }), 200
