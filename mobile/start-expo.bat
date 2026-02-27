@echo off
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile
set NODE_OPTIONS=--no-warnings
set EXPO_NO_TELEMETRY=1
C:\node20\node-v20.11.0-win-x64\node.exe node_modules\expo\bin\cli.js start --offline
pause
