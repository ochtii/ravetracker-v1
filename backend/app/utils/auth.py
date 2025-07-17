"""
Authentication utilities and decorators
GNU GPL v3 Licensed
"""

from functools import wraps
from flask import request, jsonify, session, current_app
from app.utils.firebase_config import get_db
import jwt
import datetime


def generate_jwt_token(user_id, role):
    """Generate JWT token for user authentication."""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    return token


def verify_jwt_token(token):
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login_required(f):
    """Decorator to require user authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request context
        request.current_user = {
            'user_id': payload['user_id'],
            'role': payload['role']
        }
        
        return f(*args, **kwargs)
    
    return decorated_function


def role_required(*allowed_roles):
    """Decorator to require specific user roles."""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user_role = request.current_user['role']
            
            if user_role not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def get_user_by_id(user_id):
    """Get user document from Firestore by ID."""
    db = get_db()
    user_doc = db.collection('users').document(user_id).get()
    
    if user_doc.exists:
        return user_doc.to_dict()
    return None


def create_user(user_data):
    """Create new user in Firestore."""
    db = get_db()
    
    # Check if user already exists
    existing_user = db.collection('users').where('email', '==', user_data['email']).get()
    if existing_user:
        return None, 'User already exists'
    
    # Add default values
    user_data.update({
        'role': current_app.config['DEFAULT_USER_ROLE'],
        'subscription_plan': 'free',
        'invite_codes_generated': [],
        'created_at': datetime.datetime.utcnow(),
        'last_login': datetime.datetime.utcnow()
    })
    
    # Create user document
    user_ref = db.collection('users').document()
    user_data['uid'] = user_ref.id
    user_ref.set(user_data)
    
    return user_data, None


def validate_invite_code(invite_code):
    """Validate invite code from invitations collection."""
    db = get_db()
    
    # Search for invitation by code
    invitations = db.collection('invitations').where('code', '==', invite_code).limit(1).stream()
    invitations_list = list(invitations)
    
    if not invitations_list:
        return False, 'Invalid invite code'
    
    invitation = invitations_list[0]
    invite_data = invitation.to_dict()
    
    # Check if invitation is still valid
    if invite_data.get('used', False):
        return False, 'Invite code already used'
    
    # Check expiration
    expires_at = invite_data.get('expires_at')
    if expires_at:
        # Convert to UTC timezone-aware datetime for comparison
        current_time = datetime.datetime.now(datetime.timezone.utc)
        if hasattr(expires_at, 'timestamp'):
            # Firestore timestamp
            expires_datetime = expires_at.replace(tzinfo=datetime.timezone.utc)
        else:
            # Already a datetime object
            expires_datetime = expires_at.replace(tzinfo=datetime.timezone.utc) if expires_at.tzinfo is None else expires_at
        
        if expires_datetime < current_time:
            return False, 'Invite code has expired'
    
    # Check usage limits
    max_uses = invite_data.get('max_uses', 1)
    current_uses = invite_data.get('current_uses', 0)
    if max_uses > 0 and current_uses >= max_uses:
        return False, 'Invite code usage limit reached'
    
    return True, 'Valid invite code'


def use_invite_code(invite_code, user_id):
    """Mark invite code as used by specific user."""
    try:
        db = get_db()
        
        # Find invitation by code
        invitations = db.collection('invitations').where('code', '==', invite_code).limit(1).stream()
        invitations_list = list(invitations)
        
        if not invitations_list:
            return False, 'Invite code not found'
        
        invitation_ref = invitations_list[0].reference
        invite_data = invitations_list[0].to_dict()
        
        # Update usage count or mark as used
        max_uses = invite_data.get('max_uses', 1)
        if max_uses == 1:
            # Single use invitation
            invitation_ref.update({
                'used': True,
                'used_by': user_id,
                'used_at': datetime.datetime.now()
            })
        else:
            # Multi-use invitation
            current_uses = invite_data.get('current_uses', 0)
            invitation_ref.update({
                'current_uses': current_uses + 1,
                'last_used_by': user_id,
                'last_used_at': datetime.datetime.now()
            })
        
        return True, 'Invite code marked as used'
        
    except Exception as e:
        return False, f'Error updating invite code: {str(e)}'


def firebase_auth_required(f):
    """Decorator to require Firebase authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        import firebase_admin.auth as admin_auth
        
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header missing or invalid'}), 401
        
        # Extract token
        id_token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        try:
            # Verify the token with Firebase Admin SDK
            decoded_token = admin_auth.verify_id_token(id_token)
            
            # Add user info to function arguments
            current_user = {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture')
            }
            
            return f(current_user, *args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
    
    return decorated_function
