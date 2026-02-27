@echo off
echo ==========================================
echo 🦀 CLAW Backend Starter
echo ==========================================
echo.

cd backend

REM Check if .env exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Run: copy .env.example .env
    echo Then add your GEMINI_API_KEY
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Python not found! Install Python 3.10+
    pause
    exit /b 1
)

REM Create virtual environment if needed
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

echo 📦 Activating virtual environment...
call venv\Scripts\activate.bat

echo 📥 Installing dependencies...
pip install -q -r requirements-sqlite.txt

echo 🗄️  Running database migrations...
alembic upgrade head 2>nul

echo.
echo ==========================================
echo 🚀 Starting CLAW Backend!
echo ==========================================
echo.
echo 📍 Local URL: http://localhost:8000
echo 📚 API Docs:  http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
echo.

uvicorn app.main_production:app --host 0.0.0.0 --port 8000 --reload

pause
