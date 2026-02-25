# 🐾 CLAW - Capture Now, Strike Later

**CLAW** is an AI-powered intention capture system that helps you remember things *without* interrupting your flow.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Smart Capture** | Type or voice record any thought |
| 🤖 **AI Categorization** | Auto-detects books, restaurants, products, tasks |
| ⚡ **Contextual Surface** | Resurfaces at the right time/place |
| ✓ **Strike System** | Mark done when you act on it |
| 🔒 **Personal Vault** | All your captured intentions |

---

## 🚀 Quick Start

### One-Click Launch

Double-click: `START_CLAW.bat`

Or manually:
```bash
# Terminal 1 - Backend
cd backend
py run_sqlite.py

# Terminal 2 - Web
cd web
py -m http.server 3000

# Open browser
http://localhost:3000
```

---

## 📱 Usage

### Capture
Type anything and press **Enter** or click **CLAW IT**:
- `"Atomic Habits book Sarah mentioned"` → Category: `book`, Trigger: `amazon`
- `"Try that ramen place on 5th"` → Category: `restaurant`, Trigger: `maps`
- `"Buy standing desk"` → Category: `product`, Trigger: `amazon`
- `"Call mom about weekend"` → Category: `task`, Trigger: `phone`

### Strike
When CLAW surfaces something relevant:
- **Strike** ✓ = Done!
- **Release** = Reschedule for later

### Vault
Browse all your captured claws with categories.

---

## 🏗️ Architecture

```
ClawNytt/
├── backend/          # FastAPI + SQLite
│   ├── app/
│   │   ├── api/v1/       # API routes
│   │   ├── core/         # Database, config
│   │   └── services/     # AI categorization
│   └── run_sqlite.py     # Entry point
├── web/              # Web app (pure HTML/JS)
│   └── index.html
└── mobile/           # React Native (deprecated)
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check status |
| `/claws/capture` | POST | Capture new claw |
| `/claws/surface` | GET | Get suggestions |
| `/claws/me` | GET | Get all claws |
| `/claws/{id}/strike` | POST | Mark done |
| `/claws/{id}/release` | POST | Reschedule |

Full docs: http://localhost:8000/docs

---

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, SQLite
- **Frontend**: Vanilla HTML/CSS/JS
- **AI**: Simple keyword-based categorization (extensible)

---

## 📊 Demo Data Added

When you first start, 4 demo claws are ready:
1. 📚 Book recommendation
2. 🍜 Restaurant to try
3. 🛒 Product to buy
4. 📞 Task to complete

---

**Made with ❤️ for flow state preservation.**
