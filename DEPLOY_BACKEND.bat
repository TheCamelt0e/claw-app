@echo off
echo.
echo ==========================================
echo CLAW Backend - Production Deployment
echo ==========================================
echo.
echo Choose your deployment platform:
echo.
echo [1] Render (Recommended - Free)
echo [2] Railway (Free)
echo [3] Fly.io (Free credits)
echo [4] Local/Private Server
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto render
if "%choice%"=="2" goto railway
if "%choice%"=="3" goto flyio
if "%choice%"=="4" goto local

echo Invalid choice
pause
exit /b

:render
echo.
echo Deploying to Render...
echo.
echo Instructions:
echo 1. Go to https://render.com and sign up
echo 2. Click "New +" -^> "Web Service"
echo 3. Upload the backend folder
echo 4. Settings:
echo    - Environment: Python 3
echo    - Build Command: pip install -r requirements-sqlite.txt
echo    - Start Command: uvicorn app.main_production:app --host 0.0.0.0 --port $PORT
echo 5. Click "Create Web Service"
echo.
echo Once deployed, copy the URL and update:
echo mobile/src/api/client.ts
echo.
pause
goto end

:railway
echo.
echo Deploying to Railway...
echo.
echo Instructions:
echo 1. Go to https://railway.app and sign up
echo 2. Click "New Project" -^> "Deploy from GitHub repo"
echo 3. Select your repository
echo 4. Railway will auto-detect the Dockerfile
echo 5. Click "Deploy"
echo.
echo Once deployed, copy the URL and update:
echo mobile/src/api/client.ts
echo.
pause
goto end

:flyio
echo.
echo Deploying to Fly.io...
echo.
echo Make sure you have flyctl installed:
echo https://fly.io/docs/hands-on/install-flyctl/
echo.
echo Running: fly deploy
cd backend
fly deploy
pause
goto end

:local
echo.
echo For local/private server deployment:
echo.
echo 1. Upload backend folder to your server
echo 2. Install Docker (or Python 3.11)
echo 3. Run: docker build -t claw-api .
echo 4. Run: docker run -p 8000:8000 claw-api
echo.
echo Or without Docker:
echo 1. pip install -r requirements-sqlite.txt
echo 2. uvicorn app.main_production:app --host 0.0.0.0 --port 8000
echo.
pause
goto end

:end
echo.
echo ==========================================
echo Remember to update your API URL in:
echo mobile/src/api/client.ts
echo ==========================================
echo.
