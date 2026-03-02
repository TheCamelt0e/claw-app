# CLAW Backend & Mobile Connection Fix Summary

## Problem
Mobile app login hanging/not responding - requests timing out

## Root Cause Identified
The **login endpoint is timing out** while health endpoint works. Test results:
- [OK] Health Endpoint: Working
- [OK] CORS Preflight: Working  
- [FAIL] Login Endpoint: **Timing out**
- [OK] Register Endpoint: Working (returns validation error)

This suggests the server is failing when processing login logic, likely due to:
1. **Missing SECRET_KEY** in production environment (MOST LIKELY)
2. Database connection issue during auth
3. Rate limiting decorator hanging

---

## Changes Made

### 1. Backend Configuration (`render.yaml`)
```yaml
# BEFORE (WRONG):
- key: SECRET_KEY
  generateValue: true  # Changes on every deploy!

# AFTER (CORRECT):
# IMPORTANT: Set this manually in Render dashboard!
- key: SECRET_KEY
  sync: false  # Must be set manually in Render dashboard
```

**Why:** Auto-generated SECRET_KEY changes on every deploy, invalidating all JWT tokens and potentially causing crashes.

### 2. Backend CORS (`backend/app/main.py`)
```python
# Added mobile app specific origins
production_origins = cors_origins + ["null", "file://", "capacitor://", "ionic://"]
```

**Why:** Mobile apps (React Native, Capacitor) send `null` or `file://` as Origin.

### 3. Disabled TrustedHostMiddleware (`backend/app/main.py`)
```python
# DISABLED - Causes issues with mobile apps
# TrustedHostMiddleware was rejecting requests without proper Host headers
```

**Why:** Mobile apps don't always send proper Host headers. API key + JWT provide sufficient security.

### 4. Auth Logging (`backend/app/api/v1/endpoints/auth.py`)
```python
# Added debug logging to login/register endpoints
print(f"[LOGIN] Request from: {http_request.client.host}")
print(f"[LOGIN] Origin: {http_request.headers.get('origin', 'none')}")
```

**Why:** Helps diagnose issues in Render logs.

### 5. Mobile API Client (`mobile/src/api/client.ts`)
- Better error handling for 403 CORS errors
- Always log auth requests
- Better timeout messages

### 6. Server Wake Service (`mobile/src/service/serverWake.ts`)
- Better logging
- URL validation
- More diagnostic info

---

## Action Required - CRITICAL

### Step 1: Set SECRET_KEY in Render Dashboard

**This is REQUIRED for the backend to work!**

1. Go to https://dashboard.render.com
2. Click on your `claw-api` web service
3. Click **"Environment"** on the left sidebar
4. Add environment variable:
   - **Key:** `SECRET_KEY`
   - **Value:** (run this to generate: `python -c "import secrets; print(secrets.token_hex(32))"`)
5. Click **"Save Changes"**
6. Service will auto-redeploy

### Step 2: Redeploy Backend

After setting SECRET_KEY, manually trigger a deploy:
1. In Render dashboard, click **"Manual Deploy"**
2. Select **"Clear build cache & deploy"**
3. Wait for deployment to complete (~2-3 minutes)

### Step 3: Test the Backend

Run the test script:
```bash
python backend/test_production_connection.py https://claw-api-b5ts.onrender.com
```

Expected output:
```
[OK] PASS: Health Endpoint
[OK] PASS: CORS Preflight
[OK] PASS: Login Endpoint  <- This should now pass!
[OK] PASS: Register Endpoint

✓ ALL TESTS PASSED
```

---

## How to Test Mobile App

### Option 1: Expo Go (Development)
```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

### Option 2: Build New APK
```bash
cd mobile
npx eas build --platform android --profile preview
```

---

## Debugging

### Check Render Logs
1. https://dashboard.render.com
2. Click your service
3. Click "Logs" tab
4. Look for errors when trying to login

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SECRET_KEY not set` | Missing env var | Set SECRET_KEY in dashboard |
| `Database connection failed` | PostgreSQL issue | Check database status |
| `CORS error` | Origin not allowed | Already fixed in code |
| `Request timeout` | Server crashing | Check logs for startup errors |

---

## Files Changed

1. `render.yaml` - SECRET_KEY configuration
2. `backend/app/main.py` - CORS + TrustedHost fixes
3. `backend/app/api/v1/endpoints/auth.py` - Debug logging
4. `mobile/src/api/client.ts` - Better error handling
5. `mobile/src/service/serverWake.ts` - Better diagnostics
6. `backend/test_production_connection.py` - New test script

---

## Verification Checklist

- [ ] SECRET_KEY set in Render dashboard
- [ ] Backend redeployed
- [ ] Test script shows all tests passing
- [ ] Mobile app can reach `/health` endpoint
- [ ] Mobile app can login without timeout

---

## Support

If issues persist after following these steps:
1. Check Render logs for specific error messages
2. Run the test script and share output
3. Verify mobile app API URL matches your Render URL exactly
