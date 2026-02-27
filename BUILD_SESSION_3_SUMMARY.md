# 🦀 CLAW Build Session 3: Streak Guardian & Archaeologist

## What We Built

### 1. Streak Guardian (Loss Aversion Engine) ✅

**Files Created:**
- `mobile/src/service/streakGuardian.ts` - Push notification scheduler
- `mobile/src/components/StreakBanner.tsx` - In-app banner UI

**What It Does:**
Sends escalating notifications as streak expiration approaches (midnight UTC):

| Time Until Expiry | Notification | Tone |
|-------------------|--------------|------|
| 8 hours | "Your 5-day streak is doing great!" | Gentle |
| 4 hours | "Don't lose your progress!" | Urgent |
| 1 hour | "STREAK EXPIRES IN 1 HOUR!" | Panic |
| 15 min | "FINAL WARNING!" | Last chance |

**In-App Banner:**
- Shows in StrikeScreen when streak is at risk (< 8 hours)
- Color-coded: Green (gentle) → Yellow (urgent) → Red (critical)
- "Strike!" button when urgent
- Cancels all notifications when user strikes an item

**Psychology:** Loss aversion is 2x stronger than gain seeking. Users will open the app at 11:59 PM to avoid losing their streak.

### 2. Vault Archaeologist (Someday Resurfacing) ✅

**Files Created:**
- `mobile/src/components/ArchaeologistModal.tsx` - Monthly surfacing UI
- `mobile/src/service/archaeologist.ts` - Resurfacing logic

**What It Does:**
Once per month, surfaces 3 random Someday items:

```
🦀 The Archaeologist

You captured these 8 months ago. Still curious?

🔮 Learn Spanish (8 months old)
   [Let's do it!] [Next month] [X]

🔮 Read War and Peace (1 year old)
   [Let's do it!] [Next month] [X]

🔮 Travel to Japan (6 months old)
   [Let's do it!] [Next month] [X]

[Maybe later]
```

**Actions:**
- **Let's do it!** → Move to active list (convert to strikable)
- **Next month** → Dismiss, show again in 30 days
- **Not anymore** → Archive/delete with closure
- **Maybe later** → Hide all for 7 days

**Integration:**
- Added "Someday" filter to Vault
- Auto-shows on app launch (once per month)
- Shows purple 🔮 icon in Vault

### 3. Backend Integration ✅

**Files Modified:**
- `backend/app/api/v1/endpoints/claws.py` - Strike endpoint returns streak info

**Strike Response Now Includes:**
```json
{
  "message": "STRIKE! Great job!",
  "claw_id": "...",
  "streak": {
    "current_streak": 5,
    "longest_streak": 12,
    "new_milestones": ["7_day"]
  },
  "oracle_moment": true,  // If resurface_score > 0.7
  "resurface_score": 0.87
}
```

## The Complete Psychological Loop

```
User captures item
    ↓
AI Energy Meter depletes (scarcity)
    ↓
User strikes item
    ↓
Oracle Moment celebrates (if AI was right) → DOPAMINE
    ↓
Streak counter increases
    ↓
Streak Guardian schedules notifications
    ↓
8/4/1 hours before midnight → escalating alerts
    ↓
User opens app to save streak → HABIT FORMED
    ↓
Monthly: Archaeologist surfaces Someday items
    ↓
User converts aspirational capture → ENGAGEMENT
```

## Current State: MVP Complete! ✅

| Feature | Status |
|---------|--------|
| Transaction Ledger (offline-first) | ✅ |
| Oracle Moment (dopamine loop) | ✅ |
| AI Energy Meter (monetization) | ✅ |
| Someday Pile (guilt-free) | ✅ |
| Streak Guardian (retention) | ✅ |
| Vault Archaeologist (engagement) | ✅ |
| Smart Resurfacing | ✅ |
| Geofencing | ✅ |

## Next: Shared Lists (Phase 2) 🚀

This is the **$2.99/mo Pro feature**:
- Family/shared grocery lists
- Real-time sync (polling)
- "Who's near the store?" notifications
- "I got this" claim system

## Test Everything

```bash
cd mobile
npx expo start
```

1. **Streak Guardian:**
   - Set streak = 5, hoursUntilExpiry = 3 in StrikeScreen
   - See red banner with "Strike!" button
   - Strike an item → banner disappears

2. **Archaeologist:**
   - Add 3+ Someday items
   - Call `forceShowArchaeologist()` in console
   - See modal with "Let's do it!" / "Next month" / "Not anymore"

3. **Full Flow:**
   - Capture 6 items → AI Energy empties
   - Strike one with high resurface_score → Oracle Moment
   - Wait for streak notification → Open app → Strike → Streak saved

---

**The app is now psychologically bulletproof. Ready for Shared Lists?**
