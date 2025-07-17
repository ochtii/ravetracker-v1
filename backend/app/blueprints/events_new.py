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


@events_bp.route('/<event_id>', methods=['GET'])
def get_event(event_id):
    """Get a single event by ID."""
    db = get_db()
    
    try:
        event_doc = db.collection('events').document(event_id).get()
        
        if not event_doc.exists:
            return jsonify({'error': 'Event not found'}), 404
        
        event_data = event_doc.to_dict()
        event_data['id'] = event_doc.id
        
        # Convert datetime objects
        if 'date_start' in event_data and hasattr(event_data['date_start'], 'timestamp'):
            event_data['date_start'] = event_data['date_start'].isoformat()
        if 'date_end' in event_data and hasattr(event_data['date_end'], 'timestamp'):
            event_data['date_end'] = event_data['date_end'].isoformat()
        if 'created_at' in event_data and hasattr(event_data['created_at'], 'timestamp'):
            event_data['created_at'] = event_data['created_at'].isoformat()
        if 'updated_at' in event_data and hasattr(event_data['updated_at'], 'timestamp'):
            event_data['updated_at'] = event_data['updated_at'].isoformat()
        
        return jsonify({'event': event_data})
        
    except Exception as e:
        current_app.logger.error(f"Error fetching event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch event'}), 500


@events_bp.route('/', methods=['POST'])
@login_required
def create_event():
    """Create a new event."""
    db = get_db()
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'description', 'genre', 'date_start', 'location']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Parse dates
        date_start = dt.fromisoformat(data['date_start'])
        date_end = dt.fromisoformat(data.get('date_end', data['date_start']))
        
        # Create event document
        event_data = {
            'title': data['title'],
            'description': data['description'],
            'genre': data['genre'],
            'date_start': date_start,
            'date_end': date_end,
            'location': data['location'],
            'price': data.get('price', 0),
            'price_currency': data.get('price_currency', 'EUR'),
            'max_attendees': data.get('max_attendees', 100),
            'current_attendees': 0,
            'organizer_id': request.user_id,
            'status': 'pending',
            'is_featured': False,
            'tags': data.get('tags', []),
            'age_restriction': data.get('age_restriction', 18),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Add to database
        doc_ref = db.collection('events').add(event_data)
        
        return jsonify({
            'message': 'Event created successfully',
            'event_id': doc_ref[1].id
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating event: {str(e)}")
        return jsonify({'error': 'Failed to create event'}), 500


@events_bp.route('/<event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    """Update an existing event."""
    db = get_db()
    data = request.get_json()
    
    try:
        event_ref = db.collection('events').document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({'error': 'Event not found'}), 404
        
        event_data = event_doc.to_dict()
        
        # Check if user owns the event or is admin
        if event_data.get('organizer_id') != request.user_id and request.user_role != 'admin':
            return jsonify({'error': 'Permission denied'}), 403
        
        # Update fields
        update_data = {
            'updated_at': datetime.datetime.utcnow()
        }
        
        allowed_fields = ['title', 'description', 'genre', 'location', 'price', 
                         'price_currency', 'max_attendees', 'tags', 'age_restriction']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Parse date fields if provided
        if 'date_start' in data:
            update_data['date_start'] = dt.fromisoformat(data['date_start'])
        if 'date_end' in data:
            update_data['date_end'] = dt.fromisoformat(data['date_end'])
        
        event_ref.update(update_data)
        
        return jsonify({'message': 'Event updated successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error updating event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to update event'}), 500


@events_bp.route('/<event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    """Delete an event."""
    db = get_db()
    
    try:
        event_ref = db.collection('events').document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({'error': 'Event not found'}), 404
        
        event_data = event_doc.to_dict()
        
        # Check permissions
        if event_data.get('organizer_id') != request.user_id and request.user_role != 'admin':
            return jsonify({'error': 'Permission denied'}), 403
        
        event_ref.delete()
        
        return jsonify({'message': 'Event deleted successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error deleting event {event_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete event'}), 500
