# CLAW App - Complete Build & Distribution Guide

## Overview
This guide will walk you through building and distributing CLAW to users.

---

## PART 1: Deploy Backend (5 minutes)

### Option A: Render (Free)
1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo or upload the backend folder
4. Configure:
   - **Name**: `claw-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements-sqlite.txt`
   - **Start Command**: `uvicorn app.main_production:app --host 0.0.0.0 --port $PORT`
5. Click "Create Web Service"
6. Wait for deployment (2-3 minutes)
7. Copy the URL (e.g., `https://claw-api.onrender.com`)

### Option B: Railway (Free)
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo
4. Railway auto-detects Python
5. Deploy!

### Update Mobile App
Edit `mobile/src/api/client.ts`:
```typescript
const API_BASE_URL = 'https://your-deployed-url.onrender.com/api/v1';
```

---

## PART 2: Build Mobile App

### Prerequisites
1. Install Node.js: https://nodejs.org (LTS version)
2. Install Expo CLI:
   ```bash
   npm install -g expo-cli eas-cli
   ```
3. Create Expo account: https://expo.dev/signup

### Step 1: Configure App
Edit `mobile/app.json`:
```json
{
  "expo": {
    "name": "CLAW",
    "slug": "claw-app",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "android": {
      "package": "com.yourname.claw",
      "versionCode": 1
    },
    "ios": {
      "bundleIdentifier": "com.yourname.claw",
      "buildNumber": "1.0.0"
    }
  }
}
```

### Step 2: Login to Expo
```bash
cd mobile
expo login
# Enter your Expo username/password
```

### Step 3: Build for Android
```bash
cd mobile
eas build --platform android --profile preview
```

This creates an APK file you can share directly!

### Step 4: Download & Share
1. Expo will give you a download link
2. Download the APK
3. Share it with users!

---

## PART 3: User Installation

### Android Users
1. Download the APK file
2. Open it on their phone
3. Tap "Install" (may need to allow "Unknown Sources")
4. Open CLAW and start using!

### iOS Users
iOS requires App Store distribution. For testing:
1. Build with: `eas build --platform ios`
2. Use TestFlight to distribute
3. Or publish to App Store

---

## Quick Test Build (No App Store)

### For Android (Easiest)
```bash
cd mobile
# Build APK
eas build -p android --profile preview

# Or use Expo Go for testing
expo start
# Scan QR code with Expo Go app
```

### For Testing with Friends
1. Install Expo Go on phones
2. Run `expo start` on your computer
3. Friends scan the QR code
4. They can use the app immediately!

---

## Production Checklist

- [ ] Backend deployed to Render/Railway
- [ ] API URL updated in mobile app
- [ ] App icon designed (1024x1024)
- [ ] Splash screen designed
- [ ] App name finalized
- [ ] Build successful
- [ ] Tested on real device
- [ ] Shared with beta users

---

## Troubleshooting

### Build Fails
- Check `app.json` is valid JSON
- Ensure all dependencies installed: `npm install`
- Check Expo CLI is latest: `npm update -g expo-cli`

### Can't Connect to Backend
- Verify backend URL is correct
- Check backend is running (visit URL in browser)
- Ensure phone/computer on same network (for local dev)

### APK Won't Install
- Enable "Install from Unknown Sources" in Android settings
- Ensure APK downloaded completely
- Try different Android version

---

## Next Steps After Build

1. **Beta Testing**: Share with 5-10 friends
2. **Collect Feedback**: Fix bugs, improve UX
3. **App Store**: Publish to Google Play / App Store
4. **Marketing**: Share on social media

---

**Questions? Check the README.md or ask for help!**
