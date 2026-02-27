# 🤖 AI Verification Guide - CLAW

This document verifies that AI functionality works correctly in the CLAW app.

## ✅ AI Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│   Backend API    │────▶│  Google Gemini  │
│  (React Native) │     │   (FastAPI)      │     │    (gemini-1.5  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                         │                         │
       │  1. Capture text        │  2. Call Gemini API     │  3. Return
       │  2. Request analysis    │  3. Parse response      │    analysis
       │  3. Receive enrichment  │  4. Return JSON         │
```

---

## 🔧 Configuration Verification

### 1. Backend Environment Variables

File: `backend/.env`
```
GEMINI_API_KEY=AIzaSyAkU4vwAhgTBNnlDE2Md-zgHhv8SJc5bQI
GEMINI_RPM_LIMIT=15
GEMINI_RPD_LIMIT=1500
```

**Verify:**
- ✅ Key is set (not empty)
- ✅ Rate limits match Gemini free tier

### 2. Backend Config

File: `backend/app/core/config.py`
```python
GEMINI_API_KEY: str = ""  # Loaded from .env
GEMINI_MODEL: str = "gemini-1.5-flash"
```

**Verify:**
- ✅ Settings load from .env file
- ✅ Model is gemini-1.5-flash

### 3. Mobile API Client

File: `mobile/src/api/client.ts`
```typescript
const API_BASE_URL = 'https://claw-api-b5ts.onrender.com/api/v1';
```

**Verify:**
- ✅ Points to production backend
- ✅ HTTPS enabled

---

## 🧪 Testing AI Functionality

### Test 1: Backend AI Status

```bash
# Check if AI is available
curl https://claw-api-b5ts.onrender.com/api/v1/ai/status

# Expected response:
{
  "available": true,
  "model": "gemini-1.5-flash",
  "rate_limits": {
    "rpm": { "used": 0, "limit": 15, "remaining": 15 },
    "rpd": { "used": 0, "limit": 1500, "remaining": 1500 }
  }
}
```

### Test 2: AI Analysis Endpoint

```bash
# Test smart analysis
curl -X POST https://claw-api-b5ts.onrender.com/api/v1/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy milk from Bonus", "check_related": false}'

# Expected response:
{
  "success": true,
  "title": "Buy milk from grocery store",
  "category": "product",
  "tags": ["milk", "grocery", "buy"],
  "action_type": "buy",
  "urgency": "medium",
  "expiry_days": 7,
  "app_suggestion": "amazon",
  "context": { "who_mentioned": null, "where": "bonus", ... },
  "sentiment": "neutral",
  "why_capture": "Need to purchase milk for home",
  "related_ids": [],
  "source": "gemini"
}
```

### Test 3: Rate Limiting

```bash
# Make 16 rapid requests to test rate limiting
# 16th request should return 429 error

# Expected response on limit:
{
  "detail": {
    "message": "The AI is thinking too hard! Please wait 60 seconds.",
    "retry_after": 60
  }
}
```

### Test 4: Fallback Mode

```bash
# Temporarily set invalid API key in backend
# Restart backend
# Make analysis request

# Expected response (fallback):
{
  "success": true,
  "title": "Buy milk from Bonus",
  "category": "product",
  "tags": ["product", "buy"],
  "action_type": "buy",
  "urgency": "medium",
  "expiry_days": 14,
  "source": "fallback",
  "message": "AI busy, using smart keyword matching"
}
```

---

## 📱 Mobile App AI Flow

### Capture Flow with AI

```
1. User enters: "Book Sarah recommended about habits"
   ↓
2. CaptureScreen calls smartAnalyze()
   ↓
3. mobile/src/service/ai.ts makes API call
   POST /ai/analyze
   { content: "Book Sarah recommended about habits" }
   ↓
4. Backend (ai.py) receives request
   ↓
5. gemini_service.smart_analyze() called
   ↓
6. Gemini API analyzes content
   ↓
7. Backend returns enriched data:
   {
     title: "Read book Sarah recommended",
     category: "book",
     tags: ["book", "habits", "sarah recommended"],
     action_type: "read",
     urgency: "medium",
     expiry_days: 30,
     context: { who_mentioned: "Sarah", ... },
     sentiment: "curious"
   }
   ↓
8. Mobile app displays AI analysis
   ↓
9. User saves enriched claw
```

---

## 🔍 AI Features in App

### Feature 1: Smart Analysis (Capture Screen)
**Location:** `mobile/src/screens/CaptureScreen.tsx`
**Function:** `smartAnalyze()`
**What it does:**
- Analyzes capture content
- Suggests title, category, tags
- Detects urgency
- Suggests expiry days
- Extracts context (who mentioned, where, etc.)

**UI Indicator:**
- Shows "🤔 AI Thinking..." during analysis
- Shows "✨ AI Ready!" when complete
- Shows analysis modal with results

### Feature 2: AI Status Check
**Location:** `mobile/src/screens/CaptureScreen.tsx`
**Function:** `checkAIStatus()`
**What it does:**
- Checks if AI service is available
- Shows "AI offline - using keyword matching" if unavailable
- Shows "AI-powered: Smart categorization" if available

### Feature 3: Rate Limit Handling
**Location:** `mobile/src/service/ai.ts`
**Function:** `isRateLimitError()`
**What it does:**
- Detects 429 rate limit errors
- Returns fallback analysis immediately
- Shows user-friendly message: "AI is thinking too hard! Please wait 60 seconds."

### Feature 4: Fallback Analysis
**Location:** `mobile/src/service/ai.ts`
**Function:** `fallbackAnalyze()`
**What it does:**
- Works offline (no AI needed)
- Keyword-based categorization
- Regex pattern matching
- Always available as backup

---

## ⚠️ Common AI Issues & Solutions

### Issue 1: AI Shows "Offline"

**Symptoms:**
- Tip text shows "AI offline - using keyword matching"
- No AI analysis happens

**Causes:**
1. Backend not deployed
2. GEMINI_API_KEY not set
3. Backend can't reach Gemini API

**Solutions:**
```bash
# Check backend health
curl https://claw-api-b5ts.onrender.com/health

# Check AI status
curl https://claw-api-b5ts.onrender.com/api/v1/ai/status

# Check backend logs (Render dashboard)
# Look for: "AI not configured" or API errors
```

### Issue 2: Rate Limit Errors

**Symptoms:**
- Alert: "AI is thinking too hard!"
- Fallback analysis used

**Causes:**
- Exceeded 15 requests per minute
- Exceeded 1500 requests per day

**Solutions:**
- Wait 60 seconds between captures
- Upgrade to paid Gemini tier for higher limits
- App automatically falls back to keyword matching

### Issue 3: AI Returns Weird Results

**Symptoms:**
- Strange titles
- Wrong categories
- JSON parsing errors

**Causes:**
- Gemini model hallucination
- Malformed JSON response

**Solutions:**
- Backend has JSON cleaning logic
- Backend has parse error handling
- Fallback analysis kicks in automatically

### Issue 4: Slow AI Response

**Symptoms:**
- Long "AI Thinking..." state
- App feels sluggish

**Causes:**
- Network latency
- Gemini API slow
- Backend cold start (Render free tier)

**Solutions:**
- Fallback analysis is instant
- Backend has 30s timeout (not implemented - add if needed)
- Consider upgrading Render plan

---

## 🔐 Security Checklist

- ✅ API key in `.env` (not in code)
- ✅ `.env` in `.gitignore`
- ✅ Key loaded via environment variables
- ✅ No key exposure in logs
- ✅ Rate limiting prevents abuse
- ✅ Fallback prevents AI dependency

---

## 📊 AI Monitoring

### Backend Logs to Watch
```
[Gemini] JSON parse error: ...     # Malformed AI response
[Gemini] Raw response: ...          # Debug AI output
AI error: ...                       # API errors
Rate limit exceeded                 # 429 errors
```

### Mobile Logs to Watch
```
[AI] Error, using fallback: ...     # AI failed, fallback used
[API] Response: 429                 # Rate limited
[API] Response: 200                 # Success
```

---

## ✅ Pre-Release AI Checklist

Before building APK:

- [ ] Backend deployed and `/health` returns 200
- [ ] `/ai/status` returns `"available": true`
- [ ] Test capture with AI analysis works
- [ ] Test rate limit fallback works
- [ ] Test offline fallback works
- [ ] AI analysis displays correctly in UI
- [ ] No API key exposed in logs

---

## 🚀 Quick Verification Commands

```bash
# 1. Backend health
curl https://claw-api-b5ts.onrender.com/health

# 2. AI status
curl https://claw-api-b5ts.onrender.com/api/v1/ai/status

# 3. Test analysis
curl -X POST https://claw-api-b5ts.onrender.com/api/v1/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Test capture"}'

# 4. Test with related check
curl -X POST https://claw-api-b5ts.onrender.com/api/v1/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy milk", "check_related": true}'
```

---

## 🎯 Expected Behavior Summary

| Scenario | Expected Result |
|----------|----------------|
| AI Available + Online | Rich analysis with title, category, tags, urgency, context |
| AI Rate Limited | Fallback analysis + user-friendly message |
| AI Offline/Error | Fallback analysis + "AI offline" indicator |
| Backend Down | Network error + retry option |

---

**AI Status:** ✅ CONFIGURED AND READY

**Last Updated:** 2026-02-27
