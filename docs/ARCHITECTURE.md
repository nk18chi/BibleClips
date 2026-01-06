# BibleClips Architecture

## System Overview

BibleClips is built on a **monorepo architecture** using Turborepo and pnpm, with a Next.js 14 frontend and Supabase backend.

### Components

- **1 Application**: Public web platform (Next.js 14)
- **4 Shared Packages**: Database, UI components, validation, configuration
- **1 PostgreSQL Database**: Hosted on Supabase
- **3 External Services**: YouTube API, Bible API, Supabase Auth

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.4+ | Type safety |
| Tailwind CSS | 3.4+ | Utility-first styling |
| shadcn/ui | latest | Pre-built UI components |
| Zod | 3.x | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | latest | PostgreSQL + Auth + Realtime |
| PostgreSQL | 15+ | Database (via Supabase) |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Web hosting |
| Supabase | Database + Auth hosting |
| YouTube API | Video embedding + captions |
| Bible API | Scripture text |

## Project Structure

```
bibleclips/
├── apps/
│   └── web/                        # Next.js 14 application
│       ├── app/
│       │   ├── (public)/           # Public routes
│       │   │   ├── page.tsx        # Home
│       │   │   ├── verse/
│       │   │   │   └── [book]/[chapter]/[verse]/
│       │   │   │       └── page.tsx
│       │   │   ├── category/
│       │   │   │   └── [slug]/
│       │   │   │       └── page.tsx
│       │   │   └── clip/
│       │   │       └── [id]/
│       │   │           └── page.tsx
│       │   ├── (auth)/             # Authentication routes
│       │   │   ├── login/
│       │   │   └── register/
│       │   ├── (user)/             # Authenticated user routes
│       │   │   ├── submit/
│       │   │   └── my-clips/
│       │   └── (admin)/            # Admin routes
│       │       ├── pending/
│       │       └── categories/
│       ├── components/
│       │   ├── clip-reel/          # Reel-style video player
│       │   ├── subtitle-overlay/   # Caption overlay system
│       │   ├── verse-display/      # Bible verse rendering
│       │   └── ui/                 # shadcn/ui components
│       ├── lib/
│       │   ├── supabase/           # Supabase client helpers
│       │   └── youtube/            # YouTube API helpers
│       └── styles/
├── packages/
│   ├── database/                   # Supabase client + types
│   │   ├── src/
│   │   │   ├── client.ts           # Supabase client factory
│   │   │   ├── types.ts            # Generated database types
│   │   │   └── queries/            # Reusable query functions
│   │   │       ├── clips.ts
│   │   │       ├── categories.ts
│   │   │       ├── votes.ts
│   │   │       └── users.ts
│   │   └── package.json
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   └── components/
│   │   └── package.json
│   ├── validation/                 # Zod schemas
│   │   ├── src/
│   │   │   ├── clip.ts
│   │   │   ├── category.ts
│   │   │   └── user.ts
│   │   └── package.json
│   └── config/                     # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Database Architecture

### Entity Relationship

```
users
  │
  ├──< clips (submitted_by)
  │      │
  │      ├──< clip_verses
  │      │
  │      └──< clip_categories >── categories
  │
  └──< votes >── clips
```

### Key Tables

| Table | Purpose |
|-------|---------|
| users | User profiles (extends Supabase Auth) |
| clips | Sermon video clips |
| clip_verses | Bible verse references |
| categories | Life situation categories |
| clip_categories | Clip-category junction |
| votes | User votes on clips |

### Row Level Security (RLS)

| Table | Read | Write |
|-------|------|-------|
| clips | APPROVED: public, PENDING: owner/admin | Owner: insert, Admin: update |
| votes | Own votes only | Own votes only |
| categories | Public | Admin only |
| users | Own profile | Own profile |

### Indexes

```sql
CREATE INDEX idx_clips_status ON clips(status);
CREATE INDEX idx_clips_vote_count ON clips(vote_count DESC);
CREATE INDEX idx_clips_submitted_by ON clips(submitted_by);
CREATE INDEX idx_clip_verses_lookup ON clip_verses(book, chapter, verse_start);
CREATE INDEX idx_categories_slug ON categories(slug);
```

## Authentication

### Supabase Auth

- Email/password authentication (MVP)
- Social login ready (Google, Apple - Phase 2)
- JWT-based sessions
- Role stored in `users.role` ('USER' | 'ADMIN')

### Authorization

| Role | Permissions |
|------|-------------|
| Anonymous | Read approved clips, categories |
| USER | + Vote, submit clips, view own submissions |
| ADMIN | + Approve/reject clips, manage categories, feature clips |

## External API Integration

### YouTube IFrame API
- Embed video player
- Control playback (start/end time)
- Listen to state changes for subtitle sync

### YouTube Data API
- Fetch video metadata (title, thumbnail)
- Fetch auto-generated captions
- Rate limited: cache responses

### Bible API (wldeh/bible-api via jsDelivr CDN)
- Fetch verse text by reference
- No API key required
- Multiple translations: English (KJV, WEB, ASV) + Japanese (口語訳)
- CDN-hosted, fast and reliable
- Cache responses in Supabase for offline/faster access

```typescript
// URL pattern
const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${book}/chapters/${chapter}/verses/${verse}.json`;

// Examples
// English: en-kjv, en-web, en-asv
// Japanese: ja-kougo
```

## Caching Strategy

| Data | Cache Location | TTL |
|------|----------------|-----|
| Bible verses | Supabase | Permanent |
| YouTube metadata | Supabase | 7 days |
| YouTube captions | Supabase | 7 days |
| Clip lists | Edge (Vercel) | 1 minute |

## Performance Considerations

### Database
- Denormalized `vote_count` on clips for fast sorting
- Indexes on frequently queried columns
- RLS policies for security at database level

### Frontend
- Server Components by default
- Client Components only for interactivity (video player, voting)
- Image optimization via Next.js Image
- Route-based code splitting

### Video
- YouTube handles all video delivery
- Start/end time parameters for clip playback
- Lazy load video players below fold
