# BibleClips Development Guide

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20+ |
| pnpm | 8.15.0+ |
| Supabase CLI | latest |

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/nk18chi/BibleClips.git
cd BibleClips
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit with your values
nano apps/web/.env.local
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for required variables.

### 4. Database Setup

#### Option A: Supabase Cloud (Recommended)

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection string to `.env.local`
3. Run migrations:

```bash
pnpm db:migrate
```

#### Option B: Local Supabase

```bash
# Start local Supabase
supabase start

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Application runs at: http://localhost:3000

## Development Commands

### General

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm format` | Format with Prettier |
| `pnpm clean` | Clean build artifacts |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Run migrations |
| `pnpm db:reset` | Reset database |
| `pnpm db:seed` | Seed initial data |
| `pnpm db:types` | Generate TypeScript types |
| `pnpm db:studio` | Open Supabase Studio |

### Monorepo

| Command | Description |
|---------|-------------|
| `pnpm --filter web dev` | Run only web app |
| `pnpm --filter @bibleclips/database build` | Build database package |

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (no auth required)
│   ├── (auth)/            # Authentication routes
│   ├── (user)/            # Authenticated user routes
│   └── (admin)/           # Admin-only routes
├── components/            # React components
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
├── styles/                # Global styles
└── public/                # Static assets

packages/
├── database/              # Supabase client + types
├── ui/                    # Shared UI components
├── validation/            # Zod schemas
└── config/                # Shared configuration
```

## Coding Standards

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types for functions
- Use interfaces for object shapes

### React

- Server Components by default
- Client Components only when needed (interactivity, hooks)
- Use `"use client"` directive explicitly
- Prefer composition over inheritance

### Styling

- Tailwind CSS for all styling
- Use shadcn/ui components
- Follow mobile-first approach
- Use CSS variables for theming

### Validation

- Zod schemas for all input validation
- Validate at API boundaries
- Shared schemas in `packages/validation`

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ClipCard.tsx` |
| Utilities | camelCase | `formatVerse.ts` |
| Routes | kebab-case | `my-clips/page.tsx` |
| Types | PascalCase | `Clip.ts` |
| Schemas | camelCase | `clipSchema.ts` |

## Git Workflow

### Branches

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add clip submission form
fix: correct vote count display
docs: update development guide
chore: upgrade dependencies
refactor: simplify auth flow
```

### Pull Requests

1. Create feature branch from `main`
2. Make changes with atomic commits
3. Run `pnpm lint && pnpm type-check`
4. Create PR with description
5. Request review
6. Squash merge to `main`

## Adding a New Feature

### 1. Create Validation Schema

```typescript
// packages/validation/src/feature.ts
import { z } from 'zod';

export const featureSchema = z.object({
  name: z.string().min(1).max(100),
  // ...
});
```

### 2. Add Database Query

```typescript
// packages/database/src/queries/feature.ts
import { supabase } from '../client';

export async function getFeatures() {
  const { data, error } = await supabase
    .from('features')
    .select('*');
  // ...
}
```

### 3. Create Component

```tsx
// apps/web/components/feature/FeatureCard.tsx
interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  return (
    // ...
  );
}
```

### 4. Add Route

```tsx
// apps/web/app/(public)/feature/page.tsx
export default async function FeaturePage() {
  const features = await getFeatures();
  return (
    // ...
  );
}
```

## Troubleshooting

### Common Issues

**pnpm install fails**
```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

**Type generation fails**
```bash
pnpm db:types
```

**Port already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

### Getting Help

1. Check existing documentation
2. Search closed issues
3. Create new issue with reproduction steps
