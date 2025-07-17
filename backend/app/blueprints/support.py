"""
Support Blueprint - Support ticket system
GNU GPL v3 Licensed
"""

from flask import Blueprint, request, jsonify
from app.utils.auth import login_required, role_required, get_user_by_id
from app.utils.firebase_config import get_db
import datetime

support_bp = Blueprint('support', __name__)


@support_bp.route('/tickets', methods=['POST'])
@login_required
def create_ticket():
    """Create new support ticket."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    required_fields = ['subject', 'message', 'category']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate category
    valid_categories = [
        'account',
        'events',
        'subscriptions',
        'technical',
        'billing',
        'feature_request',
        'bug_report',
        'other'
    ]
    
    if data['category'] not in valid_categories:
        return jsonify({'error': 'Invalid category'}), 400
    
    db = get_db()
    
    # Create ticket
    ticket_data = {
        'user_id': user_id,
        'subject': data['subject'],
        'message': data['message'],
        'category': data['category'],
        'priority': data.get('priority', 'normal'),
        'status': 'open',
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow(),
        'assigned_to': None,
        'responses': []
    }
    
    # Add priority validation
    valid_priorities = ['low', 'normal', 'high', 'urgent']
    if ticket_data['priority'] not in valid_priorities:
        ticket_data['priority'] = 'normal'
    
    # Add user info for context
    user_data = get_user_by_id(user_id)
    if user_data:
        ticket_data['user_info'] = {
            'username': user_data.get('username', ''),
            'email': user_data.get('email', ''),
            'subscription_plan': user_data.get('subscription_plan', 'free')
        }
    
    # Save ticket
    ticket_ref = db.collection('support_tickets').add(ticket_data)
    ticket_id = ticket_ref[1].id
    
    return jsonify({
        'message': 'Support ticket created successfully',
        'ticket_id': ticket_id,
        'ticket_number': f'ST-{ticket_id[:8].upper()}'
    }), 201


@support_bp.route('/tickets', methods=['GET'])
@login_required
def get_user_tickets():
    """Get user's support tickets."""
    user_id = request.current_user['user_id']
    user_role = request.current_user['role']
    
    db = get_db()
    
    # Query parameters
    status = request.args.get('status')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    # Base query - users see only their tickets, moderators/admins see all
    if user_role in ['moderator', 'admin']:
        query = db.collection('support_tickets')
    else:
        query = db.collection('support_tickets').where('user_id', '==', user_id)
    
    if status:
        query = query.where('status', '==', status)
    
    # Execute query
    tickets = query.order_by('created_at', direction='DESCENDING').limit(per_page).offset((page - 1) * per_page).stream()
    
    tickets_list = []
    for ticket in tickets:
        ticket_data = ticket.to_dict()
        ticket_data['id'] = ticket.id
        ticket_data['ticket_number'] = f'ST-{ticket.id[:8].upper()}'
        
        # Convert datetime objects to ISO format
        if 'created_at' in ticket_data and ticket_data['created_at']:
            ticket_data['created_at'] = ticket_data['created_at'].isoformat()
        if 'updated_at' in ticket_data and ticket_data['updated_at']:
            ticket_data['updated_at'] = ticket_data['updated_at'].isoformat()
        
        # Convert response timestamps
        if 'responses' in ticket_data:
            for response in ticket_data['responses']:
                if 'created_at' in response and response['created_at']:
                    response['created_at'] = response['created_at'].isoformat()
        
        tickets_list.append(ticket_data)
    
    return jsonify({
        'tickets': tickets_list,
        'page': page,
        'per_page': per_page
    }), 200


