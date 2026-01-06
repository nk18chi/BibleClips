# BibleClips Environment Variables

## Overview

Environment variables are stored in `.env.local` files (not committed to git).

## Required Variables

### Supabase

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | `eyJ...` |

### YouTube API

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API key | `AIza...` |

### Application

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `BibleClips` |

## Optional Variables

### Bible API

| Variable | Description | Example |
|----------|-------------|---------|
| `BIBLE_API_KEY` | Bible API key (if required) | `xxx` |
| `BIBLE_API_URL` | Bible API base URL | `https://api.scripture.api.bible` |

### Monitoring (Phase 2)

| Variable | Description | Example |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry error tracking DSN | `https://xxx@sentry.io/xxx` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (client-side) | `https://xxx@sentry.io/xxx` |

### Analytics (Future)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | `G-XXXXXXXXXX` |

## Environment Files

### Development

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=BibleClips
```

### Production

Set in Vercel dashboard (Project Settings > Environment Variables):

- Add all required variables
- Set appropriate scopes (Production, Preview, Development)
- Mark sensitive variables as "Sensitive"

## Getting API Keys

### Supabase

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy URL, anon key, and service role key

### YouTube API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict key to YouTube Data API v3

### Bible API (Optional)

1. Go to [scripture.api.bible](https://scripture.api.bible)
2. Create an account
3. Create an application
4. Copy API key

## Security Notes

- Never commit `.env.local` files
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Service role key should NEVER be exposed to client
- Rotate keys periodically
- Use different keys for development and production

## Validation

The application validates required environment variables at startup. Missing variables will cause build/runtime errors.

```typescript
// Example validation (packages/config/src/env.ts)
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_YOUTUBE_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## Template

Create `.env.example` for reference (commit this file):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# YouTube
NEXT_PUBLIC_YOUTUBE_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=BibleClips

# Bible API (optional)
BIBLE_API_KEY=
BIBLE_API_URL=

# Monitoring (optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```
