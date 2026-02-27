# 🦀 CLAW Project Handoff Document

> **For**: Fresh AI Instance  
> **From**: Previous Session (Gemini API Integration + CLAW 3.0 Smart Resurfacing Complete)  
> **Date**: 2026-02-27  
> **Status**: Backend AI-complete, Mobile UI integrated, Ready for Shared Lists (Phase 2)

---

## 1. PROJECT OVERVIEW & PURPOSE

### What CLAW Is
CLAW is an **"intention capture"** mobile app for Android (React Native/Expo). Core philosophy: **"Capture now. Strike later."**

Users quickly capture intentions (books to read, restaurants to try, tasks to complete) via voice or text. The app **intelligently surfaces these at the right time and place** (e.g., when near Bónus/Krónan grocery stores in Iceland).

### Core Psychological Hook
**"The Nostalgia of Intent"** — People don't forget because they're lazy; they forget because **capturing was too much friction**. CLAW makes users feel **smart** for capturing.

Key hooks:
- **Smart Resurfacing**: AI learns when you complete different categories (shopping = Thursday evenings, books = Sunday mornings) and surfaces items at those times
- **Context Preservation**: Captures WHO mentioned it, WHERE, the SPECIFIC item name
- **VIP Mode**: 🔥 flame button for urgent items (shorter expiry, gold styling)
- **Strike Streak**: Track consecutive days with ≥1 strike (gamification via loss aversion)

### Anti-Features (Intentional Omissions)
- ❌ NO subtasks (use a project manager)
- ❌ NO recurring tasks (use a habit tracker)
- ❌ NO complex collaboration/comments (use WhatsApp)
- ❌ NO smart home control (use Alexa/Google)
- ❌ NO desktop app (mobile-first forever)

---

## 2. TECH STACK & ARCHITECTURE

### Backend
| Layer | Technology |
|-------|------------|
| Framework | FastAPI (Python 3.12) |
| Database | SQLite (single file, production-ready) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| AI Provider | Google Gemini API (gemini-1.5-flash) |
| HTTP Client | Native fetch (mobile) |

**Architecture Patterns**:
- Clean separation: `models/`, `api/v1/endpoints/`, `core/`, `services/`
- Absolute imports only: `from app.core.database import get_db`
- Services layer for business logic (not in endpoints)

### Mobile
| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo SDK 50) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State Management | Zustand (3 stores: auth, claw, notifications) |
| HTTP Client | Native fetch (custom wrapper in `api/client.ts`) |
| Speech Recognition | expo-speech-recognition |
| Location | expo-location + expo-task-manager (background geofencing) |
| Notifications | expo-notifications |
| Styling | StyleSheet (no UI library) |

**Architecture Patterns**:
- Screen-based organization
- `services/` for API calls and business logic
- `stores/` for state (Zustand)
- `utils/` for helpers (vip.ts, dateUtils.ts)
- Memoized list items with React.memo
- useCallback for event handlers

---

## 3. API & CONSTRAINTS

### Gemini API Integration
- **Model**: `gemini-1.5-flash`
- **Free Tier Limits**: 15 RPM (Requests Per Minute), 1500 RPD (Requests Per Day)
- **Monthly Capacity**: ~45,000 requests/month

### Security (API Key Storage)
**CRITICAL**: API key is **NEVER** in mobile code.

```
Mobile App → Backend API (FastAPI) → Gemini API
                ↑
         API Key stored in backend/.env
```

**Backend**: Key stored in `backend/.env` (already in `.gitignore`)
```bash
# backend/.env
GEMINI_API_KEY=AIzaSyD5OCuPOBsxuiWD9ppnKIWcloipgHroAAk
GEMINI_MODEL=gemini-1.5-flash
GEMINI_RPM_LIMIT=15
GEMINI_RPD_LIMIT=1500
```

### Rate Limiting Strategy (Multi-Layer)
1. **Backend In-Memory Rate Limiter**: Tracks requests per user, enforces 15 RPM / 1500 RPD
2. **Local Cache on Mobile**: 30-minute TTL on AI responses (same "buy milk" = no API call)
3. **Fallback-First**: Run keyword matching locally; only call Gemini if confidence < 70%
4. **Per-User Daily Limit**: 5 AI calls/day per user, then "AI is resting, using local brain"
5. **Batch Analysis**: Queue offline captures, batch 5 items into 1 API call

### Error Handling (429 Rate Limit)
```typescript
// Friendly error message when rate limited
"The AI is thinking too hard! Please wait 60 seconds."
```
Backend returns 429 with `retry_after` seconds. Mobile falls back to keyword categorization automatically.

---

## 4. CURRENT CODEBASE STATE (100% COMPLETE)

