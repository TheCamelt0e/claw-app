# Perfect CLAW - Testing Guide

## Pre-Build Checklist

### Backend
- [ ] All notification endpoints created
- [ ] Database models updated
- [ ] Router includes notifications

### Mobile
- [ ] StrikeScreen updated with new features
- [ ] Notifications service created
- [ ] Store updated with notification actions
- [ ] App.tsx initializes notifications

## Testing Steps

### 1. Backend API Test
```bash
# Start backend locally
cd backend
python -m uvicorn app.main_sqlite:app --reload

# Test endpoints:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=a@a.com&password=aaaaaa"

# Get token and test notifications:
curl http://localhost:8000/api/v1/notifications/smart-suggestions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test geofence:
curl -X POST http://localhost:8000/api/v1/notifications/check-geofence \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": 64.1466, "lng": -21.9426}'
```

### 2. Mobile Features Test

#### Smart Suggestions
1. Open Strike tab
2. Check for suggestion cards at top
3. Tap suggestion → Should navigate to Capture

#### Store Alerts
1. Add item: "Buy milk at Bónus"
2. Check store banner appears in Strike tab
3. Shows "1 shopping item ready"

#### Alarms
1. Tap alarm icon (⏰) on any item
2. Select time (1h, 2h, 4h, 8h, 24h)
3. Notification should schedule

#### Calendar
1. Tap calendar icon (📅) on any item
2. Should show "Calendar Event Created" notification
3. Event tracked in backend

#### Geofence (Testing)
1. Enable location permissions
2. Simulate location near Bónus: 64.1466, -21.9426
3. Should trigger notification

### 3. Database Verification

```sql
-- Check tables exist
.tables

-- Should see:
-- alarms
-- calendar_events  
-- push_tokens
-- claws
-- users

-- Check alarms
SELECT * FROM alarms WHERE user_id = 'YOUR_USER_ID';
```

## Expected Behavior

### Smart Suggestions
- Morning (7-9am): "Good morning! Start your day by capturing..."
- Evening (6-9pm): "Evening review - You have X active intentions"
- Weekend: "Weekend plans - Capture your weekend intentions"

### Store Alerts
- Triggers within 200m of Bónus/Krónan/etc
- Only if user has shopping-related items
- Notification: "You're near Bónus. You have X items on your shopping list"

### Alarms
- Local notification at scheduled time
- Shows: "⏰ CLAW Reminder: [item content]"
- Stored in backend for persistence

## Troubleshooting

### Notifications not showing
1. Check permissions in device settings
2. Verify `expo-notifications` is installed
3. Check backend `/notifications/all-checks` endpoint

### Geofence not triggering
1. Verify location permission granted
2. Check GPS is enabled
3. Test with exact coordinates from `ICELANDIC_STORES` list

### Smart suggestions not appearing
1. Check user has patterns recorded
2. Verify time of day matches patterns
3. Check `/notifications/smart-suggestions` response

## Deployment Checklist

- [ ] Backend pushed to Render
- [ ] Database migrated (tables auto-create)
- [ ] Mobile APK built via EAS
- [ ] Test account working (a@a.com / aaaaaa)
- [ ] All features tested on device
