# How to Set a Real SECRET_KEY for Production

## Option 1: Generate on Your Computer

### Mac/Linux:
```bash
# Open terminal and run:
python3 -c "import secrets; print(secrets.token_hex(32))"

# Or use openssl:
openssl rand -hex 32
```

### Windows (PowerShell):
```powershell
# Option 1: Using Python (if installed)
python -c "import secrets; print(secrets.token_hex(32))"

# Option 2: Using .NET
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ })).ToLower()
```

## Option 2: Use an Online Generator (Quickest)
Go to: https://djecrety.ir/ 
- Click "Generate"
- Copy the 64-character string

## Setting the SECRET_KEY on Render

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com/
2. Select your CLAW backend service

### Step 2: Add Environment Variable
1. Click "Environment" tab
2. Click "Add Environment Variable"
3. Set:
   - **Key**: `SECRET_KEY`
   - **Value**: *(paste your generated 64-character string)*
4. Click "Save"

### Step 3: Redeploy
1. Go to "Manual Deploy" dropdown
2. Click "Deploy latest commit"
3. Wait for deployment to complete

## Example SECRET_KEY Format

Your SECRET_KEY should look like this:
```
3f7a2b9c8e4d1f6a5b3c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f0a1b3c5d7e9f2a4b6
```

**DO NOT use this example - generate your own!**

## Verifying It Works

After deployment, check your Render logs:
- If you see: `Using default SECRET_KEY` - **IT'S NOT SET**
- If you see no warning - **YOU'RE GOOD**

## For Local Development

Create a `.env` file in `backend/` folder:

```bash
# backend/.env
SECRET_KEY=your-generated-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=sqlite:///./claw_app.db
```

**NEVER commit `.env` to git!** (It's already in `.gitignore`)

---

**Current Status**: Backend will work but show warning until you set this.
