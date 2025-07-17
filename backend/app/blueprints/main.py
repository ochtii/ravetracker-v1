"""
Main routes and frontend rendering
GNU GPL v3 Licensed
"""

from flask import Blueprint, render_template, request, redirect, url_for, session
from app.utils.auth import login_required
import time

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Home page - redirects to dashboard if logged in, otherwise shows index."""
    # Check for Firebase auth token in cookies or headers
    auth_token = request.cookies.get('auth_token') or request.headers.get('Authorization')
    
    print(f"DEBUG: Checking auth - Cookie: {bool(auth_token)}, Length: {len(auth_token) if auth_token else 0}")
    
    if auth_token:
        try:
            # If token exists and is valid, redirect to dashboard
            if auth_token.startswith('Bearer '):
                auth_token = auth_token[7:]
            
            # For now, just check if token exists and is not empty
            if auth_token and len(auth_token) > 10:
                print(f"DEBUG: Redirecting to dashboard - token valid")
                return redirect(url_for('main.dashboard'))
        except Exception as e:
            print(f"DEBUG: Auth check failed: {e}")
            pass
    
    print(f"DEBUG: Showing index page")
    # Default to index page for non-authenticated users
    return render_template('index.html')


@main_bp.route('/events')
def events():
    """Events listing page."""
    return render_template('events/list.html')


@main_bp.route('/events/<event_id>')
def event_detail(event_id):
    """Event detail page."""
    return render_template('events/detail.html', event_id=event_id)


@main_bp.route('/debug-auth')
def debug_auth():
    """Debug authentication status."""
    auth_token = request.cookies.get('auth_token')
    headers_auth = request.headers.get('Authorization')
    
    debug_info = {
        'cookie_token': auth_token,
        'header_auth': headers_auth,
        'has_cookie': bool(auth_token),
        'cookie_length': len(auth_token) if auth_token else 0,
        'all_cookies': dict(request.cookies)
    }
    
    return f"<pre>{debug_info}</pre>"


@main_bp.route('/dashboard')
def dashboard():
    """User dashboard."""
    return render_template('dashboard.html', timestamp=int(time.time()))


@main_bp.route('/my-events')
def my_events():
    """My Events page showing user's created, attending, and interested events"""
    return render_template('my-events.html')

@main_bp.route('/create-event')
def create_event():
    """Event creation page."""
    return render_template('create-event.html')


@main_bp.route('/organizer')
@login_required
def organizer_panel():
    """Organizer panel."""
    return render_template('dashboard/organizer.html')


@main_bp.route('/moderator')
@login_required
def moderator_panel():
    """Moderator panel."""
    return render_template('dashboard/moderator.html')


@main_bp.route('/admin')
@login_required
def admin_panel():
    """Admin panel."""
    return render_template('dashboard/admin.html')


@main_bp.route('/login')
def login():
    """Login page."""
    return render_template('auth/login.html')


@main_bp.route('/register')
def register():
    """Registration page."""
    return render_template('auth/register.html')


@main_bp.route('/support')
def support():
    """Support page."""
    return render_template('support/tickets.html')
