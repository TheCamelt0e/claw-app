# PostgreSQL Database Setup for Render

## Overview
Successfully configured the app to use PostgreSQL in production while keeping SQLite for local development.

## What Changed

### 1. Render Configuration (`render.yaml`)
Added managed PostgreSQL database:
```yaml
databases:
  - name: claw-postgres
    plan: free
```

The `DATABASE_URL` is automatically injected from the database service.

### 2. Database Module (`backend/app/core/database.py`)
- Auto-detects database type (SQLite vs PostgreSQL)
- Different connection pools for each:
  - SQLite: Single thread, simple pooling
  - PostgreSQL: Connection pool (5 base, 10 max)
- URL conversion (Render uses `postgres://`, SQLAlchemy needs `postgresql://`)
- Connection health checks

### 3. Main App (`backend/app/main.py`)
- Better startup/shutdown handling
- Database connection verification on startup
- Improved health check with DB status

### 4. Production Requirements
Added `psycopg2-binary==2.9.9` for PostgreSQL support.

## Deployment Steps

### Step 1: Deploy to Render

**Option A: Blueprint (Recommended)**
1. Push changes to GitHub
2. In Render dashboard: "Blueprints" → "New Blueprint Instance"
3. Select your repository
4. Render will create:
   - PostgreSQL database (free tier)
   - Web service (claw-api)
5. Set your `GEMINI_API_KEY` in environment variables

**Option B: Manual**
1. Create PostgreSQL database in Render dashboard
2. Create Web Service
3. Link `DATABASE_URL` from database
4. Set `SECRET_KEY` and `GEMINI_API_KEY`

### Step 2: Verify Deployment

Check the deploy logs for:
```
[OK] Database initialized (PostgreSQL) - Status: connected
```

Test the health endpoint:
```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "claw-api",
  "database": {
    "type": "postgresql",
    "connected": true
  },
  "version": "1.0.0"
}
```

## Local Development (Still SQLite)

No changes needed! Local development continues to use SQLite:

```bash
cd backend
# .env file (auto-created or use defaults)
# DATABASE_URL defaults to sqlite:///./claw_app.db

uvicorn app.main:app --reload
```

You'll see:
```
[OK] Database initialized (SQLite) - Status: connected
```

## Database Differences

| Feature | SQLite (Local) | PostgreSQL (Production) |
|---------|---------------|------------------------|
| Persistence | File-based | Server-based |
| Concurrent connections | Limited | 100+ (Render free tier) |
| Data types | Basic | Rich (JSONB, Arrays, etc.) |
| Backups | Manual file copy | Automatic (Render) |
| Scaling | Vertical only | Horizontal possible |

## Free Tier Limits (Render)

- **PostgreSQL**: 1GB storage, shared CPU
- **Web Service**: 512MB RAM, sleeps after 15min inactivity
- **Bandwidth**: 100GB/month

Upgrade to paid plans when:
- Database > 1GB
- Need 24/7 uptime (no sleep)
- More than ~100 concurrent users

## Troubleshooting

### "Database connection failed"
1. Check `DATABASE_URL` is set correctly
2. Verify database service is running in Render dashboard
3. Check Render status page for outages

### "Module not found: psycopg2"
1. Ensure `psycopg2-binary` is in `requirements-prod.txt`
2. Redeploy after pushing changes

### Data Loss Concerns
**With PostgreSQL**: Data persists across deploys automatically
**With SQLite on disk**: Data was lost on every deploy (ephemeral filesystem)

## Migration from Old SQLite (Disk)

If you have data in the old SQLite setup:
1. Export data before switching (if any real users)
2. Deploy with PostgreSQL
3. Users will need to re-register (fresh start)

**Note**: The old SQLite was using shared test data anyway, so no real user data is lost.

---

**Status**: ✅ PostgreSQL configured and ready for deployment
