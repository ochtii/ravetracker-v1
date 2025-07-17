"""
Test configuration for RaveTracker v1
GNU GPL v3 Licensed
"""

import pytest
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from config import TestingConfig


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app(TestingConfig)
    
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def auth_token(client):
    """Create authentication token for testing."""
    # Create test user and get auth token
    test_user_data = {
        'email': 'test@example.com',
        'username': 'testuser',
        'password': 'TestPass123!',
        'invite_code': 'TESTCODE'
    }
    
    # Note: In real tests, you would mock the Firebase operations
    # For now, we'll return a mock token
    return 'mock-jwt-token-for-testing'


@pytest.fixture
def auth_headers(auth_token):
    """Create authorization headers for testing."""
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
