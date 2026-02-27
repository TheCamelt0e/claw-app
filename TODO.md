# 🦀 CLAW Master Todo List

> Generated: 2026-02-27
> Status: AI Integration Complete, Ready for Launch Prep

---

## 🔴 CRITICAL - DO FIRST (App Won't Work Without These)

### Phase 1: Critical Bug Fixes ✅ COMPLETED
- [x] Fix VaultScreen.tsx - Remove dead `renderClaw` function causing premature return
- [x] Add `is_vip` and `is_priority` to Claw interface in `store/clawStore.ts`
- [x] Fix `isVipClaw()` in `utils/vip.ts` to check backend `is_priority` field
- [x] Deduplicate backend code (user service, categorization service)
- [x] Fix CORS configuration (allow_credentials=false with wildcard origins)

### Phase 1.5: Security & Config
- [ ] Create `backend/.env` with actual GEMINI_API_KEY
- [ ] Install Gemini dependency: `pip install google-generativeai==0.3.2`
- [ ] Test backend starts without errors
- [ ] Run end-to-end test: capture → vault → strike flow

---

## 🟡 AI INTEGRATION - IMPLEMENTED ✅

### Phase 2: Basic AI (COMPLETED)
- [x] Create `mobile/src/service/ai.ts` with API client
- [x] Add rate limit error handling (429 detection)
- [x] Update `CaptureScreen.tsx` to call AI before saving
- [x] Add AI status indicator ("AI Thinking...", "AI Ready!", "AI offline")
- [x] Add fallback categorization when AI is unavailable
- [x] Show AI vs fallback source in success message

### Phase 3: Advanced AI Features (COMPLETED)
- [x] Enhanced Gemini Service with smart analysis
  - [x] Context extraction (who_mentioned, where, specific_item)
  - [x] Sentiment analysis (excited, curious, obligated, neutral)
  - [x] Smart expiry suggestion (perishables=3d, books=30d)
  - [x] Urgency detection (auto-suggests VIP for high urgency)
  - [x] Related items detection
  - [x] "Why capture" explanation
- [x] New API endpoints:
  - [x] `POST /ai/analyze` - Full smart analysis
  - [x] `POST /ai/find-related` - Find similar existing items
  - [x] `POST /ai/generate-reminder` - Contextual reminder text
  - [x] `GET /ai/suggest-expiry` - AI-suggested expiry days
- [x] Mobile UI updates:
  - [x] AI Analysis Result Modal with full breakdown
  - [x] Sentiment emoji display
  - [x] Urgency labels and colors
  - [x] "Make VIP" button from analysis modal
  - [x] Related items warning

---

## 🔧 BACKEND IMPROVEMENTS - CONNECT AI TO STORAGE

### Phase 4: Backend Actually Uses AI Data
- [ ] Update `POST /claws/capture` endpoint to:
  - [ ] Use `suggested_title` if AI provided it
  - [ ] Use `suggested_category` and `suggested_tags`
  - [ ] Use `suggested_expiry_days` instead of default 7
  - [ ] Auto-set `is_priority=true` if `ai_urgency=high` AND user didn't override
  - [ ] Store AI metadata: urgency, sentiment, why_capture, ai_context
- [ ] Update `Claw` model/database:
  - [ ] Add `urgency` column (low/medium/high)
  - [ ] Add `sentiment` column
  - [ ] Add `ai_context` JSON column
  - [ ] Add `ai_source` column (gemini/fallback)
  - [ ] Add `why_capture` text column
- [ ] Create Alembic migration for new columns
- [ ] Update `claw.to_dict()` to include AI fields

---

## 🧠 PSYCHOLOGICAL HOOKS (HABIT FORMATION)

### Gamification & Engagement
- [ ] **Strike Streak** - Track consecutive days with ≥1 strike
  - [ ] Add `streak_days` to User model
  - [ ] Show streak in ProfileScreen
  - [ ] Push notification: "Don't break your 3-day streak! 2 items expiring"
- [ ] **Daily Intention Weather** - 8am push notification
  - [ ] Light day: "🌧️ 2 items due — perfect morning to strike one"
  - [ ] Heavy day: "🔥 8 items! Pick the VIP one"
- [ ] **FOMO Language in AI Prompts**
  - [ ] Change AI prompt to generate more emotional "why_capture"
  - [ ] Current: "Friend recommended book"
  - [ ] New: "Sarah specifically said this changed her life — don't let this slip away"

---

## 💰 GROWTH & MARKETING ($475 Budget After Play Store)

### Tactic 1: Guerrilla QR Stickers ($150)
- [ ] Design 500 vinyl stickers
- [ ] Print with QR code linking to Play Store
- [ ] Deploy locations:
  - [ ] Bónus Laugavegur shopping carts
  - [ ] Krónan checkout counters
  - [ ] Hagkaup parking meters
  - [ ] Strandgatan light poles

### Tactic 2: Icelandic Reddit ($0)
- [ ] Create authentic post for r/Iceland, r/reykjavik
- [ ] Write as user story, not marketing
- [ ] Include: "ADHD brain", "goldfish memory", "made for myself"
- [ ] Respond to comments genuinely

### Tactic 3: Micro-Influencer Trade ($200)
- [ ] Identify 5 Icelandic micro-influencers (5k-20k)
  - [ ] Parenting bloggers
  - [ ] Bookstagrammers
  - [ ] Productivity accounts
