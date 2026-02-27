# 🦀 CLAW - Quick Start Guide

Get the app running in 10 minutes.

---

## Prerequisites

- Node.js 18+
- Python 3.12+
- Android Studio (for emulator) or physical Android device
- Git

---

## 1. Clone & Setup (2 minutes)

```bash
# Clone repo
git clone <repo-url> claw
cd claw

# Install mobile dependencies
cd mobile
npm install

# Install backend dependencies
cd ../backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

---

## 2. Backend Setup (3 minutes)

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your values:
# GEMINI_API_KEY=your_key_here
# SECRET_KEY=random_string_here

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend now running at: `http://localhost:8000`

Test: `curl http://localhost:8000/health`

---

## 3. Mobile Setup (3 minutes)

```bash
cd mobile

# Update API URL in src/api/client.ts
# Change from production to: http://YOUR_IP:8000

# Start Expo
npx expo start
```

**To run on device:**
1. Install "Expo Go" app from Play Store
2. Scan QR code in terminal
3. App loads on device

**To run on emulator:**
1. Start Android Studio
2. Create virtual device (Pixel 6 recommended)
3. Press 'a' in Expo terminal

---

## 4. Test Core Features (2 minutes)

### Capture Test
1. Tap microphone
2. Say: "Buy milk from Bónus"
3. See AI categorize automatically
4. Tap "CLAW IT"

### Strike Test
1. Go to Strike tab
2. Tap checkbox to complete
3. See "Oracle Moment" if AI was right

### Offline Test
1. Enable airplane mode
2. Capture 3 items
3. See "3 syncing" badge
4. Disable airplane mode
5. Watch items sync automatically

---

## 5. Deploy Backend (5 minutes)

### Option A: Render (Free)

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to render.com → New Web Service
# 3. Connect GitHub repo
# 4. Settings:
#    - Build Command: pip install -r requirements.txt
#    - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
#    - Environment: PYTHON_VERSION=3.12

# 5. Add environment variables:
#    - GEMINI_API_KEY
#    - SECRET_KEY
#    - DATABASE_URL (SQLite persists on disk)

# 6. Deploy!
```

### Option B: Fly.io (Free tier)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch
flyctl launch

# Set secrets
flyctl secrets set GEMINI_API_KEY=xxx
flyctl secrets set SECRET_KEY=xxx

# Deploy
flyctl deploy
```

---

## 6. Build APK (10 minutes)

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure build
eas build:configure

# Build APK (for testing)
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

Download APK from link when complete.

---

## 7. Submit to Play Store

### One-time setup ($25)
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay $25 developer fee
3. Create app
4. Fill store listing

### Required assets
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (5-8 phone screenshots)
- Privacy policy URL

### Upload
1. Go to "Production" → "Create release"
2. Upload AAB file
3. Add release notes
4. Start rollout

---

## Common Issues

### Issue: "Network error" on mobile
**Fix:** Update API URL in `mobile/src/api/client.ts` to your computer's IP:
```typescript
const API_BASE_URL = 'http://192.168.1.XXX:8000';
```

### Issue: "Gemini API rate limit"
**Fix:** Wait 60 seconds or reduce AI usage in `backend/app/core/config.py`

### Issue: Database locked
**Fix:** Ensure only one backend instance running
```bash
# Kill existing processes
lsof -ti:8000 | xargs kill -9
```

### Issue: Geofencing not working
**Fix:** Test on physical device (emulator location is flaky)

---

## Next Steps

1. **Test with real users** - Friends & family first
2. **Monitor crashes** - Set up Sentry
3. **Track analytics** - Mixpanel or Amplitude
4. **Iterate** - Weekly releases based on feedback
5. **Market** - Reddit, QR stickers, word of mouth

---

## Support

Stuck? Check:
1. `BUILD_SESSION_*_SUMMARY.md` files
2. `CLAW_MVP_COMPLETE.md` for feature list
3. Backend logs: `uvicorn app.main:app --reload --log-level debug`

---

**Ready to capture the world?** 🦀
