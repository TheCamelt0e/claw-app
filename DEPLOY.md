# 🚀 Deploy CLAW to Render (One-Click)

## Step 1: Push to GitHub

First, create a GitHub repository and push your code:

```bash
# Create a new repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/claw-app.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Render

### Option A: One-Click Deploy (Easiest)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/claw-app)

Click this button (after pushing to GitHub) and Render will automatically:
- Create the web service
- Set up the SQLite database with persistent disk
- Deploy your backend

### Option B: Manual Deploy

1. Go to https://dashboard.render.com
2. Click "New Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Name**: claw-api
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements-prod.txt`
   - **Start Command**: `uvicorn app.main_production:app --host 0.0.0.0 --port $PORT`
   - **Disk**: Create a disk named "claw-data" at `/data` (1GB)
5. Click "Create Web Service"

## Step 3: Get Your API URL

After deployment, Render gives you a URL like:
```
https://claw-api-xyz.onrender.com
```

## Step 4: Update Mobile App

Edit `mobile/src/api/client.ts`:

```typescript
// Line 10 - Replace with your actual Render URL
const PRODUCTION_API_URL = 'https://claw-api-xyz.onrender.com/api/v1';
```

## Step 5: Rebuild APK

```bash
cd mobile
npx eas build --platform android --profile preview
```

## ✅ Done!

Your APK will now work anywhere in the world!

---

## 🔧 Alternative: Railway (Also Free)

1. Go to https://railway.app
2. Click "New Project"
3. Deploy from GitHub repo
4. Add a volume for persistent storage
5. Set start command: `uvicorn app.main_production:app --host 0.0.0.0 --port $PORT`

## 🔧 Alternative: Fly.io

```bash
# Install flyctl first, then:
cd backend
fly launch
fly volumes create claw_data --size 1
fly deploy
```
