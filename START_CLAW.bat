@echo off
echo.
echo    ╔═══════════════════════════════════════════════════╗
echo    ║                                                   ║
echo    ║              CLAW - Starting Up...                ║
echo    ║                                                   ║
echo    ╚═══════════════════════════════════════════════════╝
echo.

:: Check if backend is already running
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% == 0 (
    echo    [OK] Backend already running on port 8000
) else (
    echo    [STARTING] Backend on port 8000...
    start "CLAW Backend" cmd /k "cd /d C:\Users\Gústaf\Desktop\ClawNytt\backend && py run_sqlite.py"
    timeout /t 3 /nobreak >nul
)

:: Check if web server is already running
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% == 0 (
    echo    [OK] Web server already running on port 3000
) else (
    echo    [STARTING] Web server on port 3000...
    start "CLAW Web" cmd /k "cd /d C:\Users\Gústaf\Desktop\ClawNytt\web && py -m http.server 3000"
    timeout /t 2 /nobreak >nul
)

echo.
echo    ╔═══════════════════════════════════════════════════╗
echo    ║         CLAW IS READY!                            ║
echo    ║                                                   ║
echo    ║   Open browser:  http://localhost:3000            ║
echo    ║                                                   ║
echo    ║   Or scan QR on phone (same WiFi):                ║
echo    ║   http://%COMPUTERNAME%:3000                      ║
echo    ╚═══════════════════════════════════════════════════╝
echo.
echo    Press any key to open browser...
pause >nul

start http://localhost:3000
