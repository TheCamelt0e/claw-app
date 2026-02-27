@echo off
echo ==========================================
echo 📱 CLAW APK Builder - Expo.dev
echo ==========================================
echo.

cd mobile

REM Check if logged in
echo 🔑 Checking Expo login status...
npx eas whoami >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Not logged in to Expo!
    echo.
    echo Run: npx eas login
    echo Enter your Expo credentials:
    echo   - Username: camelt0e
    echo   - Password: [your password]
    echo.
    npx eas login
)

echo ✅ Logged in as:
npx eas whoami
echo.

REM Update API URL for production
echo 📋 Important: Update your API URL in src/api/client.ts
echo.
echo Current settings:
type src\api\client.ts | findstr /C:"API_BASE_URL"
echo.

REM Check EAS project
echo 🔍 Checking EAS project...
npx eas project:info 2>nul
if %ERRORLEVEL% neq 0 (
    echo ⚠️  EAS project not configured
    echo Running: npx eas init
    npx eas init
)

echo.
echo ==========================================
echo 🚀 Ready to Build!
echo ==========================================
echo.
echo Choose build type:
echo   [1] Preview APK (internal testing)
echo   [2] Production AAB (Play Store)
echo.

choice /c 12 /n /m "Select (1 or 2): "

if %ERRORLEVEL% == 1 (
    echo.
    echo 📦 Building Preview APK...
    echo This will create an APK for testing.
    echo.
    npx eas build --platform android --profile preview
) else (
    echo.
    echo 📦 Building Production AAB...
    echo This creates an Android App Bundle for Play Store.
    echo.
    npx eas build --platform android --profile production
)

echo.
echo ==========================================
echo ✅ Build Submitted!
echo ==========================================
echo.
echo Track your build at:
echo https://expo.dev/accounts/camelt0e/projects/claw-app/builds
echo.
pause
