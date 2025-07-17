"""
Subscriptions Blueprint - Subscription and billing management
GNU GPL v3 Licensed
"""

from flask import Blueprint, request, jsonify
from app.utils.auth import login_required, role_required, get_user_by_id
from app.utils.firebase_config import get_db
import datetime

subscriptions_bp = Blueprint('subscriptions', __name__)


@subscriptions_bp.route('/plans', methods=['GET'])
def get_plans():
    """Get all available subscription plans."""
    db = get_db()
    
    plans_ref = db.collection('plans').where('is_active', '==', True)
    plans = plans_ref.stream()
    
    plans_list = []
    for plan in plans:
        plan_data = plan.to_dict()
        plan_data['id'] = plan.id
        plans_list.append(plan_data)
    
    return jsonify({'plans': plans_list}), 200


@subscriptions_bp.route('/current', methods=['GET'])
@login_required
def get_current_subscription():
    """Get user's current subscription."""
    user_id = request.current_user['user_id']
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        return jsonify({'error': 'User not found'}), 404
    
    subscription_plan = user_data.get('subscription_plan', 'free')
    
    # Get plan details
    db = get_db()
    plan_doc = db.collection('plans').document(subscription_plan).get()
    
    if plan_doc.exists:
        plan_data = plan_doc.to_dict()
    else:
        # Fallback to free plan
        plan_data = {
            'name': 'Free',
            'price': 0,
            'events_limit': 2,
            'features': ['Basic event creation', 'Event discovery']
        }
    
    # Get usage statistics
    user_events = db.collection('events').where('organizer_id', '==', user_id).stream()
    events_used = len(list(user_events))
    
    return jsonify({
        'current_plan': subscription_plan,
        'plan_details': plan_data,
        'usage': {
            'events_used': events_used,
            'events_limit': plan_data.get('events_limit', 0)
        }
    }), 200


