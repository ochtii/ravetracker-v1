"""
Unit tests for subscriptions functionality
GNU GPL v3 Licensed
"""

import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta


class TestSubscriptionsBlueprint:
    """Test subscription routes."""

    def test_get_subscription_plans(self, client):
        """Test retrieval of subscription plans."""
        response = client.get('/api/subscriptions/plans')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'plans' in data
        assert len(data['plans']) == 4  # free, premium, pro, unlimited
        
        # Check that all expected plans are present
        plan_names = [plan['name'] for plan in data['plans']]
        assert 'free' in plan_names
        assert 'premium' in plan_names
        assert 'pro' in plan_names
        assert 'unlimited' in plan_names

    def test_upgrade_subscription_success(self, client, auth_headers):
        """Test successful subscription upgrade."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                # Mock user document
                mock_user_ref = MagicMock()
                mock_user_doc = MagicMock()
                mock_user_doc.exists = True
                mock_user_doc.to_dict.return_value = {
                    'subscription_plan': 'free',
                    'subscription_expires': None
                }
                mock_user_ref.get.return_value = mock_user_doc
                
                mock_collection = MagicMock()
                mock_collection.document.return_value = mock_user_ref
                mock_db.return_value.collection.return_value = mock_collection
                
                upgrade_data = {
                    'plan': 'premium'
                }
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.post('/api/subscriptions/upgrade',
                        data=json.dumps(upgrade_data),
                        headers=auth_headers
                    )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['message'] == 'Subscription upgraded successfully'

    def test_upgrade_subscription_invalid_plan(self, client, auth_headers):
        """Test subscription upgrade with invalid plan."""
        with patch('app.utils.auth.login_required'):
            upgrade_data = {
                'plan': 'invalid_plan'
            }
            
            with patch('request.current_user', {'user_id': 'user-1'}):
                response = client.post('/api/subscriptions/upgrade',
                    data=json.dumps(upgrade_data),
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error'] == 'Invalid subscription plan'

    def test_get_user_subscription(self, client, auth_headers):
        """Test retrieval of user subscription."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_user_doc = MagicMock()
                mock_user_doc.exists = True
                mock_user_doc.to_dict.return_value = {
                    'subscription_plan': 'premium',
                    'subscription_expires': datetime.now() + timedelta(days=30)
                }
                
                mock_collection = MagicMock()
                mock_collection.document.return_value.get.return_value = mock_user_doc
                mock_db.return_value.collection.return_value = mock_collection
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.get('/api/subscriptions/subscription',
                        headers=auth_headers
                    )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['subscription']['plan'] == 'premium'

    def test_validate_coupon_success(self, client, auth_headers):
        """Test successful coupon validation."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_coupon_doc = MagicMock()
                mock_coupon_doc.exists = True
                mock_coupon_doc.id = 'SAVE20'
                mock_coupon_doc.to_dict.return_value = {
                    'code': 'SAVE20',
                    'type': 'percentage',
                    'value': 20,
                    'valid_until': datetime.now() + timedelta(days=30),
                    'max_uses': 100,
                    'used_count': 5,
                    'is_active': True,
                    'applicable_plans': ['premium', 'pro']
                }
                
                mock_collection = MagicMock()
                mock_collection.where.return_value.limit.return_value.stream.return_value = [mock_coupon_doc]
                mock_db.return_value.collection.return_value = mock_collection
                
                validation_data = {
                    'code': 'SAVE20',
                    'plan': 'premium'
                }
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.post('/api/subscriptions/validate-coupon',
                        data=json.dumps(validation_data),
                        headers=auth_headers
                    )
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['valid'] is True
                assert data['coupon']['code'] == 'SAVE20'

    def test_validate_coupon_expired(self, client, auth_headers):
        """Test validation of expired coupon."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_coupon_doc = MagicMock()
                mock_coupon_doc.exists = True
                mock_coupon_doc.to_dict.return_value = {
                    'code': 'EXPIRED20',
                    'type': 'percentage',
                    'value': 20,
                    'valid_until': datetime.now() - timedelta(days=1),  # Expired
                    'max_uses': 100,
                    'used_count': 5,
                    'is_active': True,
                    'applicable_plans': ['premium']
                }
                
                mock_collection = MagicMock()
                mock_collection.where.return_value.limit.return_value.stream.return_value = [mock_coupon_doc]
                mock_db.return_value.collection.return_value = mock_collection
                
                validation_data = {
                    'code': 'EXPIRED20',
                    'plan': 'premium'
                }
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.post('/api/subscriptions/validate-coupon',
                        data=json.dumps(validation_data),
                        headers=auth_headers
                    )
                
                assert response.status_code == 400
                data = json.loads(response.data)
                assert data['error'] == 'Coupon has expired'

    def test_validate_coupon_not_found(self, client, auth_headers):
        """Test validation of non-existent coupon."""
        with patch('app.utils.auth.login_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_collection = MagicMock()
                mock_collection.where.return_value.limit.return_value.stream.return_value = []
                mock_db.return_value.collection.return_value = mock_collection
                
                validation_data = {
                    'code': 'NOTFOUND',
                    'plan': 'premium'
                }
                
                with patch('request.current_user', {'user_id': 'user-1'}):
                    response = client.post('/api/subscriptions/validate-coupon',
                        data=json.dumps(validation_data),
                        headers=auth_headers
                    )
                
                assert response.status_code == 404
                data = json.loads(response.data)
                assert data['error'] == 'Coupon not found'

    def test_create_coupon_success(self, client, auth_headers):
        """Test successful coupon creation by admin."""
        with patch('app.utils.auth.role_required'):
            with patch('app.utils.firebase_config.get_db') as mock_db:
                mock_collection = MagicMock()
                mock_collection.add.return_value = (None, MagicMock(id='coupon-1'))
                mock_db.return_value.collection.return_value = mock_collection
                
                coupon_data = {
                    'code': 'NEWCOUPON',
                    'type': 'percentage',
                    'value': 25,
                    'valid_until': (datetime.now() + timedelta(days=30)).isoformat(),
                    'max_uses': 50,
                    'applicable_plans': ['premium', 'pro']
                }
                
                with patch('request.current_user', {'user_id': 'admin-1', 'role': 'admin'}):
                    response = client.post('/api/subscriptions/create-coupon',
                        data=json.dumps(coupon_data),
                        headers=auth_headers
                    )
                
                assert response.status_code == 201
                data = json.loads(response.data)
                assert data['message'] == 'Coupon created successfully'

    def test_create_coupon_missing_fields(self, client, auth_headers):
        """Test coupon creation with missing fields."""
        with patch('app.utils.auth.role_required'):
            coupon_data = {
                'code': 'INCOMPLETE'
                # Missing required fields
            }
            
            with patch('request.current_user', {'user_id': 'admin-1', 'role': 'admin'}):
                response = client.post('/api/subscriptions/create-coupon',
                    data=json.dumps(coupon_data),
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['error'] == 'Missing required fields'
