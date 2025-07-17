"""
API Blueprint - General API endpoints for validation
GNU GPL v3 Licensed  
"""

from flask import Blueprint, request, jsonify
from app.utils.firebase_config import get_db
from app.utils.auth import validate_invite_code, use_invite_code
import datetime

api_bp = Blueprint('api', __name__)

@api_bp.route('/validate-invite', methods=['POST'])
def validate_invite():
    """Validate invite code without using it."""
    data = request.get_json()
    invite_code = data.get('invite_code')
    
    if not invite_code:
        return jsonify({'error': 'Invite code required'}), 400
    
    try:
        is_valid, message = validate_invite_code(invite_code)
        
        if is_valid:
            return jsonify({'valid': True, 'message': message}), 200
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/use-invite', methods=['POST']) 
def use_invite():
    """Mark invite code as used."""
    data = request.get_json()
    invite_code = data.get('invite_code')
    user_id = data.get('user_id')
    
    if not invite_code or not user_id:
        return jsonify({'error': 'Invite code and user ID required'}), 400
    
    try:
        success, message = use_invite_code(invite_code, user_id)
        
        if success:
            return jsonify({'success': True, 'message': message}), 200
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/create-test-invite', methods=['POST'])
def create_test_invite():
    """Create a test invite code (temporary for development)."""
    try:
        db = get_db()
        
        # Check if invite already exists
        existing = db.collection('invitations').where('code', '==', 'WELCOME2025').get()
        if existing:
            return jsonify({'message': 'Invite code already exists'}), 200
        
        invite_data = {
            'code': 'WELCOME2025',
            'is_active': True,
            'max_uses': 100,
            'current_uses': 0,
            'expires_at': datetime.datetime(2025, 12, 31, 23, 59, 59),
            'created_by': 'system',
            'created_at': datetime.datetime.utcnow(),
            'used': False
        }
        
        doc_ref = db.collection('invitations').add(invite_data)
        
        return jsonify({
            'success': True,
            'message': 'Test invite code created',
            'invite_id': doc_ref[1].id,
            'code': 'WELCOME2025'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user-profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get user profile data."""
    try:
        db = get_db()
        user_doc = db.collection('users').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        # Remove sensitive data
        user_data.pop('invite_code_used', None)
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/events', methods=['POST'])
def create_event():
    """Create a new event (requires organizer role or higher)."""
    from app.utils.auth import firebase_auth_required
    
    @firebase_auth_required
    def _create_event(current_user):
        try:
            db = get_db()
            
            # Check user role
            user_doc = db.collection('users').document(current_user['uid']).get()
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = user_doc.to_dict()
            allowed_roles = ['organizer', 'moderator', 'admin']
            
            if user_data.get('role') not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions. Organizer role required.'}), 403
            
            # Get event data from request
            event_data = request.get_json()
            
            # Validate required fields
            required_fields = ['title', 'description', 'genre', 'type', 'date', 'location', 'city']
            for field in required_fields:
                if not event_data.get(field):
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Add metadata
            event_data.update({
                'created_by': current_user['uid'],
                'created_by_name': user_data.get('display_name', current_user.get('email', 'Unknown')),
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow(),
                'status': event_data.get('status', 'published'),
                'views': 0,
                'interested_count': 0,
                'attending_count': 0
            })
            
            # Validate date format
            try:
                if event_data.get('start_datetime'):
                    datetime.datetime.fromisoformat(event_data['start_datetime'].replace('T', ' '))
                if event_data.get('end_datetime'):
                    datetime.datetime.fromisoformat(event_data['end_datetime'].replace('T', ' '))
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
            
            # Create the event document
            doc_ref = db.collection('events').add(event_data)
            event_id = doc_ref[1].id
            
            return jsonify({
                'success': True,
                'message': 'Event created successfully',
                'event_id': event_id
            }), 201
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return _create_event()