@support_bp.route('/tickets/<ticket_id>', methods=['GET'])
@login_required
def get_ticket(ticket_id):
    """Get specific ticket details."""
    user_id = request.current_user['user_id']
    user_role = request.current_user['role']
    
    db = get_db()
    
    ticket_doc = db.collection('support_tickets').document(ticket_id).get()
    
    if not ticket_doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404
    
    ticket_data = ticket_doc.to_dict()
    
    # Check permissions - users can only see their own tickets
    if user_role not in ['moderator', 'admin'] and ticket_data['user_id'] != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    ticket_data['id'] = ticket_doc.id
    ticket_data['ticket_number'] = f'ST-{ticket_doc.id[:8].upper()}'
    
    # Convert datetime objects to ISO format
    if 'created_at' in ticket_data and ticket_data['created_at']:
        ticket_data['created_at'] = ticket_data['created_at'].isoformat()
    if 'updated_at' in ticket_data and ticket_data['updated_at']:
        ticket_data['updated_at'] = ticket_data['updated_at'].isoformat()
    
    # Convert response timestamps
    if 'responses' in ticket_data:
        for response in ticket_data['responses']:
            if 'created_at' in response and response['created_at']:
                response['created_at'] = response['created_at'].isoformat()
    
    return jsonify({'ticket': ticket_data}), 200


@support_bp.route('/tickets/<ticket_id>/responses', methods=['POST'])
@login_required
def add_ticket_response():
    """Add response to support ticket."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    user_role = request.current_user['role']
    ticket_id = request.view_args['ticket_id']
    
    if not data.get('message'):
        return jsonify({'error': 'Message is required'}), 400
    
    db = get_db()
    
    # Get ticket
    ticket_doc = db.collection('support_tickets').document(ticket_id).get()
    
    if not ticket_doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404
    
    ticket_data = ticket_doc.to_dict()
    
    # Check permissions
    if user_role not in ['moderator', 'admin'] and ticket_data['user_id'] != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Get user info
    user_data = get_user_by_id(user_id)
    
    # Create response
    response_data = {
        'user_id': user_id,
        'username': user_data.get('username', 'Unknown') if user_data else 'Unknown',
        'role': user_role,
        'message': data['message'],
        'is_staff_response': user_role in ['moderator', 'admin'],
        'created_at': datetime.datetime.utcnow()
    }
    
    # Add response to ticket
    responses = ticket_data.get('responses', [])
    responses.append(response_data)
    
    # Update ticket
    update_data = {
        'responses': responses,
        'updated_at': datetime.datetime.utcnow()
    }
    
    # If staff response, mark as answered
    if user_role in ['moderator', 'admin']:
        update_data['status'] = 'answered'
        update_data['assigned_to'] = user_id
    
    db.collection('support_tickets').document(ticket_id).update(update_data)
    
    return jsonify({
        'message': 'Response added successfully',
        'response': response_data
    }), 201


@support_bp.route('/tickets/<ticket_id>/status', methods=['PUT'])
@role_required('moderator', 'admin')
def update_ticket_status(ticket_id):
    """Update ticket status (Moderators and Admins only)."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    if not data.get('status'):
        return jsonify({'error': 'Status is required'}), 400
    
    valid_statuses = ['open', 'answered', 'waiting', 'resolved', 'closed']
    if data['status'] not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400
    
    db = get_db()
    
    # Get ticket
    ticket_doc = db.collection('support_tickets').document(ticket_id).get()
    
    if not ticket_doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404
    
    # Update ticket
    update_data = {
        'status': data['status'],
        'updated_at': datetime.datetime.utcnow()
    }
    
    if data['status'] in ['resolved', 'closed']:
        update_data['resolved_at'] = datetime.datetime.utcnow()
        update_data['resolved_by'] = user_id
    
    if data.get('internal_notes'):
        update_data['internal_notes'] = data['internal_notes']
    
    db.collection('support_tickets').document(ticket_id).update(update_data)
    
    return jsonify({'message': 'Ticket status updated successfully'}), 200


