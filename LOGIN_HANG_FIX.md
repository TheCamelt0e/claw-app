# Login Hang Fix - Diagnostic Guide

## Problem
App shows "Server ready" but then gets stuck on "Starting login..." indefinitely.

## Changes Made

### 1. Mobile App Changes

#### `mobile/src/api/client.ts`
- Added `keepalive: true` to fetch requests (helps with connection stability)
- Added `testAPIConnection()` function to verify auth endpoint is accessible
- Reduced login timeout from 30s to 20s (fails faster if something is wrong)

#### `mobile/src/store/authStore.ts`
- Added API connection test before attempting login
- Added global timeout wrapper around login request (20s max)
- Better error messages to identify where it hangs

#### `mobile/src/service/serverWake.ts`
- Changed API check from root `/` to actual auth endpoint `/api/v1/auth/login`
- Uses OPTIONS method (lightweight CORS preflight) to verify endpoint is ready

### 2. Backend Changes

#### `backend/app/api/v1/endpoints/auth.py`
- Added database health check at start of login
- Returns 503 error immediately if DB is unavailable (instead of hanging)
- Better logging to trace request flow

#### `backend/app/core/api_security.py`
- Accepts both derived API key AND hardcoded mobile app key

---

## Deployment Steps

### Step 1: Deploy Backend
```bash
git add -A
git commit -m "Fix login hang - add DB health check and API key fix"
git push origin main
```

Then in Render dashboard:
1. Go to https://dashboard.render.com
2. Click `claw-api` service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment

### Step 2: Test Backend
```bash
python backend/test_production_connection.py https://claw-api-b5ts.onrender.com
```

### Step 3: Test Mobile App
In Expo Go or your APK, try to login and watch the logs.

---

## Diagnostic - Check These Logs

### Mobile App Logs (Expo console)
Look for these messages in order:

```
[AUTH] ========== LOGIN START ==========
[AUTH] Step 0: Checking server availability...
[ServerWake] ✓ Server is already awake: healthy
[AUTH] Server is ready, proceeding with login...
[AUTH] Testing API connection...
[API] >>> POST https://claw-api-b5ts.onrender.com/api/v1/auth/login (timeout: 20000ms)
[API] <<< POST /auth/login - Status: 200
[AUTH] Step 2: Login API success
```

**If you see:**
- `[AUTH] Testing API connection...` but nothing after → API endpoint not accessible
- `[API] >>> POST ...` but nothing after → Request sent but no response (backend issue)
- `[API] <<< ... - Status: 401` → Wrong credentials (this is OK, means it works!)
- `[API] <<< ... - Status: 403` → API key issue (deploy latest backend)

### Render Backend Logs
Go to Render Dashboard → Logs tab, look for:

```
[LOGIN] ========== LOGIN REQUEST ==========
[LOGIN] From: xxx.xxx.xxx.xxx
[LOGIN] API-Key (first 20 chars): claw-mobile-app-v1...
[LOGIN] ========== LOGIN SUCCESS ==========
```

**If you see:**
- `[LOGIN] ========== LOGIN REQUEST ==========` → Request is reaching backend
- `[LOGIN] ✗ Database connection failed` → Database issue
- No login logs at all → Request not reaching backend (CORS/network issue)

---

## Quick Test

Run this in your browser to verify the backend is responding:
```
https://claw-api-b5ts.onrender.com/health
```

Should return:
```json
{"status": "healthy", "database": {"connected": true}}
```

---

## If Still Hanging

### Check 1: Is backend deployed?
1. Go to https://dashboard.render.com
2. Check if `claw-api` shows "Live"
3. Check the last deploy timestamp

### Check 2: Is SECRET_KEY set?
In Render dashboard → Environment, verify:
- `SECRET_KEY` is set (64 character hex string)
- `ENVIRONMENT` = `production`

### Check 3: Check CORS
Open browser dev tools → Network tab, try login from web version, check if CORS headers are present.

### Check 4: Database connection
In Render logs, look for:
```
[Database] PAID tier - PostgreSQL initialized
```
If you see database errors, the DB connection might be the issue.

---

## Emergency Workaround

If you need to get it working immediately while debugging:

1. Try creating a new account (register) instead of login - this tests if the API is working
2. Try the test script: `python backend/test_production_connection.py https://claw-api-b5ts.onrender.com`
3. Check if your IP is being blocked by Render's firewall
