# 📱 CLAW Build Guide

Complete guide for building the CLAW mobile app for Android.

## Prerequisites

1. **Node.js 18+** installed
2. **Expo CLI** installed globally: `npm install -g expo-cli`
3. **EAS CLI** installed globally: `npm install -g eas-cli`
4. **Expo Account** - Sign up at https://expo.dev

## Quick Start

### Option 1: Build Preview APK (For Testing)

```bash
# Run the build script
BUILD_APK_PRODUCTION.bat

# Select option [1] for Preview APK
```

### Option 2: Manual Build Commands

```bash
cd mobile

# Login to Expo (first time only)
npx eas login

# Build Preview APK
npx eas build --platform android --profile preview

# Build Production AAB (Play Store)
npx eas build --platform android --profile production
```

## Build Profiles

### Preview Build (APK)
- **Purpose**: Internal testing
- **Output**: APK file
- **Distribution**: Direct download
- **Command**: `npx eas build --platform android --profile preview`

### Production Build (AAB)
- **Purpose**: Google Play Store
- **Output**: Android App Bundle
- **Distribution**: Play Store
- **Command**: `npx eas build --platform android --profile production`

## Build Configuration

### eas.json
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### app.json Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `android.package` | `com.claw.app` | Unique app identifier |
| `version` | `1.0.0` | App version |
| `android.versionCode` | `1` | Internal version for Play Store |

## Environment Setup

### 1. Verify API Configuration

Check `mobile/src/api/client.ts`:
```typescript
const API_BASE_URL = PRODUCTION_API_URL;  // For production builds
```

### 2. Verify Permissions

Check `mobile/app.json` for required permissions:
- `RECORD_AUDIO` - Voice capture
- `ACCESS_FINE_LOCATION` - Geofencing
- `POST_NOTIFICATIONS` - Push notifications
- `VIBRATE` - Haptic feedback

### 3. Check Assets

Ensure these files exist in `mobile/assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1242x2436)
- `adaptive-icon.png` (1024x1024)
- `notification-icon.png` (96x96)

## Build Process

### Step-by-Step

1. **Install Dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Verify TypeScript**
   ```bash
   npx tsc --noEmit
   ```

3. **Start Build**
   ```bash
   npx eas build --platform android --profile preview
   ```

4. **Monitor Build**
   - Watch progress at: https://expo.dev/accounts/camelt0e/projects/claw-app/builds
   - Build typically takes 10-15 minutes

5. **Download APK**
   - Build completes → Download link provided
   - Or use: `npx eas build:download`

## Installation

### On Android Device

1. Enable "Install from Unknown Sources" in Settings
2. Transfer APK to device
3. Tap APK to install
4. Grant requested permissions

### Using ADB

```bash
# Install via USB debugging
adb install -r claw-app.apk

# Launch app
adb shell monkey -p com.claw.app -c android.intent.category.LAUNCHER 1
```

## Troubleshooting

### Build Failures

| Issue | Solution |
|-------|----------|
| `EAS project not configured` | Run `npx eas init` |
| `Login required` | Run `npx eas login` |
| `Asset not found` | Check files in `mobile/assets/` |
| `TypeScript errors` | Run `npx tsc --noEmit` to check |

### App Crashes

| Issue | Solution |
|-------|----------|
| `Network error` | Check API URL in client.ts |
| `Permission denied` | Grant all permissions in Settings |
| `White screen` | Check console for JS errors |

### Update Build

```bash
# Increment version
# Edit mobile/app.json:
# "version": "1.0.1"
# "android.versionCode": 2

# Rebuild
npx eas build --platform android --profile preview
```

## Build Checklist

Before building, verify:

- [ ] All changes committed to git
- [ ] API URL points to production
- [ ] Version number incremented
- [ ] Assets are optimized
- [ ] Permissions are correct in app.json
- [ ] TypeScript compiles without errors
- [ ] Design system components work

## Post-Build

### Download Build

```bash
# Download latest build
npx eas build:download

# Or download specific build
npx eas build:download --id BUILD_ID
```

### Share for Testing

1. Go to https://expo.dev/accounts/camelt0e/projects/claw-app/builds
2. Find your build
3. Share the QR code or download link
4. Testers can scan QR to install directly

## Next Steps

After successful build:
1. Test on physical device
2. Verify all features work
3. Check voice capture
4. Test geofencing
5. Submit to Play Store (if production)

## Support

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Build Dashboard**: https://expo.dev/accounts/camelt0e/projects/claw-app/builds