- [ ] Pitch: Custom branded version for their audience
- [ ] Create unique referral codes

### Tactic 4: Café Table Tents ($125)
- [ ] Design table tents for 5 cafés
- [ ] Target: Kaffibarinn, Reykjavik Roasters, etc.
- [ ] Message: "While you're waiting for coffee..."

---

## ⚡ API RATE LIMITING (Protect 1500/day Quota)

### Local Caching Strategy
- [ ] Implement `ai-cache.ts` in mobile
  - [ ] 30-minute TTL on AI responses
  - [ ] Cache key: lowercase trimmed content
  - [ ] Check cache BEFORE calling API
- [ ] **"AI Cooldown" UI Pattern**
  - [ ] Track captures per 2-minute window
  - [ ] If > 3 captures: "AI catching breath... using smart fallback"
  - [ ] Use local keyword matching instead

### Backend Optimization
- [ ] **Fallback-First Strategy**
  - [ ] Run keyword matching locally first
  - [ ] Only call Gemini if confidence < 70%
- [ ] **Batch Analysis**
  - [ ] Queue offline captures
  - [ ] Batch 5 items into 1 API call
- [ ] **Per-User Daily Limit**
  - [ ] Track `ai_calls_today` in AsyncStorage
  - [ ] Limit: 5 AI calls/day per user
  - [ ] Message: "You've captured a lot today! 🎉 Using local brain."

---

## 🎨 UI/UX POLISH

### Capture Screen Enhancements
- [ ] Add "Quick Capture" widget for home screen (Android)
- [ ] Swipe gestures on capture input
- [ ] Haptic feedback patterns for different actions
- [ ] Better empty states with illustrations

### Vault Screen Improvements
- [ ] Filter by AI urgency (high/medium/low)
- [ ] Sort by "AI recommended to complete first"
- [ ] Show sentiment emoji on cards
- [ ] Related items grouping

### Strike Screen
- [ ] Smart ordering: AI suggests which to strike first
- [ ] "Why you captured this" reminder
- [ ] One-tap "Similar items" view

---

## 💎 FUTURE MONETIZATION (When API Costs Force It)

### Freemium Model Design
- [ ] **Free Tier** (current):
  - [ ] 5 AI categorizations/day
  - [ ] Basic geofencing (16 stores)
  - [ ] 50 active items
- [ ] **Pro Tier** ($2.99/month or $19.99/year):
  - [ ] Unlimited AI
  - [ ] Smart Resurfacing (AI learns completion patterns)
  - [ ] Shared family lists
  - [ ] Export to Google Calendar
  - [ ] Custom locations (add own stores)
  - [ ] Priority support

### Alternative: Affiliate Model
- [ ] Book captures → Amazon affiliate link
- [ ] Restaurant captures → DoorDash/food delivery affiliate
- [ ] Product captures → "Buy on Amazon" button

---

## 🧪 TESTING & QA

### Before Launch
- [ ] Test rate limiting (hit 15 RPM, verify 429 handling)
- [ ] Test offline mode (queue captures, sync when online)
- [ ] Test on 5 different Android devices
- [ ] Test geofencing at actual Bónus location
- [ ] Verify AI fallback works when Gemini is down

### Beta Testing
- [ ] Recruit 20 beta testers from personal network
- [ ] Create Telegram/WhatsApp group for feedback
- [ ] One-week sprint: capture 10 items/day each
- [ ] Collect feedback on AI accuracy

---

## 🚀 30-DAY LAUNCH TIMELINE

| Day | Task |
|-----|------|
| 1-2 | Complete Phase 4 (backend uses AI data) |
| 3 | Implement AI caching (30-min TTL) |
| 4 | Add "Strike Streak" gamification |
| 5 | Design & order QR stickers |
| 6 | Create Reddit accounts |
| 7 | Write & schedule Reddit post |
| 8-9 | Identify & contact micro-influencers |
| 10-12 | Build custom influencer versions |
| 13 | Design café table tents |
| 14 | Order table tents |
| 15 | **PLAY STORE LAUNCH** 🎉 |
| 16-20 | Deploy stickers & table tents |
| 21-25 | Influencer posts go live |
| 26-30 | Monitor, respond, iterate |

---

## 📊 SUCCESS METRICS

### Week 1 Goals
- [ ] 50 downloads
- [ ] 20 daily active users
- [ ] 100 captures total
- [ ] < 50% API quota used

### Month 1 Goals
- [ ] 300 downloads
- [ ] 100 daily active users
- [ ] 1000 captures total
- [ ] 20% day-7 retention

### Month 3 Goals (If Growing)
- [ ] 1000 downloads
- [ ] Decide: Pro tier vs. B2B pivot
- [ ] Evaluate paid API tier cost vs. revenue

---

## 📝 NOTES

- **API Limits**: 15 RPM, 1500 RPD = ~45k/month
- **Break-even**: At 500 users × 2 captures/day = 30k/month (✅ fits)
- **Danger zone**: 1000 users × 2 captures/day = 60k/month (❌ exceeds)
- **Iceland population**: 370k (1% = 3,700 users = API disaster without caching)

**Current Status**: AI integration complete. Next critical step is Phase 4 (backend actually stores AI data).
