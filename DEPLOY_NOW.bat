@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           CLAW APP - DEPLOY TO RENDER GUIDE                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo This will walk you through deploying your backend to Render.
echo.
echo STEP 1: Create GitHub Repository
echo ---------------------------------
echo 1. Go to: https://github.com/new
echo 2. Repository name: claw-app
echo 3. Description: CLAW app backend
echo 4. Click: [Create repository]
echo.
pause
echo.
echo STEP 2: Push Your Code
echo ----------------------
echo Running git push...
echo.

cd /d "C:\Users\Gústaf\Desktop\ClawNytt"

git push -u origin master
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Make sure you created the repo on GitHub!
    echo.
    echo To fix:
    echo 1. Create repo at https://github.com/new
echo 2. Run this script again
echo.
    pause
    exit /b 1
)

echo.
echo [OK] Code pushed to GitHub!
echo.
echo STEP 3: Deploy to Render
echo ------------------------
echo 1. Go to: https://dashboard.render.com
echo 2. Click: [New +] -^> [Web Service]
echo 3. Find [claw-app] and click [Connect]
echo.
echo Enter these settings:
echo   Name: claw-api
echo   Runtime: Python 3
echo   Build Command: pip install -r backend/requirements-prod.txt
echo   Start Command: cd backend ^&^& uvicorn app.main_production:app --host 0.0.0.0 --port %%PORT%%
echo   Plan: Free
echo.
echo Click: [Add Disk]
echo   Name: claw-data
echo   Mount Path: /data
echo   Size: 1 GB
echo.
echo Click: [Create Web Service]
echo.
pause
echo.
echo STEP 4: Get Your URL
echo --------------------
echo Wait for the build to finish (2-3 minutes)
echo Copy the URL (looks like: https://claw-api-xxx.onrender.com)
echo.
set /p RENDER_URL="Paste your Render URL here: "
echo.
echo STEP 5: Update Mobile App
echo -------------------------
echo Updating mobile/src/api/client.ts with your URL...
echo.
set API_URL=%RENDER_URL%/api/v1
echo const PRODUCTION_API_URL = '%API_URL%'; > mobile\src\api\temp.txt
powershell -Command "(Get-Content mobile\src\api\client.ts) -replace 'const PRODUCTION_API_URL = .*', 'const PRODUCTION_API_URL = ''%API_URL%'';' | Set-Content mobile\src\api\client.ts"
echo [OK] Updated!
echo.
echo STEP 6: Rebuild APK
echo -------------------
echo Submitting new build to Expo...
echo.
cd mobile
call npx eas build --platform android --profile preview --non-interactive
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                     ALL DONE!                                ║
echo ║                                                              ║
echo ║  Watch the build at:                                         ║
echo ║  https://expo.dev/accounts/camelt0e/projects/claw-app/builds ║
echo ║                                                              ║
echo ║  When finished, download and install on your phone!          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
