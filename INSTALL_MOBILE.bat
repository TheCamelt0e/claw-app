@echo off
echo.
echo ==========================================
echo CLAW Mobile App - Development Setup
echo ==========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install from https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Node.js found
echo.

REM Install Expo CLI
echo [2/5] Installing Expo CLI...
npm install -g expo-cli eas-cli
if errorlevel 1 (
    echo ERROR: Failed to install Expo CLI
    pause
    exit /b 1
)

REM Navigate to mobile folder
cd /d "%~dp0\mobile"
if errorlevel 1 (
    echo ERROR: Cannot find mobile folder
    pause
    exit /b 1
)

echo [3/5] Installing dependencies...
npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo [4/5] Setup complete!
echo.
echo [5/5] Starting development server...
echo.
echo ==========================================
echo Your app will start shortly...
echo.
echo To test on phone:
echo 1. Install "Expo Go" app from app store
echo 2. Scan the QR code that appears
echo ==========================================
echo.

expo start

pause
