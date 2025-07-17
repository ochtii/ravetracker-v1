"""
RaveTracker v1 Backend
GNU GPL v3 Licensed
"""

from flask import Flask
from flask_cors import CORS
from config import Config
import os


def create_app(config_class=Config):
    """Application factory pattern for Flask app creation."""
    # Get absolute paths for templates and static folders
    base_dir = os.path.abspath(os.path.dirname(__file__))
    template_dir = os.path.join(base_dir, '..', '..', 'frontend', 'templates')
    static_dir = os.path.join(base_dir, '..', '..', 'frontend', 'static')
    
    app = Flask(__name__, 
                template_folder=template_dir,
                static_folder=static_dir)
    
    app.config.from_object(config_class)
    
    # Enable CORS for frontend
    CORS(app)
    
    # Register blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.events import events_bp
    from app.blueprints.subscriptions import subscriptions_bp
    from app.blueprints.reports import reports_bp
    from app.blueprints.support import support_bp
    from app.blueprints.main import main_bp
    from app.blueprints.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(support_bp, url_prefix='/api/support')
    
    # Initialize Firebase
    from app.utils.firebase_config import init_firebase
    init_firebase()
    
    return app
