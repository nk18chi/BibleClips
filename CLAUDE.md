# BibleClips

A community-driven platform connecting Bible verses to sermon video clips from YouTube.

## Project Overview

BibleClips allows users to discover sermon clips by Bible verse or life category (anxiety, anger, depression, etc.), and contribute their own clips from YouTube sermons. The goal is to redirect "scroll time" into spiritually enriching content with a reel-like viewing experience.

### Key Problems Solved

1. **Wasted Time on Meaningless Content**: People spend hours scrolling YouTube and Instagram reels with little value. This time could be spent more meaningfully on spiritual content.

2. **Scripture is Hard to Understand Alone**: Reading Bible verses without context or explanation can be confusing. Pastor messages provide interpretation, real-life application, and deeper understanding.

### Key Features

- **Reel-like UX**: Familiar swipe experience with meaningful sermon content
- **Dual-language subtitles**: CSS/JS overlay showing original + translation (e.g., `God loves you (神はあなたを愛しています)`)
- **Verse-level precision**: Specific Bible verse references, not general topics
- **Community curation**: Voting surfaces best explanations
- **Bilingual**: EN/JP from day one

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.4+ |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Validation | Zod |
| Monorepo | Turborepo + pnpm |
| Hosting | Vercel (web) + Supabase (DB) |

## Project Structure

```
bibleclips/
├── apps/
│   └── web/                    # Main public website (Next.js 14)
│       ├── app/
│       │   ├── (public)/       # Public routes (home, verse, category)
│       │   ├── (auth)/         # Auth routes (login, register)
│       │   ├── (user)/         # Authenticated routes (submit, my-clips)
│       │   └── (admin)/        # Admin routes (pending, categories)
│       └── components/
├── packages/
│   ├── database/               # Supabase client + types
│   ├── ui/                     # Shared UI components (shadcn/ui)
│   ├── validation/             # Zod schemas
│   └── config/                 # Shared config
└── docs/                       # Documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and tech decisions
- [Development](docs/DEVELOPMENT.md) - Setup and development workflow
- [Deployment](docs/DEPLOYMENT.md) - Deployment procedures
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md) - Required configuration
- [Security](docs/SECURITY.md) - Security guidelines
- [Testing](docs/TESTING.md) - Testing procedures

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local

# Run development server
pnpm dev
```

## Key Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run linting
pnpm type-check   # Run TypeScript checks
pnpm format       # Format code with Prettier
```

## Database

Using Supabase PostgreSQL. Key tables:
- `users` - User profiles (extends Supabase Auth)
- `clips` - Sermon video clips
- `clip_verses` - Bible verse references for clips
- `categories` - Life situation categories (admin-managed)
- `clip_categories` - Clip-category relationships
- `votes` - User votes on clips

## External APIs

| Service | Purpose |
|---------|---------|
| YouTube IFrame API | Embed video player with start/end time |
| YouTube Data API | Fetch video metadata, captions |
| wldeh/bible-api (CDN) | Fetch verse text (no API key, MIT license) |

## Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Zod for all input validation
- Server Components by default, Client Components only when needed

### Git
- Feature branches from `main`
- Conventional commits (feat:, fix:, docs:, etc.)
- PR required for merging to main

### File Naming
- Components: PascalCase (`ClipCard.tsx`)
- Utilities: camelCase (`formatVerse.ts`)
- Routes: kebab-case (`my-clips/page.tsx`)
