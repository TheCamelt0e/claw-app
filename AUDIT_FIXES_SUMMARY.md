# CLAW App - Audit Fixes Summary

## Changes Made - Critical Issues Fixed

### 1. Fixed Import Errors (CRITICAL) 
**File:** `backend/app/services/resurfacing.py`
- **Issue:** Imported `Claw` and `User` from non-existent `app.models.claw` and `app.models.user`
- **Fix:** Changed imports to use `app.models.claw_sqlite` and `app.models.user_sqlite`
- **Impact:** This would have crashed the app when resurfacing service was called

### 2. Removed Dead Code
**File:** `backend/app/services/ai_processor.py` (DELETED)
- **Issue:** Legacy OpenAI integration not being used (Gemini is primary)
- **Fix:** Deleted the entire file to avoid confusion

### 3. Fixed Duplicate Android Permissions
**File:** `mobile/app.json`
- **Issue:** Duplicate permissions with `android.permission.*` prefix
- **Fix:** Removed redundant prefixed permissions (Expo adds them automatically)

### 4. Added Request Timeout
**File:** `mobile/src/api/client.ts`
- **Issue:** No timeout on fetch requests - could hang indefinitely
- **Fix:** Added `AbortController` with 30-second default timeout
- **Bonus:** Better TypeScript types (`Record<string, unknown>` instead of `any`)

### 5. Added Input Sanitization
**File:** `backend/app/services/gemini_service.py`
- **Issue:** User content went directly into AI prompts without escaping
- **Fix:** Added `_sanitize_input()` method that:
  - Escapes quotes
  - Removes control characters
  - Limits length (2000 chars max)
  - Strips common prompt injection patterns

### 6. Added Environment Validation
**File:** `backend/app/core/config.py`
- **Issue:** No warnings when critical env vars missing
- **Fix:** Added `validate_settings()` function that warns if:
  - `GEMINI_API_KEY` not set
  - `SECRET_KEY` still using default value

## Design System Fixes

### 7. Added Missing Theme Colors
**File:** `mobile/src/theme/index.ts`
- Added `colors.gold.card` for VIP card backgrounds (`#2d2d00`)
- Added `colors.someday` palette for Someday items (`#9C27B0` etc.)

### 8. Fixed Hardcoded Colors Across All Screens
Updated these files to use theme colors instead of hardcoded values:

| File | Changes |
|------|---------|
| `CaptureScreen.tsx` | Gradient, VIP toggle, Someday toggle colors |
| `VaultScreen.tsx` | VIP card background, filter colors |
| `StrikeScreen.tsx` | Already using theme (no changes needed) |
| `ProfileScreen.tsx` | Milestone colors (7day, 30day, 100day, 365day) |
| `SurfaceScreen.tsx` | Store context colors (bonus, kronan, hagkaup, etc.) |
| `WelcomeScreen.tsx` | Feature highlight color |
| `NotificationsScreen.tsx` | Icon color |
| `ArchaeologistModal.tsx` | Someday purple colors |
| `SomedayCard.tsx` | All purple accents |
| `Card.tsx` | VIP card background |

## Files Modified

### Backend (5 files)
1. `backend/app/services/resurfacing.py` - Fixed imports
2. `backend/app/services/ai_processor.py` - Deleted (dead code)
3. `backend/app/services/gemini_service.py` - Added input sanitization
4. `backend/app/core/config.py` - Added validation warnings

### Mobile (11 files)
5. `mobile/app.json` - Fixed duplicate permissions
6. `mobile/src/api/client.ts` - Added timeout
7. `mobile/src/theme/index.ts` - Added missing colors
8. `mobile/src/screens/CaptureScreen.tsx` - Fixed hardcoded colors
9. `mobile/src/screens/VaultScreen.tsx` - Fixed hardcoded colors
10. `mobile/src/screens/ProfileScreen.tsx` - Fixed hardcoded colors + import
11. `mobile/src/screens/SurfaceScreen.tsx` - Fixed hardcoded colors + import
12. `mobile/src/screens/WelcomeScreen.tsx` - Fixed hardcoded color + import
13. `mobile/src/screens/NotificationsScreen.tsx` - Fixed hardcoded color + import
14. `mobile/src/components/ArchaeologistModal.tsx` - Fixed hardcoded colors + import
15. `mobile/src/components/SomedayCard.tsx` - Fixed hardcoded colors + import
16. `mobile/src/components/ui/Card.tsx` - Fixed hardcoded color

## What Was NOT Fixed (Requires Architectural Decisions)

The following issues were identified but require more discussion before implementing:

### 1. Authentication System (CRITICAL)
- **Current:** Uses `get_or_create_test_user()` - all users share same data
- **Required:** Real JWT auth with user isolation
- **Impact:** Cannot ship to production without this

### 2. Database (HIGH)
- **Current:** SQLite on Render (ephemeral filesystem)
- **Required:** PostgreSQL for data persistence
- **Impact:** Data loss on every redeploy

### 3. Rate Limiter (MEDIUM)
- **Current:** In-memory singleton
- **Required:** Redis for multi-instance deployments
- **Impact:** Rate limits don't work with multiple Render instances

## Next Steps Before Production

1. **Immediate:** Set proper `SECRET_KEY` and `GEMINI_API_KEY` environment variables on Render
2. **Before Beta:** Implement real authentication system
3. **Before Launch:** Migrate from SQLite to PostgreSQL
4. **Before Scale:** Add Redis for rate limiting and caching

---

*All critical code fixes have been applied. The app should now function correctly without crashing.*
