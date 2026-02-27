# 📧 Email Verification & Password Reset Implementation

## Summary

Added complete email verification and password reset flows to the CLAW authentication system.

## What Was Implemented

### Backend Changes

1. **Email Service** (`backend/app/core/email.py`)
   - Multi-provider support: SMTP, SendGrid, AWS SES
   - Beautiful HTML email templates matching CLAW design
   - Async email sending

2. **User Model Updates** (`backend/app/models/user_sqlite.py`)
   - Added `email_verified` (boolean)
   - Added `email_verification_token` (indexed)
   - Added `email_verification_sent_at` (timestamp)
   - Added `password_reset_token` (indexed)
   - Added `password_reset_sent_at` (timestamp)

3. **New Auth Endpoints** (`backend/app/api/v1/endpoints/auth.py`)
   - `POST /auth/verify-email` - Verify email with token
   - `POST /auth/resend-verification` - Resend verification email
   - `POST /auth/forgot-password` - Request password reset
   - `POST /auth/reset-password` - Reset password with token

4. **Configuration** (`backend/app/core/config.py`)
   - Email provider settings
   - SMTP, SendGrid, SES configuration
   - `REQUIRE_EMAIL_VERIFICATION` flag

5. **Updated Responses**
   - Registration now includes `email_verified` in user object
   - Login now includes `email_verified` in user object
   - `/auth/me` now includes `email_verified`

### Mobile Changes

1. **API Client** (`mobile/src/api/client.ts`)
   - Added `authAPI.verifyEmail(token)`
   - Added `authAPI.resendVerification(email)`
   - Added `authAPI.forgotPassword(email)`
   - Added `authAPI.resetPassword(token, newPassword)`

2. **Auth Store** (`mobile/src/store/authStore.ts`)
   - Added `email_verified` to User interface
   - Added `verifyEmail(token)` action
   - Added `resendVerification(email)` action
   - Added `forgotPassword(email)` action
   - Added `resetPassword(token, newPassword)` action

## Security Features

| Feature | Implementation |
|---------|---------------|
| Token expiration | Email: 24h, Password: 1h |
| Rate limiting | Resend: 3/min with 5min cooldown |
| Email enumeration | All forgot password requests return same message |
| Token uniqueness | Cryptographically secure random tokens |
| Brute force | Existing brute force protection on auth endpoints |

## Email Templates

### Verification Email
- Beautiful dark theme matching CLAW app
- Clear call-to-action button
- 24-hour expiration notice

### Password Reset Email
- Security warning prominently displayed
- 1-hour expiration notice
- No app branding (looks serious)

## Configuration

### Environment Variables

```bash
# Required for email
EMAIL_PROVIDER=sendgrid  # or smtp, ses
EMAIL_FROM=noreply@claw.app
EMAIL_FROM_NAME=CLAW
FRONTEND_URL=https://claw.app

# SendGrid (recommended)
SENDGRID_API_KEY=SG.xxxxxx

# Or SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
REQUIRE_EMAIL_VERIFICATION=false  # Set to true after testing
```

### Render Blueprint

The `render.yaml` includes email configuration with SendGrid as default provider.

## Testing

### Local Development
```bash
# Without email (dev mode)
EMAIL_PROVIDER=smtp
SMTP_USER=""
SMTP_PASS=""
# Emails will be logged to console

# With SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key
```

### API Testing
```bash
# Register (triggers verification email)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","display_name":"Test User"}'

# Verify email
curl -X POST http://localhost:8000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"xxx"}'

# Forgot password
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Reset password
curl -X POST http://localhost:8000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"xxx","new_password":"newpass123"}'
```

## Next Steps

1. **Set up SendGrid account** for production
2. **Configure FRONTEND_URL** for deep links
3. **Add deep link handling** in mobile app for verify/reset
4. **Enable REQUIRE_EMAIL_VERIFICATION** after testing
5. **Consider: Email templates i18n** for Icelandic

## Files Modified

- `backend/app/core/email.py` (new)
- `backend/app/core/config.py`
- `backend/app/models/user_sqlite.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/requirements-prod.txt`
- `mobile/src/api/client.ts`
- `mobile/src/store/authStore.ts`
- `render.yaml`
- `DEPLOYMENT_CHECKLIST.md`
