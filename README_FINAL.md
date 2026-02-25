# 🦖 CLAW - Production Ready v1.0

**Your Intention Archive** - Capture now, Strike later.

![Version](https://img.shields.io/badge/version-1.0.0-success)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## What is CLAW?

CLAW solves **contextual amnesia** - that frustrating moment when you remember something at the wrong time.

- Remember batteries when you're in bed? **CLAW captures it.**
- Forget the restaurant when you're hungry? **CLAW resurfaces it.**

**The magic:** CLAW uses AI to understand context and brings intentions back when you can actually act on them.

---

## Features

| Feature | Description |
|---------|-------------|
| ⚡ 3-Second Capture | Voice, photo, or text - frictionless input |
| 🤖 AI Categorization | Auto-tags books, restaurants, tasks, products |
| 🎯 Smart Resurfacing | Location, time, and app-aware reminders |
| ✅ Strike or Release | Complete or let expire - no guilt hoarding |
| 📊 Progress Tracking | See your completion rate and stats |

---

## Quick Start

### For Users (Test Immediately)

1. **Start Backend:**
   ```bash
   cd backend
   python run_sqlite.py
   ```

2. **Test in Browser:**
   - Open http://localhost:8000/docs
   - Try the interactive API

3. **Run Mobile App:**
   ```bash
   cd mobile
   npm install
   expo start
   ```
   - Scan QR code with Expo Go app

### For Distribution (Share with Others)

See [BUILD_GUIDE.md](BUILD_GUIDE.md) for:
- Deploying backend to cloud
- Building APK for Android
- Distributing to users

---

## Project Structure

```
ClawNytt/
├── 📁 backend/          # FastAPI + SQLite
│   ├── run_sqlite.py    # Start server
│   ├── app/
│   │   └── api/v1/      # REST API endpoints
│   └── render.yaml      # Cloud deployment config
│
├── 📁 mobile/           # React Native + Expo
│   ├── src/
│   │   ├── screens/     # UI screens
│   │   ├── store/       # State management
│   │   └── api/         # API client
│   ├── app.json         # App configuration
│   └── eas.json         # Build configuration
│
├── BUILD_GUIDE.md       # How to build & distribute
├── TEST_RESULTS.md      # API test results
└── README.md            # This file
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/claws/capture` | POST | Create new intention |
| `/api/v1/claws/me` | GET | List your claws |
| `/api/v1/claws/surface` | GET | Get context-matched claws |
| `/api/v1/claws/{id}/strike` | POST | Mark as completed |
| `/api/v1/claws/{id}/release` | POST | Let expire early |
| `/api/v1/claws/demo-data` | GET | Create sample data |

---

## The "Aha!" Moment

**Without CLAW:**
```
11:00 AM - Friend mentions book
    (Forgotten immediately)
    
3 weeks later - "What was that book?"
```

**With CLAW:**
```
11:00 AM - Friend mentions book
    [Captured in 3 seconds]
    
07:00 PM - Open Amazon app
    [CLAW surfaces the book]
    
07:01 PM - Buy book instantly
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python) |
| Database | SQLite (development), PostgreSQL (production) |
| Mobile | React Native + Expo |
| State | Zustand |
| Styling | Native + Linear Gradient |
| Haptics | Expo Haptics |

---

## Deployment Options

### Backend (Free Tiers)
- **Render**: https://render.com
- **Railway**: https://railway.app
- **Fly.io**: https://fly.io

### Mobile Distribution
- **Expo Go**: Immediate testing
- **APK**: Direct Android install
- **App Store**: iOS distribution

---

## Screenshots

### Capture Screen
Beautiful gradient UI with quick suggestions

### Surface Screen
Context-aware cards with strike/release actions

### Vault Screen
Organized view of all intentions

---

## Roadmap

- [x] MVP - Core capture/resurface
- [x] Beautiful UI - Polished design
- [x] AI Categorization - Smart tagging
- [ ] OpenAI Integration - Better AI
- [ ] Push Notifications - Real-time alerts
- [ ] Social Features - Share claws
- [ ] Widgets - Home screen access

---

## Support

**Questions? Issues?**
- Check BUILD_GUIDE.md
- Review TEST_RESULTS.md
- Open an issue on GitHub

---

## License

MIT - Build something amazing!

---

**Made with 🦖 by the CLAW team**

*Capture now. Strike later.*
