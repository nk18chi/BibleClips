# BibleClips Service Design

**Date**: 2026-01-05
**Status**: Approved
**Author**: Claude AI + User

## Overview

BibleClips is a community-driven platform connecting Bible verses to sermon video clips from YouTube. Users can discover clips by Bible verse or life category, and contribute their own clips from YouTube sermons.

## Problems

### 1. Wasted Time on Meaningless Content
People spend hours scrolling YouTube and Instagram reels with little value. This time could be spent more meaningfully on spiritual content.

### 2. Scripture is Hard to Understand Alone
Reading Bible verses without context or explanation can be confusing. Pastor messages provide interpretation, real-life application, and deeper understanding that text alone cannot deliver.

## Solution

A searchable database of sermon clips with a **reel-like viewing experience**. Users can:
- Replace mindless scrolling with spiritually enriching short clips
- Understand scripture better through pastor explanations
- Swipe through multiple clips on the same verse or category

## Core User Journeys

### 1. Discover by Scripture
User reads Philippians 4:6, searches on BibleClips, finds multiple pastor clips, **swipes through them like reels** - continuous, engaging viewing.

### 2. Discover by Life Situation
User feels anxious, browses "Anxiety" category, **swipes through sermon clips** addressing anxiety with relevant scripture.

### 3. Contribute
User finds a powerful sermon segment, submits clip with verse and category. Admin approves, others benefit.

## Key Differentiators

