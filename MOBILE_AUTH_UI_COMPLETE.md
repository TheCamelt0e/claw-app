# 📱 Mobile Auth UI - COMPLETE

## Summary

Added complete UI for email verification and password reset flows.

## New Screens Created

### 1. ForgotPasswordScreen.tsx
- Email input form
- Submit to request reset link
- Success state with confirmation
- "Back to Sign In" button
- Rate limiting info

### 2. ResetPasswordScreen.tsx
- New password input
- Confirm password input
- Password strength indicator
- Eye icons to toggle visibility
- Handles deep link tokens
- Invalid token fallback

### 3. EmailVerificationScreen.tsx
- Shows verification status
- Resend email button
- Success state after verification
- "I'll verify later" option
- **EmailVerificationBanner** component for Profile screen

## Updated Files

### LoginScreen.tsx
- Added "Forgot password?" link
- Uses navigation to go to ForgotPassword screen

### App.tsx
- Added new screens to navigation stack:
  - `ForgotPassword` (auth flow)
  - `ResetPassword` (auth flow)
  - `EmailVerification` (main flow)

### ProfileScreen.tsx
- Uses real user data from auth store
- Shows "Unverified" badge if email not verified
- Shows `EmailVerificationBanner` at top
- Displays streak from user object

## Navigation Flow

```
Auth Flow:
LoginScreen → ForgotPasswordScreen → (email) → ResetPasswordScreen → LoginScreen

Registration Flow:
LoginScreen (signup) → MainTabs → EmailVerificationScreen (if not verified)

Profile Flow:
ProfileScreen → EmailVerificationScreen (via banner)
```

## Deep Link Support

The app handles these URL schemes:

```
claw://verify-email?token=xxx  → EmailVerificationScreen
claw://reset-password?token=xxx → ResetPasswordScreen
```

*Note: Deep link handling requires additional setup in app.json*

## UI Features

| Screen | Features |
|--------|----------|
| ForgotPassword | Email validation, loading state, success message |
| ResetPassword | Password visibility toggle, strength meter, match validation |
| EmailVerification | Auto-verify with token, resend cooldown, skip option |

## Files Modified

- `mobile/src/screens/LoginScreen.tsx` - Added forgot password link
- `mobile/src/screens/ProfileScreen.tsx` - Added verification status
- `mobile/App.tsx` - Added new screens to navigation

## Files Created

- `mobile/src/screens/ForgotPasswordScreen.tsx` (9.1 KB)
- `mobile/src/screens/ResetPasswordScreen.tsx` (11.6 KB)
- `mobile/src/screens/EmailVerificationScreen.tsx` (11.9 KB)

## Next Steps

1. **Test locally** with `expo start`
2. **Configure deep links** in app.json (optional)
3. **Build and deploy** to Expo/EAS

## Deep Link Configuration (Optional)

To enable deep links from emails, add to `app.json`:

```json
{
  "expo": {
    "scheme": "claw",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "claw",
              "host": "verify-email"
            },
            {
              "scheme": "claw",
              "host": "reset-password"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Status

✅ All auth UI screens complete
✅ Navigation wired up
✅ Profile shows verification status
⬜ Deep links configured (optional)
⬜ End-to-end testing
