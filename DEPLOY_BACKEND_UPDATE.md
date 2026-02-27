# 🚀 Deploy Backend Updates to Render

## What Was Fixed

1. ✅ Backend now accepts **JSON body** instead of query parameters for login/register
2. ✅ All auth endpoints properly configured for REST API
3. ✅ SendGrid configuration ready (you just need to add API key)

## Step 1: Push Changes to Git

```bash
git add .
git commit -m "Fix auth endpoints to use JSON body + add SendGrid config"
git push origin main
```

## Step 2: Deploy to Render

### Option A: Auto-Deploy (If GitHub Connected)
1. Go to https://dashboard.render.com
2. Click on `claw-api` service
3. Click "Manual Deploy" → "Deploy Latest Commit"
4. Wait for build to complete (~2-3 minutes)

### Option B: Update Environment Variables First

Before deploying, add your SendGrid API key:

1. Go to https://dashboard.render.com → `claw-api` → "Environment" tab
2. Add these variables:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@claw.app
EMAIL_FROM_NAME=CLAW
FRONTEND_URL=https://claw.app
```

3. Click "Save Changes" (this will auto-deploy)

## Step 3: Test the Backend

After deploy completes, test with:

```bash
# Test health
curl https://claw-api-b5ts.onrender.com/health

# Test login with JSON (should work now!)
curl -X POST https://claw-api-b5ts.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

## Step 4: Get SendGrid API Key (Optional - for emails)

If you want email verification working:

1. Go to https://sendgrid.com
2. Create free account
3. Settings → API Keys → Create API Key
4. Name: `CLAW Production`
5. Permissions: "Mail Send" or "Full Access"
6. Copy the key (starts with `SG.`)
7. Add to Render environment variables (see Step 2)

## Step 5: Test Mobile App

The current APK should now work because:
- Backend accepts JSON body (proper REST)
- Mobile app sends JSON body

**If login still fails**, you may need to rebuild the APK.

## Troubleshooting

### "Cannot connect to server"
- Check if Render service is running (green dot)
- Verify API URL in mobile app is correct

### "Invalid credentials" but password is correct
- The backend may still be the old version
- Wait 2-3 minutes after deploy for changes to take effect
- Check Render logs: Dashboard → claw-api → Logs

### Emails not sending
- Verify `SENDGRID_API_KEY` is set in Render environment
- Check SendGrid dashboard for email activity
- Check Render logs for email errors

## Changes Summary

| File | Change |
|------|--------|
| `backend/app/api/v1/endpoints/auth.py` | Added `Body(...)` to all endpoints |
| `mobile/src/api/client.ts` | Reverted to JSON body format |
| `render.yaml` | SendGrid config ready |

**No mobile rebuild needed** if the APK was built after my fix!
