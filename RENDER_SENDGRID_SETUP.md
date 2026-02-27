# 🔧 SendGrid Setup for Render (Email Verification)

## Current Status
Your backend is deployed but **email sending is not configured**.

## What You Need to Do

### Step 1: Get SendGrid API Key

1. Go to https://sendgrid.com
2. Create a free account (or log in)
3. Go to Settings → API Keys
4. Click "Create API Key"
5. Name: `CLAW Production`
6. Permissions: **Full Access** (or at least "Mail Send")
7. Copy the API key (starts with `SG.`)

### Step 2: Add to Render Dashboard

1. Go to https://dashboard.render.com
2. Click on your `claw-api` service
3. Click "Environment" tab on the left
4. Click "Add Environment Variable"
5. Add these variables:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx  (paste your actual key)
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@claw.app
EMAIL_FROM_NAME=CLAW
FRONTEND_URL=https://claw.app
```

6. Click "Save Changes"
7. Render will automatically redeploy

### Step 3: Verify

Wait 2-3 minutes for redeploy, then test:
```bash
curl https://claw-api-b5ts.onrender.com/health
```

Should show:
```json
{
  "status": "healthy",
  "service": "claw-api"
}
```

### Step 4: Test Email

1. Register a new account in the app
2. Check your email inbox
3. You should receive a verification email from CLAW

---

## Alternative: Use Your Gmail (Easier)

If SendGrid is too complex, use Gmail SMTP:

### Gmail Setup:

1. Go to https://myaccount.google.com/apppasswords
2. Create an App Password
3. Add these to Render instead:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=CLAW
FRONTEND_URL=https://claw.app
```

---

## Troubleshooting

### Emails not sending?
- Check SendGrid dashboard for email activity
- Verify API key has "Mail Send" permissions
- Check Render logs: Dashboard → claw-api → Logs

### Verification link not working?
- Make sure FRONTEND_URL is set correctly
- For testing, you can set it to any valid URL

---

## Already Configured in render.yaml

The `render.yaml` file already has email config set up, you just need to add your actual `SENDGRID_API_KEY` value in the Render dashboard.

**No need to rebuild the app - this is all backend configuration!**
