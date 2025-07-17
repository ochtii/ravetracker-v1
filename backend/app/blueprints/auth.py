"""
Authentication Blueprint
GNU GPL v3 Licensed
"""

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.auth import (
    create_user, get_user_by_id, validate_invite_code, 
    use_invite_code, generate_jwt_token
)
from app.utils.firebase_config import get_db
import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user with invite code."""
    data = request.get_json()
    
    required_fields = ['email', 'username', 'password', 'invite_code']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate invite code
    is_valid, message = validate_invite_code(data['invite_code'])
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Create user
    user_data = {
        'email': data['email'],
        'username': data['username'],
        'password_hash': generate_password_hash(data['password'])
    }
    
    user, error = create_user(user_data)
    if error:
        return jsonify({'error': error}), 400
    
    # Mark invite code as used
    use_invite_code(data['invite_code'], user['uid'])
    
    # Generate JWT token
    token = generate_jwt_token(user['uid'], user['role'])
    
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': {
            'uid': user['uid'],
            'email': user['email'],
            'username': user['username'],
            'role': user['role']
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login."""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    # Find user by email
    db = get_db()
    users = db.collection('users').where('email', '==', data['email']).get()
    
    if not users:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    user_doc = users[0]
    user_data = user_doc.to_dict()
    
    # Check password
    if not check_password_hash(user_data['password_hash'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Update last login
    db.collection('users').document(user_data['uid']).update({
        'last_login': datetime.datetime.utcnow()
    })
    
    # Generate JWT token
    token = generate_jwt_token(user_data['uid'], user_data['role'])
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'uid': user_data['uid'],
            'email': user_data['email'],
            'username': user_data['username'],
            'role': user_data['role'],
            'subscription_plan': user_data.get('subscription_plan', 'free')
        }
    }), 200


@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    """Get user profile."""
    from app.utils.auth import login_required
    
    @login_required
    def inner():
        user_id = request.current_user['user_id']
        user_data = get_user_by_id(user_id)
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove sensitive data
        user_data.pop('password_hash', None)
        
        return jsonify({'user': user_data}), 200
    
    return inner()


@auth_bp.route('/request-organizer', methods=['POST'])
def request_organizer_role():
    """Request organizer role upgrade."""
    from app.utils.auth import login_required
    
    @login_required
    def inner():
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        required_fields = ['company_name', 'description', 'experience']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create organizer request
        db = get_db()
        request_data = {
            'user_id': user_id,
            'company_name': data['company_name'],
            'description': data['description'],
            'experience': data['experience'],
            'status': 'pending',
            'created_at': datetime.datetime.utcnow()
        }
        
        db.collection('organizer_requests').add(request_data)
        
        return jsonify({'message': 'Organizer request submitted successfully'}), 200
    
    return inner()


@auth_bp.route('/generate-invite', methods=['POST'])
def generate_invite_code():
    """Generate new invite code for user."""
    from app.utils.auth import login_required
    
    @login_required
    def inner():
        user_id = request.current_user['user_id']
        
        # Check user's current invite code count
        user_data = get_user_by_id(user_id)
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        current_codes = len(user_data.get('invite_codes_generated', []))
        max_codes = 5  # From config
        
        if current_codes >= max_codes:
            return jsonify({'error': f'Maximum {max_codes} invite codes allowed'}), 400
        
        # Generate new invite code
        import secrets
        import string
        
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Save invite code
        db = get_db()
        invite_data = {
            'code': code,
            'is_used': False,
            'used_by': None,
            'created_at': datetime.datetime.utcnow(),
            'created_by': user_id
        }
        
        db.collection('invite_codes').document(code).set(invite_data)
        
        # Update user's generated codes list
        updated_codes = user_data.get('invite_codes_generated', [])
        updated_codes.append(code)
        
        db.collection('users').document(user_id).update({
            'invite_codes_generated': updated_codes
        })
        
        return jsonify({
            'message': 'Invite code generated successfully',
            'invite_code': code
        }), 200
    
    return inner()
