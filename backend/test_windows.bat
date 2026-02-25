@echo off
echo Testing CLAW API...
echo.

REM Install requests if not available
py -c "import requests" 2>nul
if errorlevel 1 (
    echo Installing test dependencies...
    py -m pip install requests
)

py test_api.py
pause
