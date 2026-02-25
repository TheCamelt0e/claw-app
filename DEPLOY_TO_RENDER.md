# 🚀 Deploy CLAW Backend to Render (Step-by-Step)

## Overview
- **Time needed**: ~10 minutes
- **Cost**: FREE (Render free tier)
- **Result**: Your backend live on the internet, APK works anywhere!

---

## Step 1: Create GitHub Repository

### 1.1 Go to GitHub
Open https://github.com/new in your browser

### 1.2 Fill in Repository Details
- **Repository name**: `claw-app` (or any name you like)
- **Description**: "CLAW - Capture now, Strike later"
- **Visibility**: Public (or Private - both work)
- ✅ Check "Add a README file"
- Click **"Create repository"**

### 1.3 Push Your Code to GitHub

Open Command Prompt and run these commands one by one:

```bash
cd C:\Users\Gústaf\Desktop\ClawNytt

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "CLAW app ready for deployment"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/claw-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Success check**: Go to `https://github.com/YOUR_USERNAME/claw-app` - you should see your files!

---

## Step 2: Deploy to Render

### 2.1 Sign Up / Log In
Go to https://dashboard.render.com
- Sign up with GitHub (easiest) or email

### 2.2 Create New Web Service
1. Click the **"New +"** button (top right)
2. Select **"Web Service"**

### 2.3 Connect Your Repo
1. Find your `claw-app` repository in the list
2. Click **"Connect"**

### 2.4 Configure Your Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `claw-api` |
| **Region** | Choose closest to you (e.g., Frankfurt for Europe) |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r backend/requirements-prod.txt` |
| **Start Command** | `cd backend && uvicorn app.main_production:app --host 0.0.0.0 --port $PORT` |
| **Plan** | `Free` |

### 2.5 Add Persistent Disk (for database)

Scroll down to **"Disks"** section:
1. Click **"Add Disk"**
2. **Name**: `claw-data`
3. **Mount Path**: `/data`
4. **Size**: `1 GB` (free tier max)

### 2.6 Deploy!

Click **"Create Web Service"**

Render will now:
1. Build your app (~2-3 minutes)
2. Deploy it (~1 minute)
3. Start the server

**✅ Success check**: You'll see a URL like `https://claw-api-xxx.onrender.com`

---

## Step 3: Update Your Mobile App

### 3.1 Get Your Render URL
From the Render dashboard, copy your service URL:
```
https://claw-api-abc123.onrender.com
```

### 3.2 Edit the Mobile App

Open this file:
```
C:\Users\Gústaf\Desktop\ClawNytt\mobile\src\api\client.ts
```

**Line 10** - Change from:
```typescript
const PRODUCTION_API_URL = 'https://claw-api.onrender.com/api/v1';
```

**To your actual URL:**
```typescript
const PRODUCTION_API_URL = 'https://claw-api-abc123.onrender.com/api/v1';
```

(Replace `claw-api-abc123` with your actual Render URL)

Save the file.

---

## Step 4: Rebuild the APK

Open Command Prompt:

```bash
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile

# Submit new build
npx eas build --platform android --profile preview
```

Wait for the build (10-20 minutes on free tier).

---

## Step 5: Download and Install

1. Go to: https://expo.dev/accounts/camelt0e/projects/claw-app/builds
2. Download the new APK
3. Transfer to your Android phone
4. Install it
5. **It works anywhere in the world!** 🎉

---

## 🎯 Quick Reference

### Your Backend URL
After deployment, your API will be at:
```
https://claw-api-xxx.onrender.com/api/v1
```

Test it in browser:
```
https://claw-api-xxx.onrender.com/health
```

Should return: `{"status": "healthy"}`

### Important Notes
- ⚠️ Render free tier: Service sleeps after 15 min of inactivity (wakes up on first request - takes ~30 seconds)
- 💾 Data persists: Uses disk at `/data/claw.db`
- 🔄 Auto-deploys: When you push to GitHub main branch

### Troubleshooting

**Build fails?**
- Check Render logs in dashboard
- Make sure `requirements-prod.txt` exists

**App can't connect?**
- Verify URL in `client.ts` matches your Render URL
- Check that backend is running (visit `/health` endpoint)

**Database errors?**
- Disk might not be mounted - check Render dashboard

---

## ✅ Done!

Your CLAW app is now:
- ✅ Backend deployed globally
- ✅ APK works anywhere
- ✅ Data persists between sessions
- ✅ Auto-updates when you push code

**Enjoy your app! 🐾**