@subscriptions_bp.route('/upgrade', methods=['POST'])
@login_required
def upgrade_subscription():
    """Upgrade user subscription (simplified version)."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    if not data.get('plan_id'):
        return jsonify({'error': 'Plan ID required'}), 400
    
    plan_id = data['plan_id']
    
    # Validate plan exists
    db = get_db()
    plan_doc = db.collection('plans').document(plan_id).get()
    
    if not plan_doc.exists:
        return jsonify({'error': 'Plan not found'}), 404
    
    plan_data = plan_doc.to_dict()
    
    if not plan_data.get('is_active', False):
        return jsonify({'error': 'Plan is not available'}), 400
    
    # Update user subscription
    db.collection('users').document(user_id).update({
        'subscription_plan': plan_id,
        'subscription_updated_at': datetime.datetime.utcnow()
    })
    
    # Log subscription change
    subscription_log = {
        'user_id': user_id,
        'action': 'upgrade',
        'from_plan': request.current_user.get('subscription_plan', 'free'),
        'to_plan': plan_id,
        'timestamp': datetime.datetime.utcnow()
    }
    
    db.collection('subscription_logs').add(subscription_log)
    
    return jsonify({
        'message': f'Successfully upgraded to {plan_data["name"]} plan',
        'new_plan': plan_data
    }), 200


@subscriptions_bp.route('/coupons/validate', methods=['POST'])
@login_required
def validate_coupon():
    """Validate a coupon code."""
    data = request.get_json()
    
    if not data.get('coupon_code'):
        return jsonify({'error': 'Coupon code required'}), 400
    
    coupon_code = data['coupon_code'].upper()
    
    # Check coupon in database
    db = get_db()
    coupon_doc = db.collection('coupons').document(coupon_code).get()
    
    if not coupon_doc.exists:
        return jsonify({'error': 'Invalid coupon code'}), 400
    
    coupon_data = coupon_doc.to_dict()
    
    # Check if coupon is active
    if not coupon_data.get('is_active', False):
        return jsonify({'error': 'Coupon is no longer active'}), 400
    
    # Check expiry date
    if 'expires_at' in coupon_data and coupon_data['expires_at']:
        if coupon_data['expires_at'] < datetime.datetime.utcnow():
            return jsonify({'error': 'Coupon has expired'}), 400
    
    # Check usage limit
    if 'max_uses' in coupon_data and coupon_data['max_uses'] > 0:
        uses_count = len(coupon_data.get('used_by', []))
        if uses_count >= coupon_data['max_uses']:
            return jsonify({'error': 'Coupon usage limit reached'}), 400
    
    # Check if user already used this coupon
    user_id = request.current_user['user_id']
    if user_id in coupon_data.get('used_by', []):
        return jsonify({'error': 'Coupon already used by this user'}), 400
    
    return jsonify({
        'valid': True,
        'coupon': {
            'code': coupon_code,
            'discount_type': coupon_data.get('discount_type', 'percentage'),
            'discount_value': coupon_data.get('discount_value', 0),
            'description': coupon_data.get('description', '')
        }
    }), 200


@subscriptions_bp.route('/coupons/apply', methods=['POST'])
@login_required
def apply_coupon():
    """Apply a coupon to user account."""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    if not data.get('coupon_code'):
        return jsonify({'error': 'Coupon code required'}), 400
    
    coupon_code = data['coupon_code'].upper()
    
    # Validate coupon first
    db = get_db()
    coupon_doc = db.collection('coupons').document(coupon_code).get()
    
    if not coupon_doc.exists:
        return jsonify({'error': 'Invalid coupon code'}), 400
    
    coupon_data = coupon_doc.to_dict()
    
    # Apply coupon effects
    if coupon_data.get('coupon_type') == 'free_months':
        # Add free months to subscription
        months_to_add = coupon_data.get('months', 1)
        
        # For demo purposes, we'll just log this
        coupon_usage = {
            'user_id': user_id,
            'coupon_code': coupon_code,
            'applied_at': datetime.datetime.utcnow(),
            'benefit': f'{months_to_add} free months'
        }
        
        db.collection('coupon_usage').add(coupon_usage)
        
        # Mark coupon as used by this user
        used_by = coupon_data.get('used_by', [])
        used_by.append(user_id)
        
        db.collection('coupons').document(coupon_code).update({
            'used_by': used_by
        })
        
        return jsonify({
            'message': f'Coupon applied! You received {months_to_add} free months.',
            'benefit': f'{months_to_add} free months'
        }), 200
    
    elif coupon_data.get('coupon_type') == 'plan_upgrade':
        # Upgrade to specific plan
        target_plan = coupon_data.get('target_plan', 'premium')
        
        db.collection('users').document(user_id).update({
            'subscription_plan': target_plan,
            'subscription_updated_at': datetime.datetime.utcnow()
        })
        
        # Mark coupon as used
        used_by = coupon_data.get('used_by', [])
        used_by.append(user_id)
        
        db.collection('coupons').document(coupon_code).update({
            'used_by': used_by
        })
        
        return jsonify({
            'message': f'Coupon applied! Upgraded to {target_plan} plan.',
            'new_plan': target_plan
        }), 200
    
    return jsonify({'error': 'Unknown coupon type'}), 400


@subscriptions_bp.route('/admin/plans', methods=['POST'])
@role_required('admin')
def create_plan():
    """Create new subscription plan (Admin only)."""
    data = request.get_json()
    
    required_fields = ['id', 'name', 'price', 'events_limit', 'features']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    db = get_db()
    
    # Check if plan already exists
    plan_doc = db.collection('plans').document(data['id']).get()
    if plan_doc.exists:
        return jsonify({'error': 'Plan already exists'}), 400
    
    plan_data = {
        'id': data['id'],
        'name': data['name'],
        'price': data['price'],
        'events_limit': data['events_limit'],
        'features': data['features'],
        'is_active': data.get('is_active', True),
        'created_at': datetime.datetime.utcnow()
    }
    
    db.collection('plans').document(data['id']).set(plan_data)
    
    return jsonify({
        'message': 'Plan created successfully',
        'plan': plan_data
    }), 201


@subscriptions_bp.route('/admin/coupons', methods=['POST'])
@role_required('admin')
def create_coupon():
    """Create new coupon (Admin only)."""
    data = request.get_json()
    
    required_fields = ['code', 'coupon_type']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    db = get_db()
    
    coupon_code = data['code'].upper()
    
    # Check if coupon already exists
    coupon_doc = db.collection('coupons').document(coupon_code).get()
    if coupon_doc.exists:
        return jsonify({'error': 'Coupon already exists'}), 400
    
    coupon_data = {
        'code': coupon_code,
        'coupon_type': data['coupon_type'],
        'description': data.get('description', ''),
        'is_active': data.get('is_active', True),
        'max_uses': data.get('max_uses', 0),  # 0 = unlimited
        'used_by': [],
        'created_at': datetime.datetime.utcnow(),
        'created_by': request.current_user['user_id']
    }
    
    # Add type-specific fields
    if data['coupon_type'] == 'free_months':
        coupon_data['months'] = data.get('months', 1)
    elif data['coupon_type'] == 'plan_upgrade':
        coupon_data['target_plan'] = data.get('target_plan', 'premium')
    elif data['coupon_type'] == 'discount':
        coupon_data['discount_type'] = data.get('discount_type', 'percentage')
        coupon_data['discount_value'] = data.get('discount_value', 0)
    
    # Add expiry date if provided
    if data.get('expires_at'):
        try:
            coupon_data['expires_at'] = datetime.datetime.fromisoformat(data['expires_at'])
        except ValueError:
            return jsonify({'error': 'Invalid expiry date format'}), 400
    
    db.collection('coupons').document(coupon_code).set(coupon_data)
    
    return jsonify({
        'message': 'Coupon created successfully',
        'coupon': coupon_data
    }), 201
