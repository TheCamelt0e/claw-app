@echo off
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile

REM Clear cache
rmdir /s /q .expo 2>nul

REM Use older Expo that works
set EXPO_NO_TELEMETRY=1
C:\node20\node-v20.11.0-win-x64\npx.cmd expo@49.0.21 start --offline --clear

pause
