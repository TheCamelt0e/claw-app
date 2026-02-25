@echo off
echo CLAW API - Starting SQLite Backend
echo =========================================
echo.

REM Check if dependencies are installed
py -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    py -m pip install -r requirements-sqlite.txt
)

echo Starting server...
echo API will be at: http://localhost:8000
echo Docs will be at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
echo =========================================

py run_sqlite.py
