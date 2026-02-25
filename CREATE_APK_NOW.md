# 📱 CREATE THE APK FILE - STEP BY STEP

**This guide will create the actual .apk file users can install**

---

## ⚠️ BEFORE YOU START

**What you'll get:** `CLAW-v1.0.0.apk` (the installable file)
**Time needed:** 15-20 minutes
**Cost:** FREE
**Difficulty:** Easy (just follow steps)

---

## 📋 STEP 1: Install Node.js (5 minutes)

### Windows:
1. Go to: https://nodejs.org
2. Click big green "LTS" button (Download)
3. Run the installer
4. Click "Next" through everything
5. Restart your computer

### Verify Installation:
Open Command Prompt and type:
```cmd
node --version
```
Should show: `v18.x.x` or higher

---

## 📋 STEP 2: Install Expo CLI (2 minutes)

Open Command Prompt and type:
```cmd
npm install -g expo-cli eas-cli
```

Wait for it to finish (2-3 minutes)

### Verify:
```cmd
expo --version
```
Should show a version number

---

## 📋 STEP 3: Create Expo Account (2 minutes)

1. Go to: https://expo.dev/signup
2. Sign up with:
   - Email: your email
   - Username: choose one
   - Password: create one
3. Verify your email (check inbox)

---

## 📋 STEP 4: Prepare Assets (3 minutes)

You need 3 image files. Create them or download:

### Option A: Create Simple Icons
Use any image editor (Paint, Canva, Photoshop):

**icon.png** (1024x1024)
- Dark background (#1a1a2e)
- Orange circle or checkmark (#FF6B35)
- Save as PNG

**splash.png** (1242x2436)
- Same dark background
- "CLAW" text in orange
- "Capture now. Strike later." subtitle
- Save as PNG

**adaptive-icon.png** (108x108)
- Same design, smaller
- Save as PNG

### Option B: Use Placeholders (For Testing)
Copy any 1024x1024 PNG and rename to `icon.png`

### Put them in:
```
C:\Users\Gústaf\Desktop\ClawNytt\mobile\assets\
```

---

## 📋 STEP 5: Update API URL (1 minute)

1. Open: `C:\Users\Gústaf\Desktop\ClawNytt\mobile\src\api\client.ts`
2. Find this line:
   ```typescript
   const PRODUCTION_API_URL = 'https://claw-api.onrender.com/api/v1';
   ```
3. Change to your backend URL (or keep for local testing):
   ```typescript
   const PRODUCTION_API_URL = 'http://YOUR_COMPUTER_IP:8000/api/v1';
   ```

---

## 📋 STEP 6: Build the APK (10 minutes)

### Open Command Prompt and run:

```cmd
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile
```

```cmd
npm install
```
(Wait 2-3 minutes)

```cmd
eas login
```
(Enter your Expo username/password)

```cmd
eas build --platform android --profile preview
```

**This will:**
- Upload your code to Expo's build servers
- Compile the APK
- Give you a download link

**Wait 5-10 minutes...**

---

## 📋 STEP 7: Download Your APK

When build completes, you'll see:
```
✅ Build successful!

Download URL:
https://expo.dev/artifacts/xxxxxxxx
```

### To download:
1. Click the link (or copy to browser)
2. Download the `.apk` file
3. Save to: `C:\Users\Gústaf\Desktop\CLAW-v1.0.0.apk`

---

## 📋 STEP 8: Test the APK

### On your Android phone:
1. Transfer APK to phone (USB, email, cloud)
2. Open file manager
3. Tap `CLAW-v1.0.0.apk`
4. Tap "Install"
5. Allow "Unknown Sources" if asked
6. Open CLAW app!

---

## 📋 STEP 9: Distribute!

Now you have the APK file, you can:

### Share Directly:
- Upload to Google Drive
- Share download link
- Send via email
- Share via WhatsApp/Telegram

### Publish to Stores:
- Google Play Console
- Amazon Appstore
- Samsung Galaxy Store

---

## 🎯 QUICK REFERENCE

### One-Line Commands:
```cmd
cd C:\Users\Gústaf\Desktop\ClawNytt\mobile && npm install && eas login && eas build --platform android --profile preview
```

### Troubleshooting:

**"npm not found"**
→ Node.js not installed. Install from nodejs.org

**"eas not found"**
→ Run: `npm install -g eas-cli`

**"Build failed"**
→ Check icon.png and splash.png exist in assets folder
→ Check app.json is valid

**"Can't login"**
→ Create account at expo.dev first
→ Verify email

---

## 📦 WHAT YOU'LL HAVE

After completing these steps:

```
C:\Users\Gústaf\Desktop\
└── CLAW-v1.0.0.apk (45-50 MB)
```

**THIS IS THE FILE USERS INSTALL!**

---

## 🚀 ALTERNATIVE: Use My Script

I've created a script that does most of this:

Run: `BUILD_APK.bat`

But you still need:
- Node.js installed
- Expo account created
- Icons created

---

## ❓ FAQ

### Q: Can you just give me the APK file?
**A:** No, I can't create compiled files. The APK must be built from the code on your computer or via Expo's servers.

### Q: Is there a faster way?
**A:** Use Expo Go app for immediate testing (no APK needed). But for distribution, you need the APK.

### Q: Can I build on Mac/Linux?
**A:** Yes! Same commands work on all platforms.

### Q: How big is the APK?
**A:** About 45-50 MB (includes React Native runtime)

### Q: Do I need Android Studio?
**A:** NO! Expo handles everything. You don't need Android SDK or Studio.

---

## ✅ CHECKLIST

Before building:
- [ ] Node.js installed
- [ ] Expo CLI installed
- [ ] Expo account created
- [ ] Icons created (icon.png, splash.png)
- [ ] API URL updated
- [ ] Run `npm install`
- [ ] Logged in to Expo

After building:
- [ ] APK file downloaded
- [ ] Tested on Android phone
- [ ] Shared with users!

---

## 🎉 ONCE YOU HAVE THE APK

You can:
1. Install on any Android phone
2. Upload to Google Drive
3. Share download link
4. Publish to Play Store
5. Email to friends

**Users just tap the APK file and it installs!**

---

## 📞 NEED HELP?

If you get stuck on any step:
1. Read the error message carefully
2. Check the troubleshooting section
3. Google the error + "expo"
4. Check Expo docs: docs.expo.dev

---

**GO CREATE THAT APK!** 📱

The code is ready. The design is beautiful. The backend works.
**You just need to compile it!**
