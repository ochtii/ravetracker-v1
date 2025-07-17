#!/usr/bin/env python3
"""
RaveTracker v1 Application Entry Point
GNU GPL v3 Licensed
"""

from app import create_app
from config import Config
import os

# Create Flask application
app = create_app(Config)

if __name__ == '__main__':
    # Check if running in development mode
    is_dev = os.environ.get('FLASK_ENV') == 'development' or app.config.get('DEBUG', False)
    
    # Initialize Firebase within app context
    with app.app_context():
        from app.utils.firebase_config import init_firebase
        try:
            init_firebase()
            print("✅ Firebase initialized successfully")
        except Exception as e:
            print(f"⚠️ Firebase initialization warning: {e}")
    
    if is_dev:
        print("🔥 Running in DEVELOPMENT mode")
        print("🔄 Auto-reload enabled")
        print("🐛 Debug mode enabled")
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=is_dev,
        use_reloader=is_dev
    )
