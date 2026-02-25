# CLAW Implementation Guide

## Getting Started (Step-by-Step)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop
- OpenAI API key

---

## Phase 1: Backend Setup (30 minutes)

### 1.1 Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 1.2 Start Infrastructure
```bash
docker-compose up -d db redis
# Wait 10 seconds for services to start
```

### 1.3 Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 1.4 Run Server
```bash
uvicorn app.main:app --reload
```

### 1.5 Test API
```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@claw.app","password":"test123","display_name":"Tester"}'

# Capture a claw
curl -X POST http://localhost:8000/api/v1/claws/capture \
  -H "Content-Type: application/json" \
  -d '{"content":"That book Sarah mentioned about habits","content_type":"text"}'
```

---

## Phase 2: Mobile Setup (20 minutes)

### 2.1 Install Dependencies
```bash
cd mobile
npm install
```

### 2.2 Update API URL
Edit `mobile/src/api/client.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000/api/v1';
// NOT localhost - use your computer's IP for mobile testing
```

### 2.3 Start Expo
```bash
npx expo start
```

### 2.4 Run on Device
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

---

## Phase 3: End-to-End Testing (20 minutes)

### Test Flow 1: Basic Capture
1. Open app on mobile
2. Register/login
3. Type: "That restaurant downtown with amazing pasta"
4. Tap "CLAW IT"
5. Check backend logs - should show AI processing

### Test Flow 2: Surface Claws
1. Create 3-4 claws with different contexts
2. Navigate to "Surface" tab
3. Should see context-matched claws
4. Swipe to strike one

### Test Flow 3: Context Simulation
```bash
# Simulate location-based resurfacing
curl "http://localhost:8000/api/v1/claws/surface?lat=40.7128&lng=-74.0060"
```

---

## Phase 4: Development Workflow

### Daily Development
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Mobile
cd mobile
npx expo start
```

### Adding Features

#### New API Endpoint
1. Add route in `app/api/v1/endpoints/`
2. Include in `app/api/v1/router.py`
3. Add tests

#### New Screen
1. Create in `mobile/src/screens/`
2. Add to navigation in `App.tsx`
3. Add state management in stores

---

## Common Issues

### Issue: Database connection fails
```bash
# Reset Docker containers
docker-compose down -v
docker-compose up -d
```

### Issue: Mobile can't connect to backend
- Use your computer's local IP, not `localhost`
- Ensure firewall allows port 8000
- Check both devices on same WiFi

### Issue: AI categorization not working
- Verify `OPENAI_API_KEY` in `.env`
- Check OpenAI dashboard for API credits
- Fallback keyword system works without API

---

## Deployment

### Backend (Railway)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Mobile (App Store)
```bash
cd mobile
# Build production version
npx expo build:ios
npx expo build:android

# Or use EAS
npx eas build --platform ios
```

---

## Testing Checklist

### Backend Tests
```bash
cd backend
pytest
```

### Manual Testing
- [ ] User registration/login
- [ ] Voice capture (simulated)
- [ ] Text capture with AI categorization
- [ ] Location-based resurfacing
- [ ] App-based resurfacing (simulated)
- [ ] Strike action
- [ ] Release action
- [ ] Extend expiry
- [ ] Filter by category

### Integration Testing
- [ ] Backend + Mobile communication
- [ ] Push notifications
- [ ] Background location tracking
- [ ] Offline capture (queue for sync)

---

## Monitoring

### Backend Metrics
- API response times
- AI categorization accuracy
- Resurfacing success rate
- User retention (D1, D7, D30)

### Mobile Metrics
- Capture time (target: <3 seconds)
- Strike rate (target: >30%)
- Screen load times
- Crash rates

---

## Next Features

### Week 2
- [ ] Photo capture with OCR
- [ ] Share claws with friends
- [ ] Browser extension

### Month 2
- [ ] Wearable app (Apple Watch)
- [ ] Smart watch complications
- [ ] Widgets (iOS/Android)

### Month 3
- [ ] AI action suggestions
- [ ] Purchase integration (Amazon API)
- [ ] Restaurant reservations (OpenTable)

---

**Questions? Check the README or ask the team.**

🦖 Happy Clawing!
