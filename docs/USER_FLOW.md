# CLAW User Flow

## The Core Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CAPTURE PHASE                                  │
│                                                                          │
│   ┌─────────┐                                                            │
│   │  User   │  "That book Sarah mentioned about atomic habits"            │
│   └────┬────┘                                                            │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────────────────────────────────────┐                            │
│   │         CAPTURE SCREEN (3 sec)          │                            │
│   │  ┌─────────────────────────────────┐    │                            │
│   │  │  🎤 Voice  │  ⌨️ Text           │    │                            │
│   │  └─────────────────────────────────┘    │                            │
│   │                                          │                            │
│   │     [CLAW IT]  ──────────────────▶      │                            │
│   └─────────────────────────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI PROCESSING (Background)                       │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  OPENAI GPT-4 Analysis                                          │   │
│   │                                                                 │   │
│   │  Input: "That book Sarah mentioned about atomic habits"        │   │
│   │                                                                 │   │
│   │  Output:                                                        │   │
│   │    Title: "Atomic Habits by James Clear"                       │   │
│   │    Category: book                                              │   │
│   │    Action: buy                                                 │   │
│   │    Tags: [productivity, habits, reading]                       │   │
│   │    Context: "When browsing Amazon"                             │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STORAGE & TRIGGER SETUP                           │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  PostgreSQL Record                                               │   │
│   │                                                                 │   │
│   │  id: uuid                                                        │   │
│   │  content: "That book Sarah mentioned..."                        │   │
│   │  category: "book"                                               │   │
│   │  action_type: "buy"                                             │   │
│   │  app_trigger: "amazon"                                          │   │
│   │  expires_at: 2024-02-01 (7 days)                                │   │
│   │  status: "active"                                               │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│     VAULT SCREEN        │           │   RESURFACING ENGINE    │
│                         │           │      (Background)       │
│  📦 Your Claws          │           │                         │
│  ┌───────────────────┐  │           │  Monitoring:            │
│  │ Atomic Habits...  │  │           │  • Location changes     │
│  │ Expires in 7 days │  │           │  • App opens            │
│  │ [book] [buy]      │  │           │  • Time context         │
│  └───────────────────┘  │           │                         │
│                         │           │  Score: 0.0 → 1.0       │
└─────────────────────────┘           └─────────────────────────┘
                                                  │
                    ┌─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      RESURFACE PHASE (The Magic)                         │
│                                                                          │
│   3 days later...                                                        │
│                                                                          │
│   User opens Amazon app                                                  │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  RESURFACING ENGINE TRIGGERED                                    │   │
│   │                                                                  │   │
│   │  Context Check:                                                  │   │
│   │    ✓ User opened Amazon app                                      │   │
│   │    ✓ Claw has app_trigger = "amazon"                             │   │
│   │    ✓ Not resurfaced in last 4 hours                              │   │
│   │    ✓ Score: 0.95 (VERY HIGH)                                     │   │
│   │                                                                  │   │
│   │  ACTION: SURFACE CLAW                                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SURFACE SCREEN (Aha! Moment)                        │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  ⚡ RIGHT NOW                                                    │   │
│   │                                                                  │   │
│   │  ┌─────────────────────────────────────────────────────────┐    │   │
│   │  │  📱 While using Amazon                                   │    │   │
│   │  │                                                          │    │   │
│   │  │  "Atomic Habits by James Clear"                         │    │   │
│   │  │  (Sarah's recommendation)                               │    │   │
│   │  │                                                          │    │   │
│   │  │  [book]                                           🛒 BUY │    │   │
│   │  │                                                          │    │   │
│   │  │  Swipe right to STRIKE  │  Swipe left to RELEASE        │    │   │
│   │  └─────────────────────────────────────────────────────────┘    │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   User: "Holy shit, I've been meaning to buy this for 3 weeks!"        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ACTION PHASE                                     │
│                                                                          │
│   User taps "BUY" → Opens Amazon product page → Purchases book          │
│                                                                          │
│        │                                                                 │
│        ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  USER RETURNS TO CLAW                                           │   │
│   │                                                                  │   │
│   │  ┌─────────────────────────────────────────────────────────┐    │   │
│   │  │  🎯 STRIKE!                                              │    │   │
│   │  │                                                          │    │   │
│   │  │  Mark "Atomic Habits" as completed?                     │    │   │
│   │  │                                                          │    │   │
│   │  │     [YES, I DID IT!]        [Not yet]                   │    │   │
│   │  │                                                          │    │   │
│   │  └─────────────────────────────────────────────────────────┘    │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMPLETION & REWARD                                 │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  ✅ CLAW STRUCK!                                                │   │
│   │                                                                  │   │
│   │  +10 XP    Streak: 5 days    Total: 47 struck                   │   │
│   │                                                                  │   │
│   │  "Great job! You've completed more intentions this week         │   │
│   │   than 80% of CLAW users."                                      │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alternative Flows

### Flow: Release (Not Interested Anymore)
```
Surface Screen → Swipe Left → "Release this claw?" → Released 🕊️
```

### Flow: Extend (Need More Time)
```
Vault → Select Claw → [Extend] → +7 days → Expiry updated
```

### Flow: Share (Send to Friend)
```
Surface Screen → [Share] → Select Friend → Friend receives claw
```

### Flow: Expire (Auto-cleanup)
```
7 days pass → No action → Status: "expired" → Archived (not deleted)
```

## Key Metrics per Flow

| Step | Target Metric |
|------|---------------|
| Capture | <3 seconds |
| AI Processing | <2 seconds |
| Time to Resurface | Context-dependent |
| Strike Rate | >30% |
| Release Rate | <20% (indicates quality) |
| Average Lifetime | 3-5 days |

## Emotional Journey

```
Capture          Processing         Resurface          Action
  │                  │                  │                │
  ▼                  ▼                  ▼                ▼
┌─────┐          ┌─────┐           ┌─────┐          ┌─────┐
│ 😌  │          │ 😴  │           │ 🤩  │          │ 🎯  │
│ Easy│    →     │Wait │     →     │Aha! │    →     │Done!│
└─────┘          └─────┘           └─────┘          └─────┘
 Relief          Background         Surprise         Pride
```

---

**The Magic:** Context-aware resurfacing creates delight through surprise relevance.
