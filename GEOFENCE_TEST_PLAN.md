# 🗺️ CLAW Geofencing Test Plan

## Prerequisites
- [ ] APK installed on physical Android device
- [ ] Location permissions granted (Always Allow)
- [ ] Backend deployed OR local server running with ngrok

---

## Test 1: Basic Location Permission

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open CLAW app | App launches, dark theme loads |
| 2 | Navigate to Profile → Permissions | Location permission status shown |
| 3 | Tap "Request Location" | System dialog appears |
| 4 | Select "Allow all the time" | Status updates to "Granted" |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 2: Manual Location Capture

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Capture screen | Microphone and text input visible |
| 2 | Speak: "Buy milk at Bónus" | Voice recognized, text appears |
| 3 | Wait for AI analysis | Category: "grocery", Context detected |
| 4 | Check location tag | Current coordinates captured |
| 5 | Save the Claw | Item appears in Vault |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 3: Geofence Trigger (CRITICAL)

> ⚠️ **Requires being near an Icelandic store OR manually simulating location**

### Option A: Physical Visit (Iceland)
1. Create a Claw: "Buy eggs at Bónus"
2. Walk/drive to within 200m of a Bónus store
3. **Expected**: Push notification received: "📍 You're near Bónus - Buy eggs?"

### Option B: Fake GPS App (Testing)
1. Install "Fake GPS Location" app
2. Set mock location to: `64.1466, -21.9426` (Bónus Hallveigarstígur)
3. Create a Claw with store context
4. Enable mock location
5. **Expected**: Notification triggered within 2-5 minutes

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 4: Background Location Persistence

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create 3 grocery items | All saved to Vault |
| 2 | Minimize app (home button) | App in background |
| 3 | Use other apps for 10 min | No crash, no excessive battery drain |
| 4 | Check notification shade | No "CLAW is using your location" warning |
| 5 | Travel 500m+ | Location updates in background |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 5: Battery Optimization

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Android Settings → Battery → App Usage | CLAW listed |
| 2 | Check background activity | "Allow background activity" = ON |
| 3 | Use app for 2 hours | Battery usage < 5% |
| 4 | Check for "App is running" notification | Not persistently showing |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 6: Offline Behavior

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable Airplane Mode | No network |
| 2 | Create a Claw | Saved locally (SyncStatus shows "pending") |
| 3 | Disable Airplane Mode | Auto-sync within 5 seconds |
| 4 | Check Vault | Claw appears with server ID |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Test 7: Strike & Streak Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find an active Claw | In Strike screen |
| 2 | Tap "Strike" | Haptic feedback, celebration animation |
| 3 | Check Profile screen | Streak count increased |
| 4 | Check notifications | Streak Guardian scheduled for tomorrow |

**Status**: ⬜ PASS / ⬜ FAIL

---

## Known Limitations

| Issue | Workaround |
|-------|------------|
| Geofencing may not trigger on some Chinese OEMs (Xiaomi, Oppo) | Manually enable "Auto-start" in phone settings |
| Battery optimization kills background location | Add CLAW to "Never sleeping apps" |
| Mock location detection | Disable "Mock locations" in Developer Options for production |

---

## Test Results Summary

| Test | Result | Notes |
|------|--------|-------|
| 1. Location Permission | ⬜ | |
| 2. Manual Capture | ⬜ | |
| 3. Geofence Trigger | ⬜ | |
| 4. Background Persistence | ⬜ | |
| 5. Battery Optimization | ⬜ | |
| 6. Offline Behavior | ⬜ | |
| 7. Strike & Streak | ⬜ | |

---

**Tester**: _______________  
**Date**: _______________  
**Device Model**: _______________  
**Android Version**: _______________