- **Reel-like UX** - Following [Instagram Reels](https://www.instagram.com/reels/) UI pattern: vertical swipe, full-screen video, action buttons on right side
- **Dual-language subtitles** - CSS/JS overlay showing original + translation
  - Example: `God loves you (神はあなたを愛しています)`
- **Verse-level precision** - Specific verse references
- **Community curation** - Voting surfaces best clips
- **Bilingual** - EN/JP from day one

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target Audience | EN/JP bilingual, more languages later | Start focused, expand with i18n architecture |
| Content Model | Open submissions + admin approval | Quality control while allowing community input |
| Authentication | Supabase Auth (email/password), social later | Simple MVP, architecture ready for OAuth |
| Categories | Fixed admin-defined list | Quality control, consistent taxonomy |
| Bible Reference | Always Book + Chapter + Verse(s) | Precise searchability |
| Multiple Clips | Community voting + admin featured | Democratic curation with editorial control |
| Video Viewing | YouTube embed + link, custom subtitle overlay | No video hosting, respect copyright |
| Subtitles | Auto-fetch YouTube captions | Leverage existing data, minimal manual work |
| Bible Text | Fetch via Bible API | Show verse alongside clip |
| Platform | Mobile-first web, React Native later | Fast MVP, shared JS ecosystem for future |
| Monetization | Free first, donations later | Focus on value, monetize when community grows |
| Tech Stack | Next.js + Supabase (no GraphQL) | Match ChurchConnect patterns, simplified for Supabase |

## Database Schema

### users (extends Supabase Auth)
```sql
- id UUID PRIMARY KEY REFERENCES auth.users(id)
- display_name TEXT
- preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ja'))
- role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()
```

### clips
```sql
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- youtube_video_id TEXT NOT NULL
- start_time INTEGER NOT NULL -- seconds
- end_time INTEGER NOT NULL -- seconds
- title TEXT NOT NULL
- title_ja TEXT
- description TEXT
- description_ja TEXT
- submitted_by UUID REFERENCES users(id) NOT NULL
- approved_by UUID REFERENCES users(id)
- status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
- is_featured BOOLEAN DEFAULT FALSE
- vote_count INTEGER DEFAULT 0
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()
```

### clip_verses
```sql
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- clip_id UUID REFERENCES clips(id) ON DELETE CASCADE
- book TEXT NOT NULL -- e.g., 'Philippians'
- book_ja TEXT NOT NULL -- e.g., 'ピリピ人への手紙'
- chapter INTEGER NOT NULL
- verse_start INTEGER NOT NULL
- verse_end INTEGER
- UNIQUE(clip_id, book, chapter, verse_start)
```

### categories
```sql
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- slug TEXT UNIQUE NOT NULL
- name_en TEXT NOT NULL
- name_ja TEXT NOT NULL
- sort_order INTEGER DEFAULT 0
- created_at TIMESTAMPTZ DEFAULT NOW()
```

### clip_categories
```sql
- clip_id UUID REFERENCES clips(id) ON DELETE CASCADE
- category_id UUID REFERENCES categories(id) ON DELETE CASCADE
- PRIMARY KEY (clip_id, category_id)
```

### votes
```sql
- user_id UUID REFERENCES users(id) ON DELETE CASCADE
- clip_id UUID REFERENCES clips(id) ON DELETE CASCADE
- created_at TIMESTAMPTZ DEFAULT NOW()
- PRIMARY KEY (user_id, clip_id)
```

### Indexes
```sql
- clips(status)
- clips(vote_count DESC)
- clips(submitted_by)
- clip_verses(book, chapter, verse_start)
- categories(slug)
```

## Page Structure

### Public Pages
| Route | Description |
|-------|-------------|
| `/` | Home - category grid + search |
| `/verse/[book]/[chapter]/[verse]` | Reel viewer for verse clips |
| `/category/[slug]` | Reel viewer for category clips |
| `/clip/[id]` | Single clip view (shareable) |

### Authenticated Pages
| Route | Description |
|-------|-------------|
| `/submit` | Submit new clip |
| `/my-clips` | User's submissions |

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin/pending` | Review pending clips |
| `/admin/categories` | Manage categories |

## Subtitle Overlay System

### Flow
1. Fetch captions via YouTube Data API
2. Parse timing (start, duration, text)
3. Sync with YouTube IFrame API playback
4. Render CSS overlay with current caption
5. Show original + translation for non-native videos

### User Settings
- Toggle subtitles ON/OFF
- Show original only / translation only / both
- Font size (S/M/L)

## UI Design

### Reference
- **Reel Viewer**: [Instagram Reels](https://www.instagram.com/reels/) - vertical swipe, full-screen, action buttons on right

### Reel Viewer Layout (following Instagram Reels)
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│      YouTube Video (Full Screen)    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ God loves you               │    │
│  │ (神はあなたを愛しています)    │    │
│  └─────────────────────────────┘    │
│                               ┌───┐ │
│                               │ ❤️│ │  ← Like
│                               │42 │ │
│                               ├───┤ │
│                               │ 💬│ │  ← Comments (future)
│                               ├───┤ │
│                               │ 📤│ │  ← Share
│                               ├───┤ │
│  ┌──────────────────────────┐ │ ▶️│ │  ← Full sermon
│  │ 📖 Philippians 4:6       │ └───┘ │
│  │ "Be anxious for nothing" │       │
│  │ Pastor John · Grace Church│       │
│  └──────────────────────────┘       │
│         ↑ Swipe up for next         │
└─────────────────────────────────────┘
```

### Key UI Elements
| Element | Behavior |
|---------|----------|
| Swipe up/down | Navigate between clips |
| Tap video | Pause/play |
| Double tap | Like |
| Right side buttons | Like, share, full sermon link |
| Bottom overlay | Bible verse, pastor info |
| Subtitle overlay | Dual-language captions on video |

### Home Page Layout
```
┌─────────────────────────────────────┐
│  BibleClips              [EN|JP] 👤 │
├─────────────────────────────────────┤
│  🔍 Search verse (John 3:16)        │
├─────────────────────────────────────┤
│  Categories                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Anxie│ │Anger│ │Fear │ │Pride│   │
│  │ty   │ │     │ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Depre│ │Forgi│ │Hope │ │Love │   │
│  │ssion│ │venes│ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
├─────────────────────────────────────┤
│  Featured Clips                     │
│  ┌──────────────────────────────┐   │
│  │ [Thumbnail]  Clip Title      │   │
│  │              Phil 4:6 · ❤️ 42│   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ [Thumbnail]  Clip Title      │   │
│  │              John 3:16 · ❤️ 28│   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## MVP Scope

### Phase 1 (MVP)
- Browse by verse
- Browse by category
- Reel-style viewer
- User auth (email/password)
- Submit clip
- Admin approval
- Voting
- Bilingual UI (EN/JP)

### Phase 2
- Subtitle overlay
- Featured clips
- Social login
- Bible verse display

### Phase 3+
- React Native app
- Donations
- More languages
- Playlists
- Social sharing

### Out of Scope
- Video downloading/hosting
- User comments/discussions
- Pastor/church profiles
- Live streaming

## External APIs

| Service | Purpose |
|---------|---------|
| YouTube IFrame API | Embed video player |
| YouTube Data API | Fetch metadata, captions |
| wldeh/bible-api (jsDelivr CDN) | Fetch verse text (no API key) |

### Bible API Details

Using [wldeh/bible-api](https://github.com/wldeh/bible-api) via jsDelivr CDN:
- No API key required
- MIT License
- Supports English (KJV, WEB, ASV) and Japanese (口語訳)

```typescript
// URL pattern
https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/{version}/books/{book}/chapters/{chapter}/verses/{verse}.json

// Versions
// English: en-kjv, en-web, en-asv
// Japanese: ja-kougo
```
