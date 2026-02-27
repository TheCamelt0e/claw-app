# 📱 CLAW Mobile Build Guide

## Prerequisites

- Node.js 18+ installed
- Expo account (you have this: camelt0e)
- EAS CLI installed

## Quick Build Commands

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Build APK (Preview/Testing)
```bash
cd mobile
eas build --platform android --profile preview
```

### 4. Build AAB (Production/Play Store)
```bash
cd mobile
eas build --platform android --profile production
```

## Build Profiles

| Profile | Output | Use Case |
|---------|--------|----------|
| `preview` | APK | Internal testing, share with friends |
| `production` | AAB | Google Play Store submission |

## What Happens During Build

1. Expo validates your project
2. Installs dependencies
3. Runs Expo prebuild
4. Builds Android app in cloud
5. Provides download link when complete

## After Build

You'll get an email with the download link, or check:
https://expo.dev/accounts/camelt0e/projects/claw-app/builds

## Troubleshooting

### Build Fails: "Unable to resolve module"
- Make sure all imports are correct
- Run `npm install` in mobile directory

### Build Fails: "Invalid app.json"
- Check JSON syntax
- Verify projectId is correct

### Deep Links Not Working
- This is expected - deep links require additional configuration
- App works fine without them for now

## Project Info

- **Project ID**: 73bf8fd3-f59b-4544-a97d-e22b17bfb90c
- **Owner**: camelt0e
- **Slug**: claw-app
- **Expo SDK**: 50

## Need Help?

Check build logs at: https://expo.dev/accounts/camelt0e/builds