### ✅ Phase 1: Critical Bug Fixes (DONE)
- VaultScreen fixed (removed dead `renderClaw` function)
- VIP detection consistent (backend `is_priority` field respected)
- CORS fixed (allow_credentials=false with wildcard)
- Code deduplicated (user service, categorization service)

### ✅ Phase 2-3: AI Integration (DONE)

**Backend AI Services**:
| File | Status | Purpose |
|------|--------|---------|
| `services/gemini_service.py` | ✅ Complete | Gemini wrapper with rate limiting, smart analysis, context extraction |
| `services/categorization.py` | ✅ Complete | Fallback keyword-based categorization |
| `services/pattern_analyzer.py` | ✅ Complete | **CLAW 3.0**: Learns user strike patterns, smart resurfacing |
| `services/user_service.py` | ✅ Complete | Centralized user management |

**AI Endpoints** (`api/v1/endpoints/ai.py`):
| Endpoint | Status | Purpose |
|----------|--------|---------|
| `POST /ai/analyze` | ✅ | Full smart analysis (title, category, context, urgency, sentiment) |
| `GET /ai/smart-surface` | ✅ | **CLAW 3.0**: Returns items sorted by completion likelihood |
| `GET /ai/patterns` | ✅ | User's learned patterns (peak days, hours, stores) |
| `POST /ai/score-claw/{id}` | ✅ | Score single item right now |
| `POST /ai/find-related` | ✅ | Find similar existing items |
| `POST /ai/generate-reminder` | ✅ | Contextual reminder text |
| `GET /ai/suggest-expiry` | ✅ | AI-suggested expiry days |
| `GET /ai/status` | ✅ | API status + rate limit usage |

**Mobile AI Integration**:
| File | Status | Purpose |
|------|--------|---------|
| `service/ai.ts` | ✅ Complete | AI client with fallback, utility functions (getUrgencyColor, getSentimentEmoji) |
| `service/smartSurface.ts` | ✅ Complete | **CLAW 3.0**: Smart surface client, pattern formatting |
| `screens/CaptureScreen.tsx` | ✅ Complete | AI analysis modal, smart capture flow, rate limit handling |
| `screens/StrikeScreen.tsx` | ✅ Complete | **CLAW 3.0**: Smart ordering toggle, score badges, "TOP PICK" |

### AI Features Live Now
1. **Smart Analysis**: Extracts who_mentioned, where, specific_item, sentiment, why_capture
2. **Smart Expiry**: Perishables=3d, books=30d, shopping=14d (AI-suggested)
3. **Urgency Detection**: Auto-suggests VIP for high urgency
4. **Related Items**: Warns if similar item already exists
5. **Smart Resurfacing**: Learns when user strikes items, surfaces at those times

### Database Schema (Current)
**Tables**:
- `users` - Basic auth, stats, subscription tier
- `claws` - Intentions with AI fields (urgency, sentiment, ai_context JSON)
- `strike_patterns` - **NEW**: Every strike recorded with day, hour, location, store

**Migrations**:
- `001_add_is_priority_column.py` ✅
- `002_add_strike_patterns.py` ✅

