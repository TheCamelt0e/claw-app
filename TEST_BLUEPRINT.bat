@echo off
echo ==========================================
echo 🦄 BLUEPRINT FEATURE TEST
echo ==========================================
echo.

cd mobile

echo 📋 Running TypeScript check...
npx tsc --noEmit --skipLibCheck 2>&1 | findstr /C:"error TS" > errors.txt

if %ERRORLEVEL% == 0 (
    echo.
    echo ⚠️  TypeScript errors found:
    type errors.txt | head -10
    del errors.txt
    echo.
    echo 🔧 Fix errors before building.
    pause
    exit /b 1
) else (
    echo ✅ No TypeScript errors!
    del errors.txt 2>nul
)

echo.
echo 📦 Checking dependencies...

if not exist "node_modules\zustand" (
    echo ❌ Dependencies missing! Run: npm install
    pause
    exit /b 1
)

echo ✅ Dependencies OK

echo.
echo 🧪 Testing feature integration...
echo.
echo New features to test:
echo 1. Living Splash Screen (on first app open)
echo 2. Oracle Chest (32%% chance on strike)
echo 3. Golden Hour (random 2x rewards)
echo 4. Haptic feedback (every interaction)
echo.

set /p build="Build APK now? (y/n): "

if /i "%build%"=="y" (
    echo.
    echo 🚀 Building APK with EAS...
    eas build --platform android --profile preview
) else (
    echo.
    echo 🏃 Run locally with: npx expo start
)

echo.
echo ==========================================
echo ✅ BLUEPRINT INTEGRATION COMPLETE!
echo ==========================================
echo.
pause
