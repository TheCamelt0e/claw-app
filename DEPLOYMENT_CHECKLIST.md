# 🚀 CLAW Deployment Checklist

## Phase 1: Backend Deployment to Render (15 min)

### 1.1 Prepare Repository
- [ ] `backend/.env` has `GEMINI_API_KEY` set
- [ ] `.gitignore` excludes `.env`
- [ ] All migrations committed to git

### 1.2 Create Render Account
- [ ] Sign up at https://render.com (use GitHub login)
- [ ] Verify email

### 1.3 Deploy Web Service
1. Dashboard → **New +** → **Web Service**
2. Connect GitHub repo
3. Configure:
   ```
   Name: claw-api
   Environment: Python 3
   Build Command: pip install -r requirements-sqlite.txt
   Start Command: uvicorn app.main_production:app --host 0.0.0.0 --port $PORT
   Plan: Free
   ```
4. Add Environment Variables:
   ```
   GEMINI_API_KEY=your_key_here
   SECRET_KEY=your_jwt_secret_here
   DATABASE_URL=sqlite:///./claw.db
   ```
5. Click **Create Web Service**

### 1.4 Verify Deployment
- [ ] Build completes (green checkmark)
- [ ] Visit `https://claw-api-xxxxx.onrender.com/docs`
- [ ] Swagger UI loads successfully
- [ ] Test `/health` endpoint returns `{"status": "ok"}`

### 1.5 Update Mobile Config
Edit `mobile/src/api/client.ts`:
```typescript
const PRODUCTION_API_URL = 'https://claw-api-xxxxx.onrender.com/api/v1';
```

### 1.6 Rebuild APK
```bash
cd mobile
eas build --platform android --profile preview
```

---

## Phase 2: Email Configuration (Optional but Recommended)

### 2.1 Choose Email Provider

**Option A: SendGrid (Recommended)**
- Sign up at https://sendgrid.com
- Create API key with "Mail Send" permissions
- Verify sender email/domain

**Option B: AWS SES**
- Set up in AWS Console
- Verify domain or email
- Request production access

**Option C: SMTP (Development only)**
- Use Gmail App Passwords
- Limited to 100 emails/day

### 2.2 Add Email Environment Variables

Add to Render dashboard → Environment:
```
# Email Configuration
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@claw.app
EMAIL_FROM_NAME=CLAW
FRONTEND_URL=https://claw.app

# SendGrid
SENDGRID_API_KEY=SG.xxxxxx

# Security
REQUIRE_EMAIL_VERIFICATION=false  # Set to true after testing
```

### 2.3 Test Email Flows
- [ ] Register new account → verification email sent
- [ ] Click verification link → email verified
- [ ] Forgot password → reset email sent
- [ ] Click reset link → password reset works

---

## Phase 3: Play Store Preparation (30 min)

### 3.1 Google Play Console
- [ ] Pay $25 developer fee
- [ ] Create app listing

### 3.2 Store Assets Needed
| Asset | Size | Status |
|-------|------|--------|
| App icon | 512x512 PNG | ✅ |
| Feature graphic | 1024x500 | ⬜ |
| Screenshots (phone) | 1080x1920 | ⬜ |
| Screenshots (tablet) | 2048x2732 | ⬜ |
| Short description | 80 chars max | ⬜ |
| Full description | 4000 chars max | ⬜ |

### 3.3 Build AAB (App Bundle)
```bash
eas build --platform android --profile production
```

### 3.4 Upload to Play Console
- [ ] Upload AAB file
- [ ] Fill content rating questionnaire
- [ ] Set pricing ($2.99/month, $23.99/year)
- [ ] Select countries (start with Iceland only)

### 3.5 Internal Testing
- [ ] Create internal testing track
- [ ] Add test user emails
- [ ] Send invites

---

## Phase 4: Post-Launch (Week 1)

### Day 1-3: Monitor
- [ ] Check Render dashboard for errors
- [ ] Monitor Gemini API usage
- [ ] Watch crash reports in Play Console

### Day 4-7: Iterate
- [ ] Collect feedback from beta users
- [ ] Fix critical bugs
- [ ] Prepare first update

---

## Email Verification & Password Reset API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Creates user + sends verification email |
| `/auth/verify-email` | POST | Verify email with token |
| `/auth/resend-verification` | POST | Resend verification email |
| `/auth/forgot-password` | POST | Send password reset email |
| `/auth/reset-password` | POST | Reset password with token |

### Token Expiration
- **Email verification**: 24 hours
- **Password reset**: 1 hour

### Rate Limits
- Registration: 5/minute
- Login: 5 failed attempts = 5 min lockout
- Resend verification: 3/minute with 5 min cooldown
- Forgot password: 3/minute with 5 min cooldown

---

## Emergency Contacts / Resources

| Resource | URL |
|----------|-----|
| Render Dashboard | https://dashboard.render.com |
| Expo Builds | https://expo.dev/accounts/camelt0e/projects/claw-app/builds |
| Play Console | https://play.google.com/console |
| Gemini Console | https://makersuite.google.com/app/apikey |
| SendGrid | https://app.sendgrid.com |

---

## Quick Status

| Component | Status | URL |
|-----------|--------|-----|
| Backend API | ⬜ Pending | - |
| Mobile APK | ✅ Ready | https://expo.dev/artifacts/eas/b4XAHESGxh3Sau9mxb9AUZ.apk |
| Play Store | ⬜ Not started | - |
| Domain/Website | ⬜ Optional | - |
