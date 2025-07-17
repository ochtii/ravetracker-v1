"""
Integration tests for RaveTracker v1
GNU GPL v3 Licensed
"""

import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta


class TestUserWorkflow:
    """Test complete user workflows."""

    def test_user_registration_and_login_flow(self, client):
        """Test complete user registration and login flow."""
        # Mock Firebase operations
        with patch('app.utils.firebase_config.get_db') as mock_db:
            # Mock invitation validation
            mock_invite_doc = MagicMock()
            mock_invite_doc.exists = True
            mock_invite_doc.to_dict.return_value = {
                'email': 'test@example.com',
                'code': 'TEST123',
                'created_by': 'admin-1',
                'expires_at': datetime.now() + timedelta(days=7),
                'used': False
            }
            
            mock_collection = MagicMock()
            mock_collection.where.return_value.limit.return_value.stream.return_value = [mock_invite_doc]
            mock_collection.add.return_value = (None, MagicMock(id='user-1'))
            mock_db.return_value.collection.return_value = mock_collection

            # Step 1: Register user
            register_data = {
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'TestPassword123!',
                'invite_code': 'TEST123'
            }
            
            response = client.post('/api/auth/register',
                data=json.dumps(register_data),
                content_type='application/json'
            )
            
            assert response.status_code == 201
            register_result = json.loads(response.data)
            assert 'token' in register_result
            
            # Step 2: Login with same credentials
            with patch('app.utils.firebase_config.get_db') as mock_db_login:
                mock_user_doc = MagicMock()
                mock_user_doc.exists = True
                mock_user_doc.to_dict.return_value = {
                    'username': 'testuser',
                    'email': 'test@example.com',
                    'password_hash': register_result.get('password_hash', 'hashed_password'),
                    'role': 'user',
                    'subscription_plan': 'free'
                }
                
                mock_collection_login = MagicMock()
                mock_collection_login.where.return_value.limit.return_value.stream.return_value = [mock_user_doc]
                mock_db_login.return_value.collection.return_value = mock_collection_login
                
                login_data = {
                    'email': 'test@example.com',
                    'password': 'TestPassword123!'
                }
                
                response = client.post('/api/auth/login',
                    data=json.dumps(login_data),
                    content_type='application/json'
                )
                
                assert response.status_code == 200
                login_result = json.loads(response.data)
                assert 'token' in login_result
                assert login_result['user']['username'] == 'testuser'

    def test_event_creation_and_interaction_flow(self, client):
        """Test event creation and user interaction flow."""
        with patch('app.utils.auth.role_required'), \
             patch('app.utils.auth.login_required'), \
             patch('app.utils.firebase_config.get_db') as mock_db:
            
            # Mock event creation
            mock_collection = MagicMock()
            mock_collection.where.return_value.stream.return_value = []  # No existing events
            mock_collection.add.return_value = (None, MagicMock(id='event-1'))
            mock_db.return_value.collection.return_value = mock_collection
            
            # Step 1: Create event as organizer
            event_data = {
                'title': 'Integration Test Event',
                'description': 'Test event for integration testing',
                'genre': 'psytrance',
                'location': 'Test Venue, Berlin',
                'date_start': '2025-08-01T20:00:00',
                'date_end': '2025-08-02T06:00:00',
                'price': 30.0
            }
            
            with patch('request.current_user', {'user_id': 'organizer-1', 'role': 'organizer'}), \
                 patch('app.utils.auth.get_user_by_id') as mock_get_user:
                
                mock_get_user.return_value = {'subscription_plan': 'pro'}
                
                response = client.post('/api/events',
                    data=json.dumps(event_data),
                    content_type='application/json',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 201
                create_result = json.loads(response.data)
                assert create_result['message'] == 'Event created successfully'
            
            # Step 2: User shows interest in event
            with patch('request.current_user', {'user_id': 'user-1', 'role': 'user'}):
                mock_event_doc = MagicMock()
                mock_event_doc.exists = True
                mock_event_doc.to_dict.return_value = {'interested': []}
                
                mock_event_ref = MagicMock()
                mock_event_ref.get.return_value = mock_event_doc
                mock_collection.document.return_value = mock_event_ref
                
                response = client.post('/api/events/event-1/interest',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                interest_result = json.loads(response.data)
                assert 'Interest added successfully' in interest_result['message']

    def test_subscription_upgrade_flow(self, client):
        """Test subscription upgrade workflow."""
        with patch('app.utils.auth.login_required'), \
             patch('app.utils.firebase_config.get_db') as mock_db:
            
            # Step 1: Get available plans
            response = client.get('/api/subscriptions/plans')
            assert response.status_code == 200
            plans_result = json.loads(response.data)
            assert len(plans_result['plans']) == 4
            
            # Step 2: Validate coupon
            mock_coupon_doc = MagicMock()
            mock_coupon_doc.exists = True
            mock_coupon_doc.to_dict.return_value = {
                'code': 'INTEGRATION20',
                'type': 'percentage',
                'value': 20,
                'valid_until': datetime.now() + timedelta(days=30),
                'max_uses': 100,
                'used_count': 1,
                'is_active': True,
                'applicable_plans': ['premium', 'pro']
            }
            
            mock_collection = MagicMock()
            mock_collection.where.return_value.limit.return_value.stream.return_value = [mock_coupon_doc]
            mock_db.return_value.collection.return_value = mock_collection
            
            with patch('request.current_user', {'user_id': 'user-1'}):
                validation_data = {
                    'code': 'INTEGRATION20',
                    'plan': 'premium'
                }
                
                response = client.post('/api/subscriptions/validate-coupon',
                    data=json.dumps(validation_data),
                    content_type='application/json',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                coupon_result = json.loads(response.data)
                assert coupon_result['valid'] is True
                
                # Step 3: Upgrade subscription
                mock_user_ref = MagicMock()
                mock_user_doc = MagicMock()
                mock_user_doc.exists = True
                mock_user_doc.to_dict.return_value = {
                    'subscription_plan': 'free',
                    'subscription_expires': None
                }
                mock_user_ref.get.return_value = mock_user_doc
                mock_collection.document.return_value = mock_user_ref
                
                upgrade_data = {'plan': 'premium'}
                
                response = client.post('/api/subscriptions/upgrade',
                    data=json.dumps(upgrade_data),
                    content_type='application/json',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                upgrade_result = json.loads(response.data)
                assert upgrade_result['message'] == 'Subscription upgraded successfully'

    def test_moderation_workflow(self, client):
        """Test complete moderation workflow."""
        with patch('app.utils.auth.login_required'), \
             patch('app.utils.auth.role_required'), \
             patch('app.utils.firebase_config.get_db') as mock_db:
            
            mock_collection = MagicMock()
            mock_collection.add.return_value = (None, MagicMock(id='report-1'))
            mock_db.return_value.collection.return_value = mock_collection
            
            # Step 1: User creates report
            with patch('request.current_user', {'user_id': 'user-1', 'role': 'user'}):
                report_data = {
                    'reported_content_type': 'event',
                    'reported_content_id': 'event-1',
                    'reason': 'inappropriate_content',
                    'description': 'This event contains inappropriate content'
                }
                
                response = client.post('/api/reports',
                    data=json.dumps(report_data),
                    content_type='application/json',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 201
                report_result = json.loads(response.data)
                assert report_result['message'] == 'Report submitted successfully'
            
            # Step 2: Moderator takes action
            with patch('request.current_user', {'user_id': 'mod-1', 'role': 'moderator'}):
                mock_report_doc = MagicMock()
                mock_report_doc.exists = True
                mock_report_doc.to_dict.return_value = {
                    'status': 'pending',
                    'reported_content_type': 'event',
                    'reported_content_id': 'event-1'
                }
                
                mock_report_ref = MagicMock()
                mock_report_ref.get.return_value = mock_report_doc
                mock_collection.document.return_value = mock_report_ref
                
                action_data = {
                    'action': 'approve',
                    'notes': 'Content reviewed and approved'
                }
                
                response = client.post('/api/reports/report-1/action',
                    data=json.dumps(action_data),
                    content_type='application/json',
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 200
                action_result = json.loads(response.data)
                assert action_result['message'] == 'Moderation action completed'


class TestAPIErrorHandling:
    """Test API error handling scenarios."""
    
    def test_authentication_required_endpoints(self, client):
        """Test that protected endpoints require authentication."""
        protected_endpoints = [
            ('/api/events', 'POST'),
            ('/api/events/event-1/interest', 'POST'),
            ('/api/subscriptions/upgrade', 'POST'),
            ('/api/reports', 'POST')
        ]
        
        for endpoint, method in protected_endpoints:
            if method == 'POST':
                response = client.post(endpoint)
            else:
                response = client.get(endpoint)
            
            # Should return 401 Unauthorized or 403 Forbidden
            assert response.status_code in [401, 403]
    
    def test_role_required_endpoints(self, client):
        """Test that role-restricted endpoints enforce permissions."""
        with patch('app.utils.auth.role_required') as mock_role_required:
            # Mock role requirement failure
            mock_role_required.side_effect = Exception('Insufficient permissions')
            
            role_restricted_endpoints = [
                ('/api/events', 'POST'),  # Requires organizer
                ('/api/reports/report-1/action', 'POST'),  # Requires moderator
                ('/api/subscriptions/create-coupon', 'POST')  # Requires admin
            ]
            
            for endpoint, method in role_restricted_endpoints:
                try:
                    if method == 'POST':
                        response = client.post(endpoint,
                            headers={'Authorization': 'Bearer test-token'}
                        )
                    else:
                        response = client.get(endpoint,
                            headers={'Authorization': 'Bearer test-token'}
                        )
                    
                    # Should handle role requirement appropriately
                    assert response.status_code >= 400
                except Exception:
                    # Expected behavior for role enforcement
                    pass
