#!/usr/bin/env python3
"""
Development server with auto-reload using watchdog
GNU GPL v3 Licensed
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class FlaskReloadHandler(FileSystemEventHandler):
    """Handler for file system events that triggers Flask restart."""
    
    def __init__(self, app_process=None):
        self.app_process = app_process
        self.restart_needed = False
        self.last_restart = 0
        super().__init__()
    
    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return
            
        # Only restart for Python files and templates
        file_path = Path(event.src_path)
        if file_path.suffix in ['.py', '.html', '.css', '.js']:
            # Debounce: only restart if 2 seconds have passed since last restart
            current_time = time.time()
            if current_time - self.last_restart > 2:
                print(f"\n🔄 File changed: {file_path.name}")
                self.restart_flask_app()
                self.last_restart = current_time
    
    def restart_flask_app(self):
        """Restart the Flask application."""
        try:
            if self.app_process and self.app_process.poll() is None:
                print("🛑 Stopping Flask server...")
                self.app_process.terminate()
                self.app_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("⚠️  Force killing Flask server...")
            self.app_process.kill()
        except Exception as e:
            print(f"⚠️  Error stopping server: {e}")
        
        print("🚀 Starting Flask server...")
        self.start_flask_app()
    
    def start_flask_app(self):
        """Start the Flask application."""
        try:
            # Get the project root directory
            project_root = Path(__file__).parent
            backend_dir = project_root / "backend"
            
            # Start Flask app
            self.app_process = subprocess.Popen([
                sys.executable, "run.py"
            ], cwd=backend_dir)
            
            print("✅ Flask server started successfully!")
            
        except Exception as e:
            print(f"❌ Error starting Flask server: {e}")
            self.app_process = None

def main():
    """Main development server with auto-reload."""
    print("🎵 RaveTracker v1 - Development Server with Auto-Reload")
    print("=" * 60)
    
    # Get project paths
    project_root = Path(__file__).parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "frontend"
    
    # Create handler and start Flask app
    handler = FlaskReloadHandler()
    handler.start_flask_app()
    
    # Set up file system observer
    observer = Observer()
    
    # Watch backend Python files
    if backend_dir.exists():
        observer.schedule(handler, str(backend_dir), recursive=True)
        print(f"👀 Watching backend: {backend_dir}")
    
    # Watch frontend templates, CSS, JS
    if frontend_dir.exists():
        observer.schedule(handler, str(frontend_dir), recursive=True)
        print(f"👀 Watching frontend: {frontend_dir}")
    
    # Start observer
    observer.start()
    print("🔍 File watcher started!")
    print("📝 Watching for changes in .py, .html, .css, .js files")
    print("🔥 Server will auto-restart on file changes")
    print("⚡ Press Ctrl+C to stop\n")
    
    try:
        while True:
            time.sleep(1)
            
            # Check if Flask process is still running
            if handler.app_process and handler.app_process.poll() is not None:
                print("⚠️  Flask process died, restarting...")
                handler.start_flask_app()
                
    except KeyboardInterrupt:
        print("\n🛑 Shutting down development server...")
        observer.stop()
        
        if handler.app_process and handler.app_process.poll() is None:
            print("🛑 Stopping Flask server...")
            handler.app_process.terminate()
            try:
                handler.app_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("⚠️  Force killing Flask server...")
                handler.app_process.kill()
        
        print("👋 Development server stopped!")
    
    observer.join()

if __name__ == "__main__":
    main()
