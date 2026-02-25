# CLAW - Quick Start Guide

## 🚀 RUN CLAW NOW (3 Simple Steps)

### Step 1: Start the Backend
**Open a NEW Command Prompt** and run:
```bash
cd C:\Users\Gústaf\Desktop\ClawNytt\backend
start-backend.bat
```

You should see: `Uvicorn running on http://0.0.0.0:8000`

**LEAVE THIS WINDOW OPEN**

---

### Step 2: Start the Web App
**Open ANOTHER Command Prompt** and run:
```bash
cd C:\Users\Gústaf\Desktop\ClawNytt\web
start-web.bat
```

You should see: `Serving HTTP on :: port 3000`

---

### Step 3: Open CLAW
- **On your computer:** http://localhost:3000
- **On your phone (same WiFi):** http://YOUR-COMPUTER-NAME:3000

---

## ✅ How to Use CLAW

### Capture Tab
- Type something you want to remember
- Press Enter or click "CLAW IT"
- AI automatically categorizes it (book, restaurant, product, task)

### Strike Tab
- Shows what CLAW thinks you should act on
- **Strike** = Mark as done ✓
- **Release** = Let CLAW resurface it later

### Vault Tab
- View all your captured claws
- See categories and titles

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Backend not running" | Make sure backend window is open and shows port 8000 |
| Phone can't connect | Use your computer's IP address instead of name |
| API errors | Visit http://localhost:8000/docs to test backend |

---

## 📁 Project Structure

```
ClawNytt/
├── backend/          # FastAPI + SQLite
│   ├── start-backend.bat
│   └── app/
├── web/              # Web App (HTML/JS)
│   ├── index.html
│   └── start-web.bat
└── mobile/           # React Native (deprecated, use web instead)
```

---

## 🌐 API Endpoints

All available at http://localhost:8000

- `POST /api/v1/claws/capture?content=...` - Capture new claw
- `GET /api/v1/claws/surface` - Get surface suggestions
- `POST /api/v1/claws/{id}/strike` - Mark as done
- `POST /api/v1/claws/{id}/release` - Reschedule
- `GET /api/v1/claws/me` - Get all claws
- `GET /health` - Check if running

---

**That's it! CLAW is ready to use! 🎉**
