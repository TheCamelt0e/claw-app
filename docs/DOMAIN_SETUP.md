# 🌐 Using Your blackmail.is Domain

Yes! You can absolutely use your `blackmail.is` domain from 1984.is hosting with CLAW!

## Option 1: Point Domain to Render Backend (RECOMMENDED)

Since your backend is already deployed on Render, you can point your domain there:

### Step 1: Configure DNS at 1984.is

1. Log in to your 1984.is hosting control panel
2. Go to DNS settings for `blackmail.is`
3. Add these records:

```
Type: CNAME
Name: api
Value: claw-api-b5ts.onrender.com
TTL: 3600
```

Or for root domain (if 1984.is supports ALIAS/ANAME):
```
Type: ALIAS or ANAME
Name: @
Value: claw-api-b5ts.onrender.com
```

### Step 2: Add Custom Domain in Render

1. Go to https://dashboard.render.com
2. Select your `claw-api` service
3. Click "Settings" → "Custom Domains"
4. Add: `api.blackmail.is`
5. Render will give you a verification record to add at 1984.is
6. Add the verification record, then verify in Render

### Step 3: Update Mobile App

Update `mobile/src/api/client.ts`:

```typescript
// Change this:
const PRODUCTION_API_URL = 'https://claw-api-b5ts.onrender.com/api/v1';

// To this:
const PRODUCTION_API_URL = 'https://api.blackmail.is/api/v1';
```

Rebuild and redownload the APK.

---

## Option 2: Host Backend on 1984.is (Full Control)

If 1984.is supports Python/Node.js hosting:

### Requirements Check:
- Python 3.11+ support
- PostgreSQL database
- Redis (optional, for background tasks)
- SSL certificates

### Steps:

1. **Export database from Render:**
   ```bash
   # Connect to Render PostgreSQL
   pg_dump [RENDER_DB_URL] > claw_backup.sql
   ```

2. **Import to 1984.is database**

3. **Upload backend code:**
   ```bash
   # Clone your repo
   git clone https://github.com/yourusername/claw.git
   cd claw/backend
   
   # Install dependencies
   pip install -r requirements.txt
   ```

4. **Configure environment variables** on 1984.is

5. **Set up Gunicorn + Nginx**

---

## Option 3: Use blackmail.is for Landing Page

Keep backend on Render, but host a landing page at `blackmail.is`:

### What You Get:
- `blackmail.is` → Beautiful marketing page
- `api.blackmail.is` → Your API (pointed to Render)
- `app.blackmail.is` → Web app (if you build one)

### Landing Page Content:

Create a simple `index.html` and upload to 1984.is:

```html
<!DOCTYPE html>
<html>
<head>
  <title>CLAW - Never Forget Again</title>
  <style>
    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .logo { font-size: 80px; margin-bottom: 20px; }
    h1 { font-size: 48px; margin: 0; }
    .tagline { color: #FF6B35; font-size: 24px; margin: 20px 0; }
    .cta {
      background: #FF6B35;
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="logo">🦀</div>
  <h1>CLAW</h1>
  <p class="tagline">Capture intentions. Surface at the right moment.</p>
  <p>Never forget "that book Sarah recommended" again.</p>
  <a href="/download" class="cta">Download App</a>
</body>
</html>
```

---

## 🔐 SSL Certificate (Important!)

Your mobile app requires HTTPS. Make sure:

1. 1984.is provides SSL certificates (Let's Encrypt)
2. Or use Cloudflare in front:
   - Sign up at cloudflare.com
   - Add your domain
   - Point nameservers to Cloudflare
   - Enable "Full (Strict)" SSL mode
   - Create CNAME record pointing to Render

---

## 📱 Updating the App

After setting up your domain, update:

**File: `mobile/src/api/client.ts`**
```typescript
const PRODUCTION_API_URL = 'https://api.blackmail.is/api/v1';
```

Then rebuild:
```bash
cd mobile
eas build --platform android --profile preview
```

---

## ✅ Benefits of Using Your Domain

| Feature | Render Subdomain | Your Domain |
|---------|-----------------|-------------|
| Branding | ❌ Generic | ✅ Professional |
| Trust | ⚠️ Suspicious | ✅ Legitimate |
| Shareability | ❌ Hard to remember | ✅ Easy |
| Control | ⚠️ Limited | ✅ Full |

---

## 🚀 Quick Recommendation

**For now:** Keep backend on Render (it's working!)

**Do this:**
1. Point `api.blackmail.is` to Render
2. Put landing page at `blackmail.is`
3. Update app to use `api.blackmail.is`

This gives you professional branding without server management headaches!

---

## ❓ 1984.is Specific Questions

Contact 1984.is support and ask:
1. "Do you support CNAME records for subdomains?"
2. "Can I get a free SSL certificate?"
3. "Do you support Python/Node.js apps or just static hosting?"
4. "What's your PostgreSQL pricing?"

If they support everything, you CAN move the whole backend there!

---

**Want me to help with any of these options?** Just say which one! 🎯
