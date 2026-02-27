@echo off
echo ==========================================
echo 🦀 CLAW - Build APK via Expo EAS
echo ==========================================
echo.
echo 🌐 Backend: https://claw-api-b5ts.onrender.com (LIVE)
echo 📱 Building via: expo.dev (EAS Build)
echo 👤 Account: camelt0e
echo.

cd mobile

echo 🔑 Verifying Expo login...
npx eas whoami
echo.

echo 🚀 Submitting build to Expo EAS...
echo ⏱️  This will take 10-30 minutes (free tier queue)
echo 📧 You'll get an email when it's ready
echo.

npx eas build --platform android --profile preview

echo.
echo ==========================================
echo ✅ Build Submitted to Expo!
echo ==========================================
echo.
echo Track progress:
echo https://expo.dev/accounts/camelt0e/projects/claw-app/builds
echo.
echo Previous successful build:
echo https://expo.dev/artifacts/eas/b4XAHESGxh3Sau9mxb9AUZ.apk
echo.
pause
