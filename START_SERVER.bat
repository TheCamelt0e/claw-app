@echo off
echo.
echo ==========================================
echo CLAW API Server Starter
echo ==========================================
echo.
echo This will start the CLAW backend server
echo.
echo Once started, open:
echo   http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

cd /d "%~dp0\backend"

echo Checking dependencies...
py -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing dependencies (first time only)...
    py -m pip install fastapi uvicorn sqlalchemy pydantic-settings python-multipart
    echo Done!
    echo.
)

echo.
echo Starting server...
echo.

py run_sqlite.py

echo.
echo Server stopped.
pause
