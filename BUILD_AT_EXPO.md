# 🚀 Build CLAW at Expo.dev

## Your Account Info
- **Username**: camelt0e
- **Project**: claw-app
- **Project ID**: 73bf8fd3-f59b-4544-a97d-e22b17bfb90c

## Step-by-Step Build Instructions

### 1. Open Terminal/Command Prompt

### 2. Navigate to Project
```bash
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile
```

### 3. Install EAS CLI (one-time)
```bash
npm install -g eas-cli
```

### 4. Login to Expo
```bash
eas login
```
Enter your Expo credentials when prompted.

### 5. Run Build

**For Testing (APK - easiest to install):**
```bash
eas build --platform android --profile preview
```

**For Play Store (AAB - production):**
```bash
eas build --platform android --profile production
```

### 6. Wait for Build

Build takes ~10-15 minutes. You'll see:
```
[expo-cli] Starting build...
[expo-cli] Build queued...
[expo-cli] Build in progress...
[expo-cli] Build completed!
```

### 7. Download

You'll get an email, or visit:
https://expo.dev/accounts/camelt0e/projects/claw-app/builds

Click the latest build → Download APK

---

## Common Issues

### "eas: command not found"
```bash
npx eas build --platform android --profile preview
```

### "Project not found"
Make sure you're in the `mobile` folder with `app.json`

### Build fails
Check logs at: https://expo.dev/accounts/camelt0e/builds

---

## What I Prepared For You

✅ All auth screens (Login, Forgot Password, Reset, Verification)
✅ Backend APIs (email verification, password reset)
✅ API client methods
✅ Auth store with all actions
✅ Expo configuration
✅ Build profiles configured

The app is ready to build!

---

## After Build

1. Download APK from Expo
2. Install on Android device
3. Test: Register → Login → Capture → Strike

Good luck! 🍺
