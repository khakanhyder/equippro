# Coolify Deployment Guide - Equipment Pro

This guide explains how to deploy Equipment Pro to Coolify with PostgreSQL.

## Prerequisites

- Coolify installed on your VPS (https://coolify.io)
- Your project pushed to a Git repository (GitHub/GitLab)

## Step 1: Create PostgreSQL Database

1. In Coolify: Go to **Project > Environment > Resources > + New > Databases**
2. Select **PostgreSQL**
3. Configure:
   - Database name: `equipmentpro`
   - Username/password: (auto-generated or customize)
4. Click **Start** and wait for status: "Running"
5. Note the connection URL from the database page

## Step 2: Deploy the Application

1. Go to **Project > Environment > Resources > + New > Application**
2. Select your Git provider and repository
3. Select branch (e.g., `main`)
4. **Buildpack**: Choose **Dockerfile** (we have a Dockerfile ready)
5. **Port**: Set to `5000`

## Step 3: Configure Environment Variables

Go to **Configuration > Environment Variables** and add:

```
DATABASE_URL=postgresql://username:password@postgres:5432/equipmentpro
SESSION_SECRET=your-secure-random-string-here
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=your-openai-api-key
APIFY_API_TOKEN=your-apify-token
```

**Important**: 
- Replace `postgres` with your database container name if different
- Generate a secure SESSION_SECRET (at least 32 characters)
- Mark `DATABASE_URL` as a **Build Variable** for migrations

## Step 4: Run Database Migrations

After first deployment, SSH into your container or use Coolify's terminal:

```bash
npm run db:push
```

Or add this to your build command in **Configuration > General**:

```
Build Command: npm ci && npm run build && npm run db:push
```

## Step 5: Configure Domain & SSL

1. Go to **Configuration > Domains**
2. Add your domain: `equipmentpro.yourdomain.com`
3. Enable SSL (Coolify auto-provisions Let's Encrypt)
4. Add DNS A record pointing to your VPS IP

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `APIFY_API_TOKEN` | Optional | Apify token for web scraping |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Set to `5000` |

## File Storage Note

This project uses Replit Object Storage for file uploads. For Coolify deployment, you'll need to either:

1. **Use S3-compatible storage**: Configure AWS S3 or MinIO
2. **Use local volume**: Mount a persistent volume in Coolify

To switch to S3:
1. Add these environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET`
2. Update `server/services/upload-service.ts` to use AWS S3 instead of Replit Object Storage

## Health Check

The app has a health check endpoint at `/api/health` that returns:
```json
{"status": "ok", "timestamp": "2024-12-08T..."}
```

Coolify will automatically use this for container health monitoring.

## Troubleshooting

**Database connection fails**:
- Ensure app and database are on the same Docker network
- Check DATABASE_URL format is correct
- Verify database is running

**Build fails**:
- Check Coolify logs for specific errors
- Ensure all environment variables are set
- Try rebuilding with cache cleared

**Session issues**:
- Set `SESSION_SECRET` to a secure random value
- Ensure `NODE_ENV=production` is set

## Docker Commands (Local Testing)

Build locally:
```bash
docker build -t equipment-pro .
```

Run locally:
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=your-db-url \
  -e SESSION_SECRET=test-secret \
  -e OPENAI_API_KEY=your-key \
  equipment-pro
```
