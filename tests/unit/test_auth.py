"""
Unit tests for authentication functionality
GNU GPL v3 Licensed
"""

import json
from unittest.mock import patch, MagicMock


class TestAuthBlueprint:
    """Test authentication routes."""

    def test_register_success(self, client):
        """Test successful user registration."""
        with patch('app.blueprints.auth.validate_invite_code') as mock_validate:
            mock_validate.return_value = (True, 'Valid invite code')
            
            with patch('app.blueprints.auth.create_user') as mock_create:
                mock_user = {
                    'uid': 'test-uid',
                    'email': 'test@example.com',
                    'username': 'testuser',
                    'role': 'user'
                }
                mock_create.return_value = (mock_user, None)
                
                with patch('app.blueprints.auth.use_invite_code'):
                    with patch('app.blueprints.auth.generate_jwt_token') as mock_token:
                        mock_token.return_value = 'mock-token'
                        
                        response = client.post('/auth/register', 
                            data=json.dumps({
                                'email': 'test@example.com',
                                'username': 'testuser',
                                'password': 'TestPass123!',
                                'invite_code': 'VALIDCODE'
                            }),
                            content_type='application/json'
                        )
                        
                        assert response.status_code == 201
                        data = json.loads(response.data)
                        assert data['message'] == 'User registered successfully'
                        assert 'token' in data

    def test_register_invalid_invite_code(self, client):
        """Test registration with invalid invite code."""
        with patch('app.blueprints.auth.validate_invite_code') as mock_validate:
            mock_validate.return_value = (False, 'Invalid invite code')
            
            response = client.post('/auth/register', 
                data=json.dumps({
                    'email': 'test@example.com',
                    'username': 'testuser',
                    'password': 'TestPass123!',
                    'invite_code': 'INVALID'
                }),
                content_type='application/json'
            )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error'] == 'Invalid invite code'

    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        response = client.post('/auth/register', 
            data=json.dumps({
                'email': 'test@example.com'
                # Missing username, password, invite_code
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Missing required fields'

    def test_login_success(self, client):
        """Test successful login."""
        with patch('app.utils.firebase_config.get_db') as mock_db:
            # Mock Firestore query
            mock_user_doc = MagicMock()
            mock_user_doc.to_dict.return_value = {
                'uid': 'test-uid',
                'email': 'test@example.com',
                'username': 'testuser',
                'password_hash': 'hashed-password',
                'role': 'user',
                'subscription_plan': 'free'
            }
            
            mock_collection = MagicMock()
            mock_collection.where.return_value.get.return_value = [mock_user_doc]
            mock_db.return_value.collection.return_value = mock_collection
            
            with patch('werkzeug.security.check_password_hash') as mock_check:
                mock_check.return_value = True
                
                with patch('app.blueprints.auth.generate_jwt_token') as mock_token:
                    mock_token.return_value = 'mock-token'
                    
                    response = client.post('/auth/login', 
                        data=json.dumps({
                            'email': 'test@example.com',
                            'password': 'TestPass123!'
                        }),
                        content_type='application/json'
                    )
                    
                    assert response.status_code == 200
                    data = json.loads(response.data)
                    assert data['message'] == 'Login successful'
                    assert 'token' in data

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        with patch('app.utils.firebase_config.get_db') as mock_db:
            mock_collection = MagicMock()
            mock_collection.where.return_value.get.return_value = []  # No user found
            mock_db.return_value.collection.return_value = mock_collection
            
            response = client.post('/auth/login', 
                data=json.dumps({
                    'email': 'nonexistent@example.com',
                    'password': 'wrongpassword'
                }),
                content_type='application/json'
            )
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert data['error'] == 'Invalid credentials'

    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post('/auth/login', 
            data=json.dumps({
                'email': 'test@example.com'
                # Missing password
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Email and password required'
