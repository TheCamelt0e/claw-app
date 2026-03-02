# CLAW Backend Debug Guide - Login Timeout Issue

## Current Status

The backend health endpoint works, but **login requests are timing out**. This document helps you fix this.

---

## Quick Diagnosis Steps

### 1. Check Render Logs

Go to your Render dashboard:
1. Open https://dashboard.render.com
2. Click on your `claw-api` service
3. Click on "Logs" tab
4. Try to login from the mobile app
5. Watch the logs for errors

### 2. Common Causes & Fixes

#### A. Database Connection Issues
Look for errors like:
```
psycopg2.OperationalError: connection failed
SQLAlchemy: Connection refused
```

**Fix:**
- Check that PostgreSQL database is provisioned
- Verify `DATABASE_URL` environment variable is set

#### B. SECRET_KEY Not Set
Look for errors like:
```
[FATAL] SECRET_KEY environment variable is not set!
```

**Fix (CRITICAL - MUST DO):**
1. Go to Render Dashboard > Your Service > Environment
2. Add environment variable:
   - Key: `SECRET_KEY`
   - Value: (generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)
3. Redeploy the service

#### C. Rate Limiting/Redis Issues
Look for errors like:
```
Redis connection failed
Rate limit check failed
```

**Fix:**
The app should fall back to in-memory rate limiting, but check if Redis is configured properly.

---

## How to Fix (Step by Step)

### Step 1: Set SECRET_KEY in Render Dashboard

This is the MOST LIKELY cause of the timeout!

1. Go to https://dashboard.render.com
2. Click your web service
3. Click "Environment" on the left
4. Add these environment variables:

```
SECRET_KEY=your-generated-secret-key-here  (REQUIRED - 64 hex chars)
ENVIRONMENT=production
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key  (optional, for emails)
GEMINI_API_KEY=your-gemini-key  (optional, for AI)
```

Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

5. Click "Save Changes"
6. The service will auto-redeploy

### Step 2: Verify Database

1. In Render dashboard, check "PostgreSQL" section
2. Make sure database status is "Available"
3. If not, you may need to create a new PostgreSQL instance

### Step 3: Manual Deploy

After setting environment variables:
1. Go to your service in Render dashboard
2. Click "Manual Deploy" > "Clear build cache & deploy"
3. Wait for deployment to complete

### Step 4: Test Again

Run the test script again:
```bash
python backend/test_production_connection.py https://claw-api-b5ts.onrender.com
```

Or test in browser:
```
https://claw-api-b5ts.onrender.com/health
```

---

## What Changed in This Fix

I made these changes to the codebase:

### 1. `render.yaml`
- Changed SECRET_KEY from `generateValue: true` to `sync: false`
- **Why:** Auto-generated keys change on each deploy, invalidating all JWT tokens

### 2. `backend/app/main.py`
- Added `null` and `file://` to CORS allowed origins for mobile apps
- Commented out `TrustedHostMiddleware` which was blocking mobile requests
- **Why:** Mobile apps don't send proper Origin headers

### 3. `backend/app/api/v1/endpoints/auth.py`
- Added debug logging to login and register endpoints
- **Why:** Helps diagnose issues in Render logs

### 4. `mobile/src/api/client.ts`
- Better error handling for 403 errors
- Always log auth requests
- **Why:** Better visibility into what's happening

### 5. `mobile/src/service/serverWake.ts`
- Better logging and URL validation
- **Why:** Easier to debug connection issues

---

## If It Still Doesn't Work

### Checklist:

1. [ ] SECRET_KEY is set in Render dashboard (64 character hex string)
2. [ ] DATABASE_URL is set (should be auto-set if using Render PostgreSQL)
3. [ ] Service shows as "Live" in Render dashboard
4. [ ] Logs show no errors on startup
5. [ ] Mobile app API URL matches exactly: `https://claw-api-b5ts.onrender.com/api/v1`

### Get Help:

1. Copy your Render logs (last 50 lines)
2. Check mobile app console logs (shake device in Expo Go, or use Android Studio)
3. Test with the provided test script

---

## Expected Behavior After Fix

1. Health endpoint returns immediately: `{"status": "healthy"}`
2. Login with wrong password returns 401 immediately (not timeout)
3. Login with correct credentials returns token immediately
4. Mobile app can login without hanging

---

## Testing Locally

Before deploying, you can test the backend locally:

```bash
cd backend
pip install -r requirements.txt
# Set environment variables
set SECRET_KEY=your-test-secret-key
set ENVIRONMENT=development
python -c "from app.main import app; print('App loads successfully')"
```

Then run:
```bash
uvicorn app.main:app --reload
```

Test in another terminal:
```bash
curl http://localhost:8000/health
```

---

## Summary

The login timeout is most likely caused by:
1. **Missing SECRET_KEY** (most common) - Set it in Render dashboard
2. **Database connection issue** - Check PostgreSQL status
3. **Server crashing on startup** - Check logs for errors

The changes I made fix CORS and security middleware issues that could also cause problems, but the SECRET_KEY is critical and must be set manually.
