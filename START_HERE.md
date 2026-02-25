# 🦖 CLAW - Start Here!

## Quick Summary

You now have a **complete working MVP** for CLAW - the Intention Archive app. Here's what to do:

---

## Step 1: Start the Backend (2 minutes)

**Option A: Windows (Double-click)**
```
Double-click: backend\run_windows.bat
```

**Option B: Command Line**
```bash
cd backend
py run_sqlite.py
```

**You should see:**
```
🦖 Starting CLAW API (SQLite version)
==================================================
API will be available at: http://localhost:8000
Interactive docs at: http://localhost:8000/docs
==================================================
```

---

## Step 2: Test It (1 minute)

**Option A: Windows (Double-click)**
```
Double-click: backend\test_windows.bat
```

**Option B: Command Line**
```bash
cd backend
py test_api.py
```

**You should see:**
- ✅ Health check passed
- ✅ Demo data created
- ✅ Claws captured
- ✅ AI categorization working
- ✅ Surface endpoint returning relevant claws

---

## Step 3: Try the Interactive Docs

Open your browser: **http://localhost:8000/docs**

This is Swagger UI - you can:
- See all available endpoints
- Test API calls with a click
- View request/response schemas

Try these:
1. Expand `POST /api/v1/claws/capture`
2. Click "Try it out"
3. Enter content: "Buy milk from Whole Foods"
4. Click "Execute"
5. See the AI categorize it!

---

## What You Can Test Right Now

### 1. Capture Intentions
```
POST /api/v1/claws/capture
Content: "That book about habits Sarah mentioned"
```
**Result:** AI auto-categorizes as "book", action "buy", app trigger "amazon"

### 2. View Your Vault
```
GET /api/v1/claws/me
```
**Result:** List of all your captured intentions

### 3. Test Smart Resurfacing
```
GET /api/v1/claws/surface?active_app=amazon
```
**Result:** Returns book/product claws when "opening Amazon"

```
GET /api/v1/claws/surface?active_app=netflix
```
**Result:** Returns movie claws when "opening Netflix"

### 4. Strike (Complete)
```
POST /api/v1/claws/{id}/strike
```
**Result:** Mark as done, get satisfaction!

---

## Project Structure (What's Included)

```
ClawNytt/
├── 📁 backend/              ← FastAPI server (RUN THIS)
│   ├── run_sqlite.py        ← Start here!
│   ├── test_api.py          ← Test script
│   ├── run_windows.bat      ← Double-click to run
│   ├── test_windows.bat     ← Double-click to test
│   └── app/
│       ├── main_sqlite.py   ← FastAPI app
│       └── api/v1/endpoints_sqlite/claws.py ← Core logic
│
├── 📁 mobile/               ← React Native app (OPTIONAL)
│   └── src/screens/         ← Capture, Surface, Vault screens
│
├── 📁 docs/                 ← Business docs
│   ├── BUSINESS_PLAN.md     ← $2M seed plan
│   └── PITCH_DECK.md        ← Investor deck
│
└── README.md                ← Full documentation
```

---

## The "Aha!" Demo to Show Friends

1. **Start the server**: `py run_sqlite.py`
2. **Create demo data**: Visit http://localhost:8000/api/v1/claws/demo-data
3. **Capture**: "That book Sarah mentioned about atomic habits"
4. **Show vault**: See it categorized as "book" with Amazon trigger
5. **Simulate**: Open http://localhost:8000/api/v1/claws/surface?active_app=amazon
6. **Magic**: The book appears! "This is exactly what I'd forget for weeks!"

---

## Next Steps (After Testing)

### Immediate (Today)
- [ ] ✅ Verify backend runs
- [ ] ✅ Test all API endpoints
- [ ] ✅ Show a friend the demo

### This Week
- [ ] Install Node.js and test mobile app
- [ ] Customize AI prompts for better categorization
- [ ] Add more context triggers (time, location)

### This Month
- [ ] Deploy backend to Railway/Render (free)
- [ ] Build and share TestFlight beta
- [ ] Collect feedback from 10 users

---

## Troubleshooting

### "Python not found"
Install Python from https://python.org (check "Add to PATH")

### "Port 8000 in use"
```bash
# Find and kill process
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "Module not found"
```bash
cd backend
py -m pip install -r requirements-sqlite.txt
```

---

## Key Features Working

| Feature | Status | How to Test |
|---------|--------|-------------|
| Capture API | ✅ | POST /claws/capture |
| AI Categorization | ✅ | Creates books/restaurants/tasks |
| Smart Resurfacing | ✅ | GET /claws/surface?active_app=amazon |
| Strike/Release | ✅ | POST /claws/{id}/strike |
| Expiration | ✅ | 7-day default expiry |
| Demo Data | ✅ | GET /claws/demo-data |

---

## What Makes This Special

Most apps just store notes. **CLAW understands context.**

**Example:**
- You capture: "Try that new Italian place"
- AI tags: restaurant, visit, maps trigger
- Later: You open Google Maps
- SURFACE: "Try that new Italian place" 
- You: "I would've totally forgotten!"

That's the magic. 🦖

---

## Questions?

Check these files:
- `QUICKSTART.md` - Detailed setup instructions
- `README.md` - Full project documentation
- `docs/API.md` - API reference

---

**Ready? Start the server and test it!**

```bash
cd backend
py run_sqlite.py
```

Then open http://localhost:8000/docs

🦖 Happy Clawing!
