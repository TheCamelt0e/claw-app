@echo off
echo ==========================================
echo 📥 CLAW APK Downloader
echo ==========================================
echo.

set APK_URL=https://expo.dev/artifacts/eas/b4XAHESGxh3Sau9mxb9AUZ.apk
set OUTPUT=%USERPROFILE%\Downloads\claw-v1.0.apk

echo Downloading CLAW v1.0 APK...
echo From: %APK_URL%
echo To: %OUTPUT%
echo.

powershell -Command "Invoke-WebRequest -Uri '%APK_URL%' -OutFile '%OUTPUT%' -UseBasicParsing"

if %ERRORLEVEL% == 0 (
    echo.
    echo ✅ Download complete!
    echo.
    echo 📱 Next steps:
    echo 1. Transfer %OUTPUT% to your Android phone
    echo 2. Enable "Install from Unknown Sources" in Settings
    echo 3. Install and test!
    echo.
    echo 🗺️  Run through GEOFENCE_TEST_PLAN.md
    start %USERPROFILE%\Downloads
) else (
    echo.
    echo ❌ Download failed. Try manual download:
    echo %APK_URL%
)

pause
