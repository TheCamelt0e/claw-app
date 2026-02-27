@echo off
echo ==========================================
echo 📱 CLAW Quick Build
echo ==========================================
echo.

cd mobile

echo 🔍 Verifying setup...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Check TypeScript
echo 📝 Checking TypeScript...
npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo ❌ TypeScript errors found! Fix before building.
    pause
    exit /b 1
)

echo ✅ TypeScript check passed
echo.

REM Check login
echo 🔑 Checking Expo login...
npx eas whoami >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Please login first: npx eas login
    pause
    exit /b 1
)

echo ✅ Logged in as:
npx eas whoami
echo.

REM Start build
echo 🚀 Starting build...
echo.
echo Build type:
echo   [1] Preview APK (testing)
echo   [2] Production AAB (Play Store)
echo.

choice /c 12 /n /m "Select: "

if %ERRORLEVEL% == 1 (
    echo 📦 Building Preview APK...
    npx eas build --platform android --profile preview --non-interactive
) else (
    echo 📦 Building Production AAB...
    npx eas build --platform android --profile production --non-interactive
)

echo.
echo ==========================================
echo ✅ Build Started!
echo ==========================================
echo.
echo Monitor at: https://expo.dev/accounts/camelt0e/projects/claw-app/builds
echo.
pause
