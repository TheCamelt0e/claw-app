@echo off
echo.
echo    ╔═══════════════════════════════════════╗
echo    ║      CLAW Web App - Starting...       ║
echo    ╚═══════════════════════════════════════╝
echo.
echo    Open your browser to:
echo    http://localhost:3000
echo.
echo    OR use your phone on the same WiFi:
echo    http://%COMPUTERNAME%:3000
echo.
python -m http.server 3000
