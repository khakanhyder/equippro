# Coolify Deployment Guide - Equipment Pro

This guide explains how to deploy Equipment Pro to Coolify with PostgreSQL and Wasabi S3 storage.

## Environment Differences

| Feature | Development (Replit) | Production (Coolify) |
|---------|---------------------|---------------------|
| Database Driver | Neon Serverless | Standard pg |
| File Storage | Replit Object Storage | Wasabi S3 |
| Session Store | In-memory (MemoryStore) | PostgreSQL |

The application automatically detects the environment via `NODE_ENV` and uses the appropriate services.

## Prerequisites

- Coolify installed on your VPS (https://coolify.io)
- Your project pushed to a Git repository (GitHub/GitLab)
- Wasabi account with a bucket created

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

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@postgres:5432/equipmentpro

# Security (generate a secure random string, 32+ characters)
SESSION_SECRET=your-secure-random-string-here

# Application
NODE_ENV=production
PORT=5000

# API Keys
OPENAI_API_KEY=your-openai-api-key
APIFY_API_TOKEN=your-apify-token

# Wasabi S3 Storage
WASABI_ACCESS_KEY_ID=your-wasabi-access-key
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret-key
WASABI_BUCKET_NAME=your-bucket-name
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com
```

### Variable Descriptions

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption (32+ chars) |
| `NODE_ENV` | Yes | Must be `production` |
| `PORT` | Yes | Application port (5000) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `APIFY_API_TOKEN` | Optional | Apify token for web scraping |
| `WASABI_ACCESS_KEY_ID` | Yes | Wasabi access key |
| `WASABI_SECRET_ACCESS_KEY` | Yes | Wasabi secret key |
| `WASABI_BUCKET_NAME` | Yes | Wasabi bucket name |
| `WASABI_REGION` | Yes | Wasabi region (e.g., us-east-1) |
| `WASABI_ENDPOINT` | Yes | Wasabi endpoint URL |

## Step 4: Set Up Wasabi Bucket

1. Log in to Wasabi Console (https://console.wasabisys.com)
2. Create a new bucket in your preferred region
3. Note the bucket name and region
4. Create access keys under **Access Keys**
5. Configure bucket policy for public read access (optional, for direct image URLs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/uploads/*"
    }
  ]
}
```

## Step 5: Run Database Migrations

After first deployment, the session table is created automatically. For the main schema:

Option A: Add to Coolify build command:
```
Build Command: npm ci && npm run build && npm run db:push
```

Option B: Run manually via Coolify terminal:
```bash
npm run db:push
```

## Step 6: Configure Domain & SSL

1. Go to **Configuration > Domains**
2. Add your domain: `equipmentpro.yourdomain.com`
3. Enable SSL (Coolify auto-provisions Let's Encrypt)
4. Add DNS A record pointing to your VPS IP

## Health Check

The app has a health check endpoint at `/api/health` that returns:
```json
{"status": "ok", "timestamp": "2024-12-08T..."}
```

Coolify will automatically use this for container health monitoring.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Coolify Container                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Equipment Pro Application                 │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐│  │
│  │  │   Express API   │  │      React Frontend         ││  │
│  │  │   (Port 5000)   │  │     (Static Assets)         ││  │
│  │  └────────┬────────┘  └─────────────────────────────┘│  │
│  └───────────┼───────────────────────────────────────────┘  │
│              │                                               │
│  ┌───────────▼───────────┐  ┌─────────────────────────────┐│
│  │   PostgreSQL Pool     │  │     Session Storage         ││
│  │   (pg driver)         │  │    (connect-pg-simple)      ││
│  └───────────┬───────────┘  └──────────────┬──────────────┘│
└──────────────┼─────────────────────────────┼───────────────┘
               │                             │
       ┌───────▼───────┐             ┌───────▼───────┐
       │  PostgreSQL   │             │   (Same DB)   │
       │   Database    │             │               │
       └───────────────┘             └───────────────┘
               
       ┌───────────────────────────────────────────────┐
       │              Wasabi S3                         │
       │         (File Storage)                         │
       │   uploads/equipment_*.jpg                      │
       └───────────────────────────────────────────────┘
```

## Troubleshooting

### Database connection fails
- Ensure app and database are on the same Docker network
- Check DATABASE_URL format is correct
- Verify database container is running

### File uploads fail
- Verify all WASABI_* environment variables are set
- Check Wasabi bucket exists and keys have write permission
- Review logs for specific S3 errors

### Sessions not persisting
- Confirm SESSION_SECRET is set
- Check PostgreSQL connection is working
- Look for `user_sessions` table in database

### Build fails
- Check Coolify logs for specific errors
- Ensure all environment variables are set
- Try rebuilding with cache cleared

## Local Docker Testing

Build locally:
```bash
docker build -t equipment-pro .
```

Run locally with production settings:
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=your-db-url \
  -e SESSION_SECRET=test-secret \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY=your-key \
  -e WASABI_ACCESS_KEY_ID=your-key \
  -e WASABI_SECRET_ACCESS_KEY=your-secret \
  -e WASABI_BUCKET_NAME=your-bucket \
  -e WASABI_REGION=us-east-1 \
  -e WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com \
  equipment-pro
```

## Wasabi Regions

| Region | Endpoint |
|--------|----------|
| us-east-1 | https://s3.us-east-1.wasabisys.com |
| us-east-2 | https://s3.us-east-2.wasabisys.com |
| us-central-1 | https://s3.us-central-1.wasabisys.com |
| us-west-1 | https://s3.us-west-1.wasabisys.com |
| eu-central-1 | https://s3.eu-central-1.wasabisys.com |
| eu-central-2 | https://s3.eu-central-2.wasabisys.com |
| eu-west-1 | https://s3.eu-west-1.wasabisys.com |
| eu-west-2 | https://s3.eu-west-2.wasabisys.com |
| ap-northeast-1 | https://s3.ap-northeast-1.wasabisys.com |
| ap-northeast-2 | https://s3.ap-northeast-2.wasabisys.com |
| ap-southeast-1 | https://s3.ap-southeast-1.wasabisys.com |
| ap-southeast-2 | https://s3.ap-southeast-2.wasabisys.com |
