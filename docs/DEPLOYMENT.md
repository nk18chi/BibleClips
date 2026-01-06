# BibleClips Deployment Guide

## Overview

BibleClips uses a split deployment architecture:

| Component | Platform |
|-----------|----------|
| Web Application | Vercel |
| Database | Supabase |
| Auth | Supabase Auth |

## Prerequisites

- Vercel account
- Supabase project
- GitHub repository connected to Vercel
- YouTube API key
- Bible API key

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note the project URL and anon key

### 2. Run Migrations

```bash
# Link to Supabase project
supabase link --project-ref <project-id>

# Push migrations
supabase db push
```

### 3. Configure Auth

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates (optional)
4. Set Site URL to production domain

### 4. Set Up RLS Policies

Policies are applied via migrations. Verify in Supabase Dashboard:
- Table Editor > Select table > Policies

### 5. Seed Initial Data

```bash
# Seed categories
pnpm db:seed
```

## Vercel Setup

### 1. Import Project

1. Go to [vercel.com](https://vercel.com)
2. Import Git repository
3. Select `apps/web` as root directory

### 2. Configure Build

```json
{
  "buildCommand": "pnpm turbo build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install"
}
```

### 3. Set Environment Variables

Add all variables from [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase dashboard |
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | From Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Production URL |

### 4. Deploy

```bash
# Deploy to production
vercel --prod
```

Or push to `main` branch for automatic deployment.

## Domain Setup

### 1. Add Custom Domain in Vercel

1. Go to Project Settings > Domains
2. Add domain
3. Configure DNS records

### 2. Update Supabase

1. Go to Authentication > URL Configuration
2. Update Site URL to production domain
3. Add domain to Redirect URLs

## CI/CD Pipeline

### GitHub Actions (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm build

      # Vercel handles deployment via Git integration
```

## Post-Deployment Checklist

### Verify Functionality

- [ ] Home page loads
- [ ] Authentication works (register, login, logout)
- [ ] Clips display correctly
- [ ] Video playback works
- [ ] Voting works (authenticated)
- [ ] Clip submission works
- [ ] Admin functions work

### Verify Configuration

- [ ] Environment variables set correctly
- [ ] Supabase RLS policies active
- [ ] CORS configured properly
- [ ] SSL certificate active

### Monitor

- [ ] Set up error tracking (Sentry - future)
- [ ] Monitor Supabase usage
- [ ] Monitor Vercel analytics
- [ ] Check YouTube API quota

## Rollback Procedure

### Vercel

1. Go to Deployments
2. Find last working deployment
3. Click "..." > "Promote to Production"

### Database

```bash
# Revert last migration
supabase db reset

# Or restore from backup
supabase db restore <backup-id>
```

## Scaling Considerations

### Database

- Enable connection pooling (Supabase > Settings > Database)
- Monitor query performance
- Add indexes as needed

### Caching

- Enable Vercel Edge caching
- Cache Bible API responses
- Cache YouTube metadata

### Rate Limiting

- YouTube API: 10,000 units/day (monitor usage)
- Supabase: Based on plan limits
- Add rate limiting middleware if needed

## Maintenance

### Regular Tasks

| Task | Frequency |
|------|-----------|
| Review error logs | Daily |
| Check API quotas | Weekly |
| Database backup verification | Weekly |
| Dependency updates | Monthly |
| Security audit | Quarterly |

### Updating Dependencies

```bash
# Check for updates
pnpm outdated

# Update dependencies
pnpm update

# Test thoroughly before deploying
pnpm lint && pnpm type-check && pnpm build
```
