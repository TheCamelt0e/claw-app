# 🦀 CLAW 3.0 ROADMAP

> "The Universal Capture Layer"

---

## PHILOSOPHY

CLAW 3.0 is not a todo app. It's an **intention archive** that:
1. Captures frictionlessly (voice, photo, text)
2. Understands context (who, where, when, why)
3. Surfaces at the right moment (smart resurfacing)
4. Integrates with your existing tools (export, don't replace)

**Anti-features**: No subtasks, no recurring, no complex collaboration.

---

## PHASE 1: FOUNDATION (Weeks 1-2)

### 1.1 Smart Resurfacing Core
**Goal**: Learn when users actually complete things

Backend:
- [ ] Add `strike_patterns` table (user_id, category, day_of_week, hour, location)
- [ ] Track every strike: timestamp, location, category
- [ ] Build pattern analyzer: "User strikes shopping items Thu 6-8pm near stores"
- [ ] API: `GET /claws/smart-surface` - returns items sorted by predicted completion time

Mobile:
- [ ] Update StrikeScreen to use smart ordering
- [ ] Show "CLAW thinks you'll do this Thursday evening" badge
- [ ] Confidence score: "80% likely you'll strike this today"

### 1.2 Enhanced AI Prompts
**Goal**: Better context extraction for resurfacing

- [ ] Update Gemini prompt to extract:
  - `ideal_time`: morning/afternoon/evening/weekend
  - `ideal_location`: specific store types
  - `deadline_pressure`: is there an actual deadline?
- [ ] Store these in `ai_context` JSON

---

## PHASE 2: SHARED LISTS (Weeks 3-4)

### 2.1 Family/Group Sharing
**Goal**: Shared grocery lists that actually work

Backend:
- [ ] Add `groups` table (family_id, name, members[])
- [ ] Add `claw_groups` junction table
- [ ] Modify capture: can assign to group
- [ ] Real-time sync: WebSockets or polling
- [ ] Geofence per member: "Sarah is near Bónus, notify her about milk"

Mobile:
- [ ] New "Share" button on capture
- [ ] Group selector UI
- [ ] "Assigned to you" filter in Vault
- [ ] Push: "Alex captured 'buy bread' in Family list"

### 2.2 Claim System
- [ ] When someone strikes a shared item, it disappears for everyone
- [ ] "I got this" button before striking (prevents double-buying)

---

## PHASE 3: THE SOMEDAY PILE (Week 5)

### 3.1 Non-Urgent Intentions
**Goal**: Separate "do soon" from "do eventually"

Backend:
- [ ] New status: `someday` (doesn't expire, no pressure)
- [ ] Monthly resurfacing: surface 3 Someday items on 1st of month
- [ ] AI categorizes capture as "someday_candidate" if vague/no urgency

Mobile:
- [ ] New filter tab: "Someday" (next to Active/Struck/Expired)
- [ ] Different styling: muted colors, no expiry countdown
- [ ] "Move to Active" button (promote when ready)

---

## PHASE 4: PHOTO CAPTURE (Weeks 6-7)

### 4.1 Visual Memory
**Goal**: Capture things you see

Backend:
- [ ] Store images (S3/Cloudinary or local storage)
- [ ] Integrate Google Vision API OR Gemini Vision
- [ ] Extract: objects, text (OCR), brand names
- [ ] Link to existing claws: "You photographed something similar 3 months ago"

Mobile:
- [ ] Camera button on CaptureScreen
- [ ] Photo preview with AI-generated description
- [ ] Gallery view in Vault

---

## PHASE 5: INTEGRATIONS (Week 8)

### 5.1 Export to External Tools
**Goal**: Play nice with existing ecosystems

- [ ] Google Calendar: "Add to Calendar" button
- [ ] Todoist/AnyList: Export shopping items
- [ ] Goodreads: Export book captures
- [ ] Spotify: Export music recommendations
- [ ] Copy to clipboard: raw text export

### 5.2 Share Extension
- [ ] iOS/Android share sheet: "Share to CLAW" from any app
- [ ] Auto-categorize shared URLs (Amazon = product, YouTube = watch)

---

## PHASE 6: VOICE MEMOS (Week 9)

### 6.1 Audio Retention
**Goal**: Keep the original audio, not just transcription

Backend:
- [ ] Store audio files (compressed, 30s max)
- [ ] Transcription stored separately
- [ ] API: stream audio file

Mobile:
- [ ] Playback button on claws with audio
- [ ] Waveform visualization (optional eye candy)
- [ ] "Confused by the text? Listen to original"

---

## PHASE 7: WEEKLY DIGEST (Week 10)

### 7.1 AI Insights
**Goal**: Help users understand their patterns

Backend:
- [ ] Weekly cron job (Sundays 6pm)
- [ ] Generate stats: captured, struck, expired, by category
- [ ] AI generates personalized insights
- [ ] Push notification with digest

Mobile:
- [ ] Full-screen weekly report
- [ ] Charts: capture vs strike rate, category breakdown
- [ ] Gentle suggestions: "You capture books but rarely read them. Want to pause book suggestions?"

---

## TECHNICAL CONSIDERATIONS

### Rate Limits & Costs
- Smart Resurfacing: 0 API calls (uses existing data)
- Photo Vision: ~500 calls/day max (expensive, cache aggressively)
- Weekly Digest: 1 call per user per week

### Database Growth
- Strike patterns: ~50 rows per user per year
- Photos: Storage concern (compress, maybe delete after 90 days)
- Audio: Same (transcription is enough long-term)

### Privacy
- Strike patterns: Sensitive location data (hash/store minimally)
- Shared lists: End-to-end encryption for family data?
- Photos: Don't send to cloud if user opts out

---

## SUCCESS METRICS

### Phase 1
- [ ] 30% of strikes happen at predicted time/location
- [ ] Users open app 3x/week (habit formation)

### Phase 2  
- [ ] 20% of users create shared lists
- [ ] Shared items have 2x strike rate (accountability)

### Phase 3
- [ ] 40% of captures are "someday" (lower pressure)
- [ ] Users promote 10% of someday to active monthly

### Phase 4+
- [ ] Photo capture used by 15% of users
- [ ] 5% of users export to external tools weekly

---

## WHAT WE'RE NOT BUILDING

❌ Recurring tasks (use a habit tracker)
❌ Subtasks (use a project manager)
❌ Real-time chat (use WhatsApp)
❌ Smart home control (use Alexa/Google)
❌ Desktop app (mobile-first forever)

---

Ready to start **Phase 1.1: Smart Resurfacing**?
