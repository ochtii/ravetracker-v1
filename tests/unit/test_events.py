"""
Unit tests for events functionality
GNU GPL v3 Licensed
"""

import json
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestEventsBlueprint:
    """Test events routes."""

    def test_get_events_success(self, client):
        """Test successful retrieval of events."""
        with patch('app.utils.firebase_config.get_db') as mock_db:
            # Mock event data
            mock_event_doc = MagicMock()
            mock_event_doc.id = 'event-1'
            mock_event_doc.to_dict.return_value = {
                'title': 'Test Event',
                'description': 'Test Description',
                'genre': 'psytrance',
                'location': 'Test Location',
                'date_start': datetime(2025, 8, 1, 20, 0),
                'date_end': datetime(2025, 8, 2, 6, 0),
                'is_public': True,
                'organizer_id': 'organizer-1',
                'attendees': [],
                'interested': [],
                'created_at': datetime.now()
            }
            
            mock_collection = MagicMock()
            mock_collection.where.return_value.order_by.return_value.limit.return_value.offset.return_value.stream.return_value = [mock_event_doc]
            mock_db.return_value.collection.return_value = mock_collection
            
            response = client.get('/api/events')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'events' in data
            assert len(data['events']) == 1
            assert data['events'][0]['title'] == 'Test Event'

    def test_get_events_with_filters(self, client):
        """Test events retrieval with filters."""
        response = client.get('/api/events?genre=psytrance&location=Berlin')
        assert response.status_code == 200

    def test_get_event_by_id_success(self, client):
        """Test successful retrieval of single event."""
        with patch('app.utils.firebase_config.get_db') as mock_db:
            mock_event_doc = MagicMock()
            mock_event_doc.exists = True
            mock_event_doc.id = 'event-1'
            mock_event_doc.to_dict.return_value = {
                'title': 'Test Event',
                'description': 'Test Description',
                'genre': 'psytrance',
                'location': 'Test Location',
                'date_start': datetime(2025, 8, 1, 20, 0),
                'is_public': True
            }
            
            mock_collection = MagicMock()
            mock_collection.document.return_value.get.return_value = mock_event_doc
            mock_db.return_value.collection.return_value = mock_collection
            
            response = client.get('/api/events/event-1')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['event']['title'] == 'Test Event'

    def test_get_event_not_found(self, client):
        """Test retrieval of non-existent event."""
        with patch('app.utils.firebase_config.get_db') as mock_db:
            mock_event_doc = MagicMock()
            mock_event_doc.exists = False
            
            mock_collection = MagicMock()
            mock_collection.document.return_value.get.return_value = mock_event_doc
            mock_db.return_value.collection.return_value = mock_collection
            
            response = client.get('/api/events/nonexistent')
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert data['error'] == 'Event not found'

    def test_create_event_success(self, client, auth_headers):
        """Test successful event creation."""
        with patch('app.utils.auth.role_required'):
            with patch('app.utils.auth.get_user_by_id') as mock_get_user:
                mock_get_user.return_value = {
                    'subscription_plan': 'premium'
                }
                
                with patch('app.utils.firebase_config.get_db') as mock_db:
                    # Mock event count check
                    mock_collection = MagicMock()
                    mock_collection.where.return_value.stream.return_value = []  # No existing events
                    mock_collection.add.return_value = (None, MagicMock(id='new-event-id'))
                    mock_db.return_value.collection.return_value = mock_collection
                    
                    event_data = {
                        'title': 'New Test Event',
                        'description': 'Test event description',
                        'genre': 'psytrance',
                        'location': 'Test Venue',
                        'date_start': '2025-08-01T20:00:00',
                        'date_end': '2025-08-02T06:00:00',
                        'price': 25.0
                    }
                    
                    with patch('request.current_user', {'user_id': 'user-1', 'role': 'organizer'}):
                        response = client.post('/api/events',
                            data=json.dumps(event_data),
                            headers=auth_headers
                        )
                    
                    assert response.status_code == 201
                    data = json.loads(response.data)
                    assert data['message'] == 'Event created successfully'

    def test_create_event_missing_fields(self, client, auth_headers):
        """Test event creation with missing required fields."""
        with patch('app.utils.auth.role_required'):
            event_data = {
                'title': 'Incomplete Event'
                # Missing required fields
            }
            
            with patch('request.current_user', {'user_id': 'user-1', 'role': 'organizer'}):
                response = client.post('/api/events',
                    data=json.dumps(event_data),
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error'] == 'Missing required fields'

    def test_create_event_invalid_genre(self, client, auth_headers):
        """Test event creation with invalid genre."""
        with patch('app.utils.auth.role_required'):
            event_data = {
                'title': 'Test Event',
                'description': 'Test Description',
                'genre': 'invalid_genre',
                'location': 'Test Venue',
                'date_start': '2025-08-01T20:00:00'
            }
            
            with patch('request.current_user', {'user_id': 'user-1', 'role': 'organizer'}):
                response = client.post('/api/events',
                    data=json.dumps(event_data),
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error'] == 'Invalid genre'

    def test_toggle_interest_success(self, client, auth_headers):
        """Test successful interest toggle."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_event_doc = MagicMock()
                mock_event_doc.exists = True
                mock_event_doc.to_dict.return_value = {
                    'interested': []
                }
                
                mock_event_ref = MagicMock()
                mock_event_ref.get.return_value = mock_event_doc
                
                mock_collection = MagicMock()
                mock_collection.document.return_value = mock_event_ref
                mock_db.return_value.collection.return_value = mock_collection
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.post('/api/events/event-1/interest',
                        headers=auth_headers
                    )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert 'Interest added successfully' in data['message']
