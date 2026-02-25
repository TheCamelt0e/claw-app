# CLAW Project Structure

```
ClawNytt/
├── 📁 backend/                 # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py      # Settings & env vars
│   │   │   └── database.py    # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── user.py        # User model
│   │   │   └── claw.py        # Core Claw entity
│   │   ├── schemas/
│   │   │   ├── user.py        # Pydantic schemas
│   │   │   └── claw.py
│   │   ├── api/v1/
│   │   │   ├── router.py      # API route aggregation
│   │   │   └── endpoints/
│   │   │       ├── auth.py    # Login/register
│   │   │       ├── claws.py   # Core claw CRUD + resurfacing
│   │   │       └── users.py   # User management
│   │   └── services/
│   │       ├── ai_processor.py    # OpenAI categorization
│   │       └── resurfacing.py     # Context engine
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env.example
│
├── 📁 mobile/                  # React Native (Expo)
│   ├── App.tsx                # Main app component
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json               # Expo config
│   └── src/
│       ├── api/
│       │   └── client.ts      # Axios API client
│       ├── store/
│       │   ├── authStore.ts   # Zustand auth state
│       │   └── clawStore.ts   # Zustand claw state
│       ├── screens/
│       │   ├── CaptureScreen.tsx   # Main capture UI
│       │   ├── SurfaceScreen.tsx   # Context matches
│       │   ├── VaultScreen.tsx     # All claws
│       │   ├── ProfileScreen.tsx   # Settings/stats
│       │   └── LoginScreen.tsx     # Auth
│       ├── hooks/
│       │   └── useResurfacing.ts   # Location/app detection
│       ├── components/        # Reusable UI components
│       └── utils/
│           └── dateUtils.ts
│
├── 📁 docs/                    # Documentation
│   ├── API.md                 # API reference
│   ├── BUSINESS_PLAN.md       # $2M seed plan
│   └── PITCH_DECK.md          # Investor deck
│
├── README.md                   # Main project readme
├── PROJECT_STRUCTURE.md        # This file
└── .gitignore
```

## Key Files Explained

### Backend
| File | Purpose |
|------|---------|
| `claw.py` (model) | Core entity - captures intentions with context triggers |
| `ai_processor.py` | OpenAI integration for auto-categorization |
| `resurfacing.py` | The magic - determines WHEN to show claws |
| `claws.py` (endpoints) | `/capture`, `/surface`, `/strike` APIs |

### Mobile
| File | Purpose |
|------|---------|
| `CaptureScreen.tsx` | 3-second voice/text capture UI |
| `SurfaceScreen.tsx` | Shows claws matching current context |
| `useResurfacing.ts` | Background monitoring (location, apps) |
| `clawStore.ts` | State management for claws |

## Quick Commands

```bash
# Start backend
cd backend
docker-compose up

# Start mobile
cd mobile
npm install
npx expo start

# Run backend tests
cd backend
pytest

# Database migrations
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Add your OpenAI API key
3. Start with Docker Compose (includes PostgreSQL + Redis)
4. Mobile app connects to `localhost:8000` by default

## Architecture Highlights

```
User captures intention
        ↓
[AI Processor] → Categorizes, tags, suggests context
        ↓
[Database] → Stores with triggers (location/time/app)
        ↓
[Resurfacing Engine] ← Monitors context changes
        ↓
[Notification] → Shows at right moment
        ↓
User strikes or releases
```

## Next Steps

### MVP (Week 1-2)
- [ ] Test backend API with curl/Postman
- [ ] Run mobile app in simulator
- [ ] Connect capture flow end-to-end

### Alpha (Week 3-4)
- [ ] Deploy backend to Railway/Render
- [ ] TestFlight beta (iOS)
- [ ] Internal testing with 10 users

### Beta (Month 2)
- [ ] Public TestFlight
- [ ] Collect resurfacing accuracy metrics
- [ ] Iterate on AI prompts

### Launch (Month 3)
- [ ] App Store submission
- [ ] Product Hunt launch
- [ ] Influencer outreach

---

Built with 🦖 by the CLAW team