@support_bp.route('/tickets/<ticket_id>/assign', methods=['PUT'])
@role_required('moderator', 'admin')
def assign_ticket(ticket_id):
    """Assign ticket to staff member."""
    data = request.get_json()
    
    if not data.get('assigned_to'):
        return jsonify({'error': 'assigned_to is required'}), 400
    
    assigned_to = data['assigned_to']
    
    # Validate assigned user exists and has appropriate role
    assigned_user = get_user_by_id(assigned_to)
    if not assigned_user or assigned_user.get('role') not in ['moderator', 'admin']:
        return jsonify({'error': 'Invalid assignment target'}), 400
    
    db = get_db()
    
    # Get ticket
    ticket_doc = db.collection('support_tickets').document(ticket_id).get()
    
    if not ticket_doc.exists:
        return jsonify({'error': 'Ticket not found'}), 404
    
    # Update assignment
    db.collection('support_tickets').document(ticket_id).update({
        'assigned_to': assigned_to,
        'assigned_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    })
    
    return jsonify({
        'message': f'Ticket assigned to {assigned_user["username"]} successfully'
    }), 200


@support_bp.route('/stats', methods=['GET'])
@role_required('moderator', 'admin')
def get_support_stats():
    """Get support statistics (Moderators and Admins only)."""
    db = get_db()
    
    # Get ticket counts by status
    open_tickets = len(list(db.collection('support_tickets').where('status', '==', 'open').stream()))
    answered_tickets = len(list(db.collection('support_tickets').where('status', '==', 'answered').stream()))
    waiting_tickets = len(list(db.collection('support_tickets').where('status', '==', 'waiting').stream()))
    resolved_tickets = len(list(db.collection('support_tickets').where('status', '==', 'resolved').stream()))
    closed_tickets = len(list(db.collection('support_tickets').where('status', '==', 'closed').stream()))
    
    # Get ticket counts by category
    categories = {}
    all_tickets = db.collection('support_tickets').stream()
    
    for ticket in all_tickets:
        ticket_data = ticket.to_dict()
        category = ticket_data.get('category', 'other')
        categories[category] = categories.get(category, 0) + 1
    
    # Get recent tickets
    recent_tickets = db.collection('support_tickets').order_by('created_at', direction='DESCENDING').limit(5).stream()
    
    recent_list = []
    for ticket in recent_tickets:
        ticket_data = ticket.to_dict()
        ticket_data['id'] = ticket.id
        ticket_data['ticket_number'] = f'ST-{ticket.id[:8].upper()}'
        
        if 'created_at' in ticket_data and ticket_data['created_at']:
            ticket_data['created_at'] = ticket_data['created_at'].isoformat()
        
        recent_list.append({
            'id': ticket_data['id'],
            'ticket_number': ticket_data['ticket_number'],
            'subject': ticket_data.get('subject', ''),
            'status': ticket_data.get('status', ''),
            'category': ticket_data.get('category', ''),
            'created_at': ticket_data.get('created_at', '')
        })
    
    return jsonify({
        'status_stats': {
            'open': open_tickets,
            'answered': answered_tickets,
            'waiting': waiting_tickets,
            'resolved': resolved_tickets,
            'closed': closed_tickets,
            'total': open_tickets + answered_tickets + waiting_tickets + resolved_tickets + closed_tickets
        },
        'category_stats': categories,
        'recent_tickets': recent_list
    }), 200


@support_bp.route('/categories', methods=['GET'])
def get_support_categories():
    """Get available support categories."""
    categories = [
        {'id': 'account', 'name': 'Account & Profile'},
        {'id': 'events', 'name': 'Events & Calendar'},
        {'id': 'subscriptions', 'name': 'Subscriptions & Plans'},
        {'id': 'technical', 'name': 'Technical Issues'},
        {'id': 'billing', 'name': 'Billing & Payments'},
        {'id': 'feature_request', 'name': 'Feature Request'},
        {'id': 'bug_report', 'name': 'Bug Report'},
        {'id': 'other', 'name': 'Other'}
    ]
    
    return jsonify({'categories': categories}), 200
