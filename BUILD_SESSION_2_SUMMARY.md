# 🦀 CLAW Build Session 2: AI Energy & Someday Pile

## What We Built

### 1. AI Energy Meter (The Monetization Hook) ✅

**Files Created:**
- `mobile/src/components/AIEnergyMeter.tsx` - Visual battery component
- `mobile/src/service/aiUsage.ts` - Usage tracking service

**What It Does:**
- Shows remaining AI-powered captures for the day (5 for free tier)
- Visual battery that depletes with each Gemini capture
- Pulsing animation when running low (≤1 left)
- "Upgrade" button appears when empty
- Resets at midnight UTC automatically

**User Experience:**
```
🧠 3/5 left today          [=====-----]
```

When empty:
```
🔴 AI Resting...           [----------]
The AI is resting. Using keyword mode.
[Upgrade to Pro for unlimited]
```

**Psychology:** Scarcity creates value. Users feel the constraint and want to upgrade.

### 2. Someday Pile (The Guilt-Free Zone) ✅

**Files Created:**
- `mobile/src/components/SomedayCard.tsx` - Aspirational item UI

**What It Does:**
- New toggle in Capture: "🔮 Someday" (purple, mutually exclusive with VIP)
- Items don't expire (10-year expiry = effectively never)
- Shows "marinade time": "Aged 8 months" / "Vintage 1 year"
- Monthly resurfacing: "Still curious about this?"

**User Experience:**
```
🔮 Learn Spanish
   Marinating for 8 months

[Let's do it!] [Next month] [Not anymore]
```

**Psychology:** 
- Removes guilt from aspirational captures
- "Bury it forever" gives closure (dopamine)
- "Let's do it!" converts to active item

### 3. Backend Updates ✅

**Files Modified:**
- `backend/app/services/categorization.py` - Added "someday" category
- `backend/app/api/v1/endpoints/claws.py` - Handle someday flag in capture

**Changes:**
- New `someday` field in CaptureRequest
- Someday items get 🔮 prefix and 10-year expiry
- Keywords: "learn", "someday", "eventually", "maybe", "one day"

## Integration Points

### CaptureScreen Changes:
1. Shows AI Energy Meter below tips
2. New toggle row: [⚡ VIP] [🔮 Someday] (mutually exclusive)
3. Tracks AI usage after each Gemini capture
4. Resets someday flag after capture

### Monetization Flow:
```
User captures item #6 (free tier = 5/day)
    ↓
AI Energy Meter shows "🔴 0/5 - AI Resting"
    ↓
Capture falls back to keyword categorization
    ↓
"Upgrade" button appears
    ↓
User taps Upgrade → Pro paywall
```

## Next Steps (Session 3)

1. **Streak Guardian Push** - "Strike something in 4 hours to keep your streak!"
2. **Vault Archaeologist** - Monthly surfacing of 3 random Someday items
3. **Shared Lists (Phase 2)** - The $2.99/mo Pro feature

## Test It

```bash
# 1. Install dependency (already done in Session 1)
cd mobile
npx expo install @react-native-community/netinfo

# 2. Start the app
npx expo start

# 3. Test AI Energy Meter:
#    - Capture 5 items with AI
#    - See battery deplete
#    - 6th capture falls back to keyword mode
#    - "Upgrade" button appears

# 4. Test Someday Pile:
#    - Capture "Learn Spanish" with "🔮 Someday" toggle
#    - Check Vault - should show 🔮 prefix
#    - Item should not show expiry countdown
```

---

**Two more pillars complete. The app now has:**
- ✅ Rock-solid offline-first foundation
- ✅ Dopamine loop (Oracle Moment)
- ✅ Monetization hook (AI Energy Meter)
- ✅ Guilt-free aspirational captures (Someday Pile)

**Ready for Session 3?**
