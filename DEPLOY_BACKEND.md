# 🚀 Deploy CLAW Backend to Render (FREE)

## Step 1: Push to GitHub
1. Create a GitHub repo
2. Push the `backend` folder

## Step 2: Deploy to Render
1. Go to https://render.com
2. Click "New Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `pip install -r requirements-sqlite.txt`
   - **Start Command**: `uvicorn app.main_sqlite:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

## Step 3: Update Mobile Config
Once deployed, Render gives you a URL like:
```
https://claw-api.onrender.com
```

Update `mobile/src/api/client.ts`:
```typescript
const PRODUCTION_API_URL = 'https://claw-api.onrender.com/api/v1';
```

Then rebuild the APK.

---

## Alternative: Railway (Also FREE)
https://railway.app - Similar process

## Alternative: Fly.io
https://fly.io - $5 free credit/month