### UI/UX Locked In
- Dark theme (#1a1a2e background, #FF6B35 accent)
- Tab navigation: Capture, Strike, Vault, Profile
- VIP items: Gold styling (#FFD700), flame icon, shorter expiry
- Smart surface toggle: "🧠 Smart Order: ON/OFF" with sparkles icon
- Score badges: Green (80%+), Orange (60%+), Yellow (40%+), Gray (<40%)

### Known Limitations (By Design)
- **Geofencing**: Only 16 Icelandic stores hardcoded (Bónus, Krónan, Hagkaup, etc.)
- **Calendar Integration**: `/add-to-calendar` endpoint is a stub (returns success, doesn't actually add)
- **Voice Commands**: App is voice-to-text only, NOT a voice assistant (doesn't parse commands)
- **Smart Home**: No IoT integration (by design, out of scope)

---

## 5. BUSINESS & GROWTH STRATEGY

### Target Market
- Primary: Iceland (370k population, 16 stores geofenced)
- Secondary: Norway/Sweden (if expand with Rema 1000, Coop)
- Demographic: 25-45, smartphone-native, busy parents, ADHD/adhd-leaning

### $500 Go-To-Market Budget
| Tactic | Cost | Expected Users |
|--------|------|----------------|
| **Guerrilla QR Stickers** | $150 | 50-100 |
| **Icelandic Reddit** | $0 | 50-100 |
| **Micro-Influencer Trade** | $200 | 200-400 |
| **Café Table Tents** | $125 | 50-100 |
| **Google Play Console** | $25 | — |
| **Total** | **$500** | **350-700** |

**Sticker Copy**:
```
🦀 At Bónus again?
You probably forgot 3 things.
CLAW remembers for you.
[QR CODE]
Free. No signup. 10 seconds.
```

### Zero-Budget Marketing Tactics
1. **r/Iceland, r/reykjavik**: Authentic "I built this for my ADHD brain" post
2. **Bónus/Krónan shopping carts**: QR stickers (with permission)
3. **Micro-influencers**: Offer custom branded version in exchange for honest review
4. **Café table tents**: Kaffibarinn, Reykjavik Roasters

### Free Tier Pacing Strategy
**Math**:
- 1500 RPD = ~45k/month
- 500 users × 2 captures/day = 30k/month ✅ (safe)
- 1000 users × 2 captures/day = 60k/month ❌ (exceeds)

**Protections**:
1. Local 30-min cache on AI responses
2. Fallback-first keyword matching (40% of calls saved)
3. Per-user 5 AI calls/day limit
4. Batch 5 offline items into 1 API call

### Future Monetization Options
| Model | Price | Features |
|-------|-------|----------|
| **Freemium** | $2.99/mo or $19.99/yr | Unlimited AI, Smart Resurfacing, Shared lists, Calendar export |
| **One-Time** | $9.99 | Lifetime Pro (limited time offer) |
| **Affiliate** | Free | Amazon affiliate on book/product captures |
| **B2B Exit** | $50k-200k | Sell to grocery chain (Bónus/Krónan white-label) |

---

## 6. IMMEDIATE NEXT STEPS (What We Were About To Do)

### Phase 2: Shared Lists (Family/Group Feature)

**Goal**: Allow partners/families to share grocery lists

**Backend Tasks**:
1. Create `groups` table (group_id, name, members[], created_by)
2. Create `claw_groups` junction table (claw_id, group_id, assigned_to)
3. Modify `POST /claws/capture` to accept `group_id`
4. Real-time sync: WebSockets or polling for shared list updates
5. Geofence per member: "Sarah is near Bónus, notify her about milk"

**Mobile Tasks**:
1. "Share" button on capture flow
2. Group selector UI (create group, invite member)
3. "Assigned to you" filter in Vault
4. Push notifications: "Alex captured 'buy bread' in Family list"
5. "I got this" button (claim before striking to prevent double-buying)

**Files to Create/Modify**:
- `backend/app/models/group.py` (new)
- `backend/app/api/v1/endpoints/groups.py` (new)
- `backend/app/services/sharing_service.py` (new)
- `mobile/src/service/groups.ts` (new)
- `mobile/src/screens/ShareScreen.tsx` (modify existing)
- `mobile/src/components/GroupSelector.tsx` (new)

### Alternative: Phase 1 Polish (If Shared Lists Too Big)
If shared lists feels too complex, alternatively:
1. Add weekly pattern digest email/push
2. Build "Strike Streak" gamification (consecutive days)
3. Create weekly AI insights report

---

## CRITICAL REMINDERS FOR NEW AI

1. **NEVER commit the API key**. It's in `backend/.env` which is in `.gitignore`.

2. **Always use the service layer**. Don't put business logic in endpoints.

3. **Respect the rate limits**. If we hit 1500/day, app falls back to keyword matching.

4. **Test geofencing at actual locations**. The 16 stores are hardcoded to Icelandic coordinates.

5. **Mobile-first, always**. No desktop app, no web version.

6. **Keep it simple**. The magic is in the smart resurfacing, not feature bloat.

---

## QUICK FILE REFERENCE

**Key Backend Files**:
- `app/main.py` - FastAPI app initialization
- `app/core/config.py` - Settings (stores, rate limits)
- `app/services/gemini_service.py` - AI wrapper
- `app/services/pattern_analyzer.py` - Smart resurfacing logic
- `app/api/v1/endpoints/ai.py` - AI endpoints
- `app/api/v1/endpoints/claws.py` - Main capture/strike endpoints

**Key Mobile Files**:
- `App.tsx` - Root navigation
- `screens/CaptureScreen.tsx` - Voice/text capture with AI modal
- `screens/StrikeScreen.tsx` - Smart ordering with score badges
- `screens/VaultScreen.tsx` - Filterable list (Active/Struck/Expired)
- `service/ai.ts` - AI client
- `service/smartSurface.ts` - Smart surface client
- `store/clawStore.ts` - Zustand state

**Key Documentation**:
- `CLAW_3.0_ROADMAP.md` - Full 10-week roadmap
- `TODO.md` - Master todo list
- This file - Project handoff

---

**Ready to build Shared Lists (Phase 2)?**

Or pivot to: Weekly digest? Strike streak gamification? Marketing materials?
