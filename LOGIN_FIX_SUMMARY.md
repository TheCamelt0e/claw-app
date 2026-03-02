# CLAW Login Fix Summary

## Problem
Mobile app login requests were **hanging/timing out**. The health endpoint worked, but login requests never returned.

## Root Causes Found & Fixed

### 1. API Key Mismatch (PRIMARY ISSUE) 🔴
**Problem:** The mobile app and backend had different API keys.

| Component | Value | Source |
|-----------|-------|--------|
| Mobile App | `claw-mobile-app-v1-secure-key` | Hardcoded in `client.ts` |
| Backend | Derived from `SECRET_KEY` via HMAC-SHA256 | `api_security.py` |

**Fix:** Backend now accepts BOTH keys:
- The derived key (from SECRET_KEY)
- The hardcoded mobile app key

**Files Changed:**
- `backend/app/core/api_security.py` - Now accepts both keys

### 2. Timeout Too Short
**Problem:** Login timeout was only 15 seconds, which could be tight.

**Fix:** Increased to 30 seconds.

**Files Changed:**
- `mobile/src/api/client.ts` - Login timeout: 15000ms → 30000ms

### 3. Better Debug Logging
**Problem:** Hard to diagnose issues without proper logging.

**Fix:** Added comprehensive logging to login endpoint.

**Files Changed:**
- `backend/app/api/v1/endpoints/auth.py` - Added detailed request/response logging

---

## Deployment Steps

### Step 1: Commit Changes
```bash
git add -A
git commit -m "Fix API key mismatch for mobile app login"
git push origin main
```

### Step 2: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your `claw-api` service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment (~2-3 minutes)

### Step 3: Test Backend

Run the test script:
```bash
python backend/test_production_connection.py https://claw-api-b5ts.onrender.com
```

Expected output:
```
[OK] PASS: Health Endpoint
[OK] PASS: CORS Preflight
[OK] PASS: Login Endpoint
[OK] PASS: Register Endpoint

✓ ALL TESTS PASSED
```

### Step 4: Test Mobile App

#### Option A: Development Mode (Expo Go)
```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

#### Option B: Build New APK
```bash
cd mobile
npx eas build --platform android --profile preview
```

---

## Verification Checklist

- [ ] Backend deployed successfully (Render shows "Live")
- [ ] Test script shows all tests passing
- [ ] Mobile app can reach `/health` endpoint
- [ ] Mobile app can login without timeout
- [ ] Mobile app can register new accounts

---

## If Still Having Issues

### Check Render Logs
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your `claw-api` service
3. Click "Logs" tab
4. Try to login from mobile app
5. Watch for these log messages:
   - `[LOGIN] ========== LOGIN REQUEST ==========`
   - `[LOGIN] From: ...`
   - `[LOGIN] API-Key (first 20 chars): ...`
   - `[LOGIN] ========== LOGIN SUCCESS ==========`

### Common Log Messages

| Log Message | Meaning |
|-------------|---------|
| `LOGIN REQUEST` | Login attempt received |
| `API-Key (first 20 chars): claw-mobile-app-v1` | Mobile app API key recognized |
| `LOGIN SUCCESS` | Login completed successfully |
| `Invalid or missing API key` | API key mismatch (deploy fix) |
| `SECRET_KEY not set` | Missing SECRET_KEY env var |

### Environment Variables to Check in Render

Make sure these are set in your Render dashboard:

| Variable | Status | Value |
|----------|--------|-------|
| `SECRET_KEY` | ✅ REQUIRED | 64-char hex string |
| `DATABASE_URL` | ✅ Auto-set | From PostgreSQL |
| `ENVIRONMENT` | ✅ Should be | `production` |
| `GEMINI_API_KEY` | Optional | Your Gemini API key |

---

## Technical Details

### API Key Validation Flow

```
Mobile App Request
    ↓
Headers include: X-API-Key: claw-mobile-app-v1-secure-key
    ↓
Backend validates against VALID_API_KEYS list:
  1. Derived key from SECRET_KEY
  2. Hardcoded key: claw-mobile-app-v1-secure-key
    ↓
Match found → Request allowed
```

### CORS Configuration

The backend accepts these origins in production:
- `https://claw.app`
- `null` (React Native apps)
- `file://` (APK builds)
- `capacitor://localhost` (iOS)
- `ionic://localhost` (Android)

---

## Files Modified

1. `backend/app/core/api_security.py` - Accept both API keys
2. `backend/app/api/v1/endpoints/auth.py` - Better logging
3. `mobile/src/api/client.ts` - Longer timeout + comment
4. `backend/test_production_connection.py` - Include API key header

---

## Support

If issues persist after deployment:
1. Copy Render logs (last 50 lines)
2. Run test script and share output
3. Check mobile app console logs (shake device in Expo Go)
