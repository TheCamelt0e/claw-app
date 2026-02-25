@echo off
echo.
echo ==========================================
echo CLAW Mobile - Build APK for Distribution
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Checking Node.js... OK

REM Check if Expo CLI is installed
call expo --version >nul 2>&1
if errorlevel 1 (
    echo [2/5] Installing Expo CLI...
    npm install -g expo-cli eas-cli
    if errorlevel 1 (
        echo ERROR: Failed to install Expo CLI
        pause
        exit /b 1
    )
) else (
    echo [2/5] Expo CLI... OK
)

cd mobile

echo [3/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [4/5] Checking configuration...
echo.
echo Make sure you have:
echo - Updated API URL in src/api/client.ts
echo - Created assets (icon.png, splash.png)
echo - Logged in to Expo: expo login
echo.
set /p confirm="Ready to build? (y/n): "
if /i not "%confirm%"=="y" (
    echo Build cancelled.
    pause
    exit /b
)

echo.
echo [5/5] Building APK...
echo This will take 5-10 minutes...
echo.

call eas build --platform android --profile preview

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo.
    echo Common fixes:
    echo - Make sure you're logged in: expo login
    echo - Check app.json is valid
    echo - Ensure all assets exist
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo BUILD SUCCESSFUL!
echo ==========================================
echo.
echo Your APK is ready!
echo Download link provided above ^
echo.
echo Share the APK file with users!
echo.
pause
