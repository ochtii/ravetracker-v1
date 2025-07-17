"""
Events Blueprint - Event management and discovery
GNU GPL v3 Licensed
"""

from flask import Blueprint, request, jsonify, current_app
from app.utils.auth import login_required, role_required
from app.utils.firebase_config import get_db
import datetime
from datetime import datetime as dt

events_bp = Blueprint('events', __name__)


@events_bp.route('/', methods=['GET'])
def get_events():
    """Get all public events with filtering and pagination."""
    db = get_db()
    
    # Query parameters
    genre = request.args.get('genre')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    try:
        # Simple query to get all events first
        all_events = list(db.collection('events').stream())
        current_app.logger.info(f"Found {len(all_events)} total events")
        
        events_list = []
        for event in all_events:
            event_data = event.to_dict()
            event_data['id'] = event.id
            
            # Apply genre filter if specified
            if genre and event_data.get('genre') != genre:
                continue
                
            # Convert datetime objects to strings for JSON serialization
            if 'date_start' in event_data and hasattr(event_data['date_start'], 'timestamp'):
                event_data['date_start'] = event_data['date_start'].isoformat()
            if 'date_end' in event_data and hasattr(event_data['date_end'], 'timestamp'):
                event_data['date_end'] = event_data['date_end'].isoformat()
            if 'created_at' in event_data and hasattr(event_data['created_at'], 'timestamp'):
                event_data['created_at'] = event_data['created_at'].isoformat()
            if 'updated_at' in event_data and hasattr(event_data['updated_at'], 'timestamp'):
                event_data['updated_at'] = event_data['updated_at'].isoformat()
                
            events_list.append(event_data)
        
        # Sort by date_start
        events_list.sort(key=lambda x: x.get('date_start', ''), reverse=False)
        
        # Pagination
        total = len(events_list)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_events = events_list[start:end]
        
        return jsonify({
            'events': paginated_events,
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        current_app.logger.error(f"Events query error: {str(e)}")
        return jsonify({
            'error': f'Database query failed: {str(e)}',
            'events': [],
            'page': page,
            'per_page': per_page,
            'total': 0,
            'total_pages': 0
        }), 500
                date_from_dt = dt.fromisoformat(date_from)
                event_start = event_data.get('date_start')
                if event_start and event_start < date_from_dt:
                    continue
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_dt = dt.fromisoformat(date_to)
                event_start = event_data.get('date_start')
                if event_start and event_start > date_to_dt:
                    continue
            except ValueError:
                pass
        
        # Filter by search term if provided
        if search:
            search_lower = search.lower()
            if (search_lower not in event_data.get('title', '').lower() and 
                search_lower not in event_data.get('description', '').lower() and
                search_lower not in event_data.get('location', '').lower()):
                continue
        
        # Convert datetime objects to ISO format
        if 'date_start' in event_data and event_data['date_start']:
            if hasattr(event_data['date_start'], 'isoformat'):
                event_data['date_start'] = event_data['date_start'].isoformat()
        if 'date_end' in event_data and event_data['date_end']:
            if hasattr(event_data['date_end'], 'isoformat'):
                event_data['date_end'] = event_data['date_end'].isoformat()
        if 'created_at' in event_data and event_data['created_at']:
            if hasattr(event_data['created_at'], 'isoformat'):
                event_data['created_at'] = event_data['created_at'].isoformat()
        
        events_list.append(event_data)
    
    # Sort events by date
    events_list.sort(key=lambda x: x.get('date_start', ''))
    
    # Apply pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_events = events_list[start_idx:end_idx]
    
    return jsonify({
        'events': paginated_events,
        'page': page,
        'per_page': per_page,
        'total': len(events_list),
        'total_pages': (len(events_list) + per_page - 1) // per_page
    }), 200


@events_bp.route('/<event_id>', methods=['GET'])
def get_event(event_id):
    """Get specific event details."""
    db = get_db()
    
    event_doc = db.collection('events').document(event_id).get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    event_data = event_doc.to_dict()
    event_data['id'] = event_doc.id
    
    # Convert datetime objects to ISO format
    if 'date_start' in event_data and event_data['date_start']:
        event_data['date_start'] = event_data['date_start'].isoformat()
    if 'date_end' in event_data and event_data['date_end']:
        event_data['date_end'] = event_data['date_end'].isoformat()
    if 'created_at' in event_data and event_data['created_at']:
        event_data['created_at'] = event_data['created_at'].isoformat()
    
    return jsonify({'event': event_data}), 200


@events_bp.route('/', methods=['POST'])
@role_required('organizer', 'moderator', 'admin')
def create_event():
    """Create new event."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    required_fields = ['title', 'description', 'genre', 'date_start', 'location']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate genre
    if data['genre'] not in ['goa', 'psytrance', 'dnb', 'hardcore', 'techno', 'trance']:
        return jsonify({'error': 'Invalid genre'}), 400
    
    # Parse dates
    try:
        date_start = dt.fromisoformat(data['date_start'])
        date_end = dt.fromisoformat(data.get('date_end', data['date_start']))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
    
    # Check subscription limits
    from app.utils.auth import get_user_by_id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        return jsonify({'error': 'User not found'}), 404
    
    subscription_plan = user_data.get('subscription_plan', 'free')
    
    # Get user's event count
    db = get_db()
    user_events = db.collection('events').where('organizer_id', '==', user_id).stream()
    event_count = len(list(user_events))
    
    # Check limits based on subscription
    from flask import current_app
    plan_limits = current_app.config['SUBSCRIPTION_PLANS'][subscription_plan]
    events_limit = plan_limits['events_limit']
    
    if events_limit != -1 and event_count >= events_limit:
        return jsonify({
            'error': f'Event limit reached for {subscription_plan} plan. Upgrade to create more events.'
        }), 400
    
    # Create event
    event_data = {
        'title': data['title'],
        'description': data['description'],
        'genre': data['genre'],
        'organizer_id': user_id,
        'date_start': date_start,
        'date_end': date_end,
        'location': data['location'],
        'price': data.get('price', 0),
        'ticket_url': data.get('ticket_url', ''),
        'lineup': data.get('lineup', []),
        'is_public': data.get('is_public', True),
        'attendees': [],
        'interested': [],
        'comments': [],
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    # Add event to database
    event_ref = db.collection('events').add(event_data)
    event_id = event_ref[1].id
    
    return jsonify({
        'message': 'Event created successfully',
        'event_id': event_id
    }), 201


@events_bp.route('/<event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    """Update existing event."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    user_role = request.current_user['role']
    
    db = get_db()
    
    # Get event
    event_doc = db.collection('events').document(event_id).get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    event_data = event_doc.to_dict()
    
    # Check permissions
    if event_data['organizer_id'] != user_id and user_role not in ['moderator', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Update fields
    update_data = {'updated_at': datetime.datetime.utcnow()}
    
    allowed_fields = ['title', 'description', 'genre', 'date_start', 'date_end', 
                     'location', 'price', 'ticket_url', 'lineup', 'is_public']
    
    for field in allowed_fields:
        if field in data:
            if field in ['date_start', 'date_end']:
                try:
                    update_data[field] = dt.fromisoformat(data[field])
                except ValueError:
                    return jsonify({'error': f'Invalid date format for {field}'}), 400
            else:
                update_data[field] = data[field]
    
    # Update event
    db.collection('events').document(event_id).update(update_data)
    
    return jsonify({'message': 'Event updated successfully'}), 200


@events_bp.route('/<event_id>/interest', methods=['POST'])
@login_required
def toggle_interest(event_id):
    """Toggle user interest in event."""
    user_id = request.current_user['user_id']
    db = get_db()
    
    # Get event
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    event_data = event_doc.to_dict()
    interested = event_data.get('interested', [])
    
    # Toggle interest
    if user_id in interested:
        interested.remove(user_id)
        action = 'removed'
    else:
        interested.append(user_id)
        action = 'added'
    
    # Update event
    event_ref.update({'interested': interested})
    
    return jsonify({
        'message': f'Interest {action} successfully',
        'interested_count': len(interested)
    }), 200


@events_bp.route('/<event_id>/attend', methods=['POST'])
@login_required
def toggle_attendance(event_id):
    """Toggle user attendance for event."""
    user_id = request.current_user['user_id']
    db = get_db()
    
    # Get event
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    event_data = event_doc.to_dict()
    attendees = event_data.get('attendees', [])
    
    # Toggle attendance
    if user_id in attendees:
        attendees.remove(user_id)
        action = 'removed'
    else:
        attendees.append(user_id)
        action = 'added'
    
    # Update event
    event_ref.update({'attendees': attendees})
    
    return jsonify({
        'message': f'Attendance {action} successfully',
        'attendees_count': len(attendees)
    }), 200


@events_bp.route('/<event_id>/comments', methods=['POST'])
@login_required
def add_comment(event_id):
    """Add comment to event."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    if not data.get('comment'):
        return jsonify({'error': 'Comment text required'}), 400
    
    db = get_db()
    
    # Get event
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    # Get user info
    from app.utils.auth import get_user_by_id
    user_data = get_user_by_id(user_id)
    
    # Create comment
    comment_data = {
        'id': db.collection('comments').document().id,
        'user_id': user_id,
        'username': user_data.get('username', 'Unknown'),
        'comment': data['comment'],
        'created_at': datetime.datetime.utcnow(),
        'edited_at': None
    }
    
    # Add comment to event
    event_data = event_doc.to_dict()
    comments = event_data.get('comments', [])
    comments.append(comment_data)
    
    event_ref.update({'comments': comments})
    
    return jsonify({
        'message': 'Comment added successfully',
        'comment': comment_data
    }), 201


@events_bp.route('/<event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    """Delete event."""
    user_id = request.current_user['user_id']
    user_role = request.current_user['role']
    
    db = get_db()
    
    # Get event
    event_doc = db.collection('events').document(event_id).get()
    
    if not event_doc.exists:
        return jsonify({'error': 'Event not found'}), 404
    
    event_data = event_doc.to_dict()
    
    # Check permissions
    if event_data['organizer_id'] != user_id and user_role not in ['moderator', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Delete event
    db.collection('events').document(event_id).delete()
    
    return jsonify({'message': 'Event deleted successfully'}), 200
