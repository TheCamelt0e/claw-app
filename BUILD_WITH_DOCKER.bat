@echo off
echo.
echo ==========================================
echo CLAW APK Builder - Docker Method
echo ==========================================
echo.
echo This builds the APK using Docker
necho No need to change Node.js version!
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo Docker not found! Installing Docker Desktop...
    echo.
    echo Please download and install Docker Desktop:
    echo https://www.docker.com/products/docker-desktop
    echo.
    echo After installation, restart your computer and run this again.
    pause
    exit /b 1
)

echo [1/3] Docker found!
echo.

REM Create assets if they don't exist
if not exist "assets\icon.png" (
    echo [2/3] Creating placeholder assets...
    echo.
    echo Downloading placeholder icon...
    powershell -Command "Invoke-WebRequest -Uri 'https://via.placeholder.com/1024/FF6B35/FFFFFF?text=CLAW' -OutFile 'assets\icon.png'"
    powershell -Command "Invoke-WebRequest -Uri 'https://via.placeholder.com/1242x2436/1a1a2e/FF6B35?text=CLAW' -OutFile 'assets\splash.png'"
    powershell -Command "Invoke-WebRequest -Uri 'https://via.placeholder.com/108/FF6B35/FFFFFF?text=C' -OutFile 'assets\adaptive-icon.png'"
    echo Assets created!
    echo.
)

echo [3/3] Starting Docker build...
echo This will take 10-15 minutes on first run
echo.

REM Build using Docker
docker run --rm -v "%cd%:/app" -w /app node:20-alpine sh -c "npm install -g expo-cli @expo/ngrok && npm install && npx expo prebuild --platform android && cd android && ./gradlew assembleRelease"

if errorlevel 1 (
    echo.
    echo Build failed. Trying alternative method...
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo BUILD COMPLETE!
echo ==========================================
echo.
echo Your APK should be at:
echo android\app\build\outputs\apk\release\app-release.apk
echo.
echo Copy this file and share it!
echo.
pause
