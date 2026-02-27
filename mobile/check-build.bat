@echo off
echo.
echo =========================================
echo      CLAW APK Build Status Checker
echo =========================================
echo.
cd /d "%~dp0"
:npx eas build:list --limit 1
echo.
echo Build URL:
echo https://expo.dev/accounts/camelt0e/projects/claw-app/builds
echo.
echo Press any key to refresh... (Ctrl+C to exit)
pause >nul
goto check
