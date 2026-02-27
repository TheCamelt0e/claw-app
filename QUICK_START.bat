@echo off
echo ==========================================
echo 🦀 CLAW - Quick Start
echo ==========================================
echo.

echo [1/3] 🔍 Checking Expo login...
cd mobile
npx eas whoami >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo    ❌ Not logged in. Running: npx eas login
    npx eas login
) else (
    echo    ✅ Logged in
    npx eas whoami
)

echo.
echo [2/3] 📦 Building Preview APK...
echo    This will submit build to expo.dev
echo    You'll get a download link when complete.
echo.

npx eas build --platform android --profile preview --non-interactive

echo.
echo ==========================================
echo ✅ Build Submitted!
echo ==========================================
echo.
echo Track build: https://expo.dev/accounts/camelt0e/projects/claw-app/builds
echo.
echo Download APK when complete, install on Android phone:
echo   1. Enable Settings -^> Security -^> Unknown Sources
echo   2. Open APK file on phone
echo   3. Install and enjoy!
echo.
pause
