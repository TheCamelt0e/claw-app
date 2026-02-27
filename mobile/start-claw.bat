@echo off
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile

REM Fix for Windows path issue
set EXPO_USE_METRO_WORKSPACE_ROOT=1
set EXPO_NO_TELEMETRY=1

REM Start Expo
C:\node20\node-v20.11.0-win-x64\node.exe node_modules\expo\bin\cli.js start --offline

pause
