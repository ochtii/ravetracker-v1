@echo off
echo 🎵 RaveTracker v1 - Development Server
echo =====================================
echo.
echo Starting development server with auto-reload...
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"
python dev-server.py

pause
