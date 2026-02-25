@echo off
echo.
echo ==========================================
echo CLAW - Quick Test Build (Expo Go)
echo ==========================================
echo.
echo This is the FASTEST way to test:
echo - No APK build needed
echo - Instant testing on your phone
echo - Share via QR code
echo.

cd mobile

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Starting Expo...
echo.
echo ==========================================
echo INSTRUCTIONS:
echo ==========================================
echo.
echo 1. Install "Expo Go" app on your phone
echo    - Android: Play Store
echo    - iOS: App Store
echo.
echo 2. Scan the QR code that will appear
echo.
echo 3. The app will open instantly!
echo.
echo ==========================================
echo.

echo [3/3] Starting development server...
call expo start

pause
