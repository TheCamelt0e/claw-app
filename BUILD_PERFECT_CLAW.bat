@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo 🎯 PERFECT CLAW - Build Script
echo ==========================================
echo.

:: Check if we're in the right directory
if not exist "mobile\package.json" (
    echo ❌ Error: Must run from project root directory
    exit /b 1
)

echo 📋 Build Steps:
echo 1. Verify backend changes
echo 2. Build mobile APK
echo 3. Deploy to Render (backend)
echo.

set /p choice="Start build? (y/n): "
if /i not "%choice%"=="y" exit /b 0

echo.
echo ==========================================
echo 🔧 Step 1: Backend Verification
echo ==========================================
echo.

:: Check if backend has notifications router
if exist "backend\app\api\v1\endpoints\notifications.py" (
    echo ✅ Backend notifications endpoint exists
) else (
    echo ❌ Backend notifications endpoint missing!
    exit /b 1
)

if exist "backend\app\models\push_token_sqlite.py" (
    echo ✅ Push token model exists
) else (
    echo ❌ Push token model missing!
    exit /b 1
)

echo.
echo ==========================================
echo 📱 Step 2: Mobile Build
echo ==========================================
echo.

cd mobile

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting EAS Build...
echo.

eas build --platform android --non-interactive

if %ERRORLEVEL% neq 0 (
    echo ❌ Mobile build failed!
    cd ..
    exit /b 1
)

cd ..

echo.
echo ==========================================
echo 🚀 Step 3: Deploy Backend
echo ==========================================
echo.

echo Checking Git status...
cd backend

git status --short

echo.
set /p deploy="Deploy backend to Render? (y/n): "
if /i "%deploy%"=="y" (
    git add .
    git commit -m "Add Perfect CLAW features: notifications, geofencing, alarms, calendar integration, smart suggestions"
    git push origin main
    echo.
    echo ✅ Backend deployed! Render will auto-deploy.
) else (
    echo Skipping backend deployment.
)

cd ..

echo.
echo ==========================================
echo ✅ PERFECT CLAW Build Complete!
echo ==========================================
echo.
echo 📱 Mobile: Check EAS dashboard for APK
echo 🌐 Backend: https://claw-api-b5ts.onrender.com
echo.
echo 🎉 New Features:
echo   • Background location alerts (Bónus/Krónan)
echo   • Smart AI suggestions (time/location based)
echo   • Calendar integration
echo   • Alarms and reminders
echo   • Push notifications
echo.
pause
