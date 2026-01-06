# BibleClips MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a community-driven platform connecting Bible verses to sermon video clips with Instagram Reels-style UI.

**Architecture:** Next.js 14 monorepo with Supabase backend. Mobile-first web app with vertical swipe reel viewer. User submissions with admin approval workflow.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (DB + Auth), Turborepo, pnpm

---

## Phase 1: Project Setup

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Create root package.json**

```json
{
  "name": "bibleclips",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "prettier": "^3.2.5",
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 4: Create .gitignore**

```
# Dependencies
node_modules
.pnpm-store

# Build outputs
.next
dist
.turbo

# Environment
.env
.env.local
.env.*.local

# IDE
.idea
.vscode
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage
```

**Step 5: Create .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

**Step 6: Initialize git and commit**

Run: `git add . && git commit -m "chore: initialize monorepo with turborepo"`

---

### Task 2: Create Shared Config Package

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/eslint/index.js`
- Create: `packages/config/typescript/base.json`
- Create: `packages/config/typescript/nextjs.json`
- Create: `packages/config/tailwind/index.ts`

**Step 1: Create packages/config/package.json**

```json
{
  "name": "@bibleclips/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./eslint": "./eslint/index.js",
    "./typescript/base": "./typescript/base.json",
    "./typescript/nextjs": "./typescript/nextjs.json",
    "./tailwind": "./tailwind/index.ts"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create packages/config/eslint/index.js**

```javascript
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "error",
  },
  ignorePatterns: ["node_modules", "dist", ".next", ".turbo"],
};
```

**Step 3: Create packages/config/typescript/base.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  },
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

**Step 4: Create packages/config/typescript/nextjs.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "jsx": "preserve",
    "allowJs": true,
    "incremental": true
  }
}
```

**Step 5: Create packages/config/tailwind/index.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Partial<Config> = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 6: Commit**

Run: `git add . && git commit -m "chore: add shared config package"`

---

### Task 3: Create Validation Package

**Files:**
- Create: `packages/validation/package.json`
- Create: `packages/validation/tsconfig.json`
- Create: `packages/validation/src/index.ts`
- Create: `packages/validation/src/clip.ts`
- Create: `packages/validation/src/category.ts`
- Create: `packages/validation/src/user.ts`
- Create: `packages/validation/src/verse.ts`

**Step 1: Create packages/validation/package.json**

```json
{
  "name": "@bibleclips/validation",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@bibleclips/config": "workspace:*",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create packages/validation/tsconfig.json**

```json
{
  "extends": "@bibleclips/config/typescript/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/validation/src/verse.ts**

```typescript
import { z } from "zod";

// Bible book names (English)
export const bibleBooks = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
  "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
] as const;

export const verseSchema = z.object({
  book: z.string().min(1),
  bookJa: z.string().min(1),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(1).max(176).optional(),
}).refine(
  (data) => !data.verseEnd || data.verseEnd >= data.verseStart,
  { message: "verseEnd must be >= verseStart" }
);

export type Verse = z.infer<typeof verseSchema>;

// Helper to format verse reference
export function formatVerseRef(verse: Verse): string {
  const { book, chapter, verseStart, verseEnd } = verse;
  if (verseEnd && verseEnd !== verseStart) {
    return `${book} ${chapter}:${verseStart}-${verseEnd}`;
  }
  return `${book} ${chapter}:${verseStart}`;
}

// Helper to create Bible Gateway URL
export function getBibleGatewayUrl(verse: Verse, version = "NIV"): string {
  const ref = formatVerseRef(verse);
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${version}`;
}
```

**Step 4: Create packages/validation/src/clip.ts**

```typescript
import { z } from "zod";
import { verseSchema } from "./verse";

export const youtubeVideoIdSchema = z.string().regex(
  /^[a-zA-Z0-9_-]{11}$/,
  "Invalid YouTube video ID"
);

export const clipStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export type ClipStatus = z.infer<typeof clipStatusSchema>;

export const clipSubmissionSchema = z.object({
  youtubeVideoId: youtubeVideoIdSchema,
  startTime: z.number().int().min(0),
  endTime: z.number().int().min(1),
  title: z.string().min(1).max(200),
  titleJa: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  descriptionJa: z.string().max(1000).optional(),
  verses: z.array(verseSchema).min(1).max(10),
  categoryIds: z.array(z.string().uuid()).min(1).max(5),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: "End time must be after start time" }
).refine(
  (data) => data.endTime - data.startTime <= 600,
  { message: "Clip duration must be 10 minutes or less" }
);

export type ClipSubmission = z.infer<typeof clipSubmissionSchema>;

export const clipUpdateSchema = z.object({
  status: clipStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
});

export type ClipUpdate = z.infer<typeof clipUpdateSchema>;
```

**Step 5: Create packages/validation/src/category.ts**

```typescript
import { z } from "zod";

export const categorySchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  nameEn: z.string().min(1).max(100),
  nameJa: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryCreateSchema = categorySchema;
export const categoryUpdateSchema = categorySchema.partial();
```

**Step 6: Create packages/validation/src/user.ts**

```typescript
import { z } from "zod";

export const userRoleSchema = z.enum(["USER", "ADMIN"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const preferredLanguageSchema = z.enum(["en", "ja"]);

export type PreferredLanguage = z.infer<typeof preferredLanguageSchema>;

export const userProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  preferredLanguage: preferredLanguageSchema.default("en"),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const userProfileUpdateSchema = userProfileSchema.partial();
```

**Step 7: Create packages/validation/src/index.ts**

```typescript
// Verse
export {
  verseSchema,
  bibleBooks,
  formatVerseRef,
  getBibleGatewayUrl,
  type Verse,
} from "./verse";

// Clip
export {
  youtubeVideoIdSchema,
  clipStatusSchema,
  clipSubmissionSchema,
  clipUpdateSchema,
  type ClipStatus,
  type ClipSubmission,
  type ClipUpdate,
} from "./clip";

// Category
export {
  categorySchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  type Category,
} from "./category";

// User
export {
  userRoleSchema,
  preferredLanguageSchema,
  userProfileSchema,
  userProfileUpdateSchema,
  type UserRole,
  type PreferredLanguage,
  type UserProfile,
} from "./user";
```

**Step 8: Commit**

Run: `git add . && git commit -m "feat: add validation package with Zod schemas"`

---

### Task 4: Create Database Package

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/types.ts`

**Step 1: Create packages/database/package.json**

```json
{
  "name": "@bibleclips/database",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./types": "./src/types.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types.generated.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.43.0"
  },
  "devDependencies": {
    "@bibleclips/config": "workspace:*",
    "supabase": "^1.167.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create packages/database/tsconfig.json**

```json
{
  "extends": "@bibleclips/config/typescript/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/database/src/types.ts**

```typescript
// Database types - will be generated by Supabase CLI
// For now, define manually based on our schema

export type UserRole = "USER" | "ADMIN";
export type PreferredLanguage = "en" | "ja";
export type ClipStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  display_name: string | null;
  preferred_language: PreferredLanguage;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  title: string;
  title_ja: string | null;
  description: string | null;
  description_ja: string | null;
  submitted_by: string;
  approved_by: string | null;
  status: ClipStatus;
  is_featured: boolean;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClipVerse {
  id: string;
  clip_id: string;
  book: string;
  book_ja: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_ja: string;
  sort_order: number;
  created_at: string;
}

export interface ClipCategory {
  clip_id: string;
  category_id: string;
}

export interface Vote {
  user_id: string;
  clip_id: string;
  created_at: string;
}

// Query result types
export interface ClipWithRelations extends Clip {
  verses: ClipVerse[];
  categories: Category[];
  submitted_by_user: User | null;
}
```

**Step 4: Create packages/database/src/client.ts**

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminClient;
}

// For server components
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey);
}
```

**Step 5: Create packages/database/src/index.ts**

```typescript
export { getSupabaseClient, getSupabaseAdminClient, createServerSupabaseClient } from "./client";
export * from "./types";
```

**Step 6: Commit**

Run: `git add . && git commit -m "feat: add database package with Supabase client"`

---

### Task 5: Create Next.js Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/.eslintrc.js`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/.env.example`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@bibleclips/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@bibleclips/database": "workspace:*",
    "@bibleclips/validation": "workspace:*",
    "@supabase/ssr": "^0.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@bibleclips/config": "workspace:*",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "@bibleclips/config/typescript/nextjs",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create apps/web/next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bibleclips/database", "@bibleclips/validation", "@bibleclips/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

module.exports = nextConfig;
```

**Step 4: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";
import sharedConfig from "@bibleclips/config/tailwind";

const config: Config = {
  ...sharedConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
```

**Step 5: Create apps/web/postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 6: Create apps/web/.eslintrc.js**

```javascript
module.exports = {
  extends: ["@bibleclips/config/eslint", "next/core-web-vitals"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
```

**Step 7: Create apps/web/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}
```

**Step 8: Create apps/web/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BibleClips",
  description: "Discover sermon clips by Bible verse or life category",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 9: Create apps/web/app/page.tsx**

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">BibleClips</h1>
      <p className="text-lg text-gray-600">
        Discover sermon clips by Bible verse or life category
      </p>
    </main>
  );
}
```

**Step 10: Create apps/web/.env.example**

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

# Bible API (no key required - using jsDelivr CDN)
NEXT_PUBLIC_BIBLE_API_URL=https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles
```

**Step 11: Commit**

Run: `git add . && git commit -m "feat: add Next.js web app scaffold"`

---

### Task 6: Install Dependencies and Verify Setup

**Step 1: Install all dependencies**

Run: `pnpm install`

Expected: Dependencies installed successfully

**Step 2: Run type check**

Run: `pnpm type-check`

Expected: No type errors

**Step 3: Start development server**

Run: `pnpm dev`

Expected: Server starts at http://localhost:3000, home page displays

**Step 4: Commit lock file**

Run: `git add pnpm-lock.yaml && git commit -m "chore: add pnpm lock file"`

---

## Phase 2: Database Setup

### Task 7: Create Supabase Migrations

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/00001_initial_schema.sql`
- Create: `supabase/seed.sql`

**Step 1: Initialize Supabase**

Run: `cd /Users/naoki/Development/Apps/BibleClips && npx supabase init`

Expected: supabase/ directory created with config.toml

**Step 2: Create supabase/migrations/00001_initial_schema.sql**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ja')),
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clips table
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id TEXT NOT NULL,
  start_time INTEGER NOT NULL CHECK (start_time >= 0),
  end_time INTEGER NOT NULL CHECK (end_time > start_time),
  title TEXT NOT NULL,
  title_ja TEXT,
  description TEXT,
  description_ja TEXT,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clip verses table
CREATE TABLE clip_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  book_ja TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK (chapter > 0),
  verse_start INTEGER NOT NULL CHECK (verse_start > 0),
  verse_end INTEGER CHECK (verse_end IS NULL OR verse_end >= verse_start),
  UNIQUE(clip_id, book, chapter, verse_start)
);

-- Clip categories junction table
CREATE TABLE clip_categories (
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (clip_id, category_id)
);

-- Votes table
CREATE TABLE votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, clip_id)
);

-- Indexes
CREATE INDEX idx_clips_status ON clips(status);
CREATE INDEX idx_clips_vote_count ON clips(vote_count DESC);
CREATE INDEX idx_clips_submitted_by ON clips(submitted_by);
CREATE INDEX idx_clips_is_featured ON clips(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_clip_verses_lookup ON clip_verses(book, chapter, verse_start);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vote count trigger function
CREATE OR REPLACE FUNCTION update_clip_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clips SET vote_count = vote_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clips SET vote_count = vote_count - 1 WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply vote count trigger
CREATE TRIGGER votes_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_clip_vote_count();

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Step 3: Create RLS policies migration**

Create: `supabase/migrations/00002_rls_policies.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO PUBLIC
  USING (TRUE);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Clips policies
CREATE POLICY "Anyone can view approved clips"
  ON clips FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "Users can view own pending clips"
  ON clips FOR SELECT
  USING (auth.uid() = submitted_by AND status = 'PENDING');

CREATE POLICY "Admins can view all clips"
  ON clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can insert clips"
  ON clips FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admins can update clips"
  ON clips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Clip verses policies (follow clip visibility)
CREATE POLICY "Clip verses follow clip visibility"
  ON clip_verses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_verses.clip_id
      AND (
        clips.status = 'APPROVED'
        OR clips.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can insert clip verses for own clips"
  ON clip_verses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_verses.clip_id
      AND clips.submitted_by = auth.uid()
    )
  );

-- Clip categories policies (follow clip visibility)
CREATE POLICY "Clip categories follow clip visibility"
  ON clip_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_categories.clip_id
      AND (
        clips.status = 'APPROVED'
        OR clips.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can insert clip categories for own clips"
  ON clip_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_categories.clip_id
      AND clips.submitted_by = auth.uid()
    )
  );

-- Votes policies
CREATE POLICY "Anyone can view vote counts"
  ON votes FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 4: Create supabase/seed.sql**

```sql
-- Seed categories
INSERT INTO categories (slug, name_en, name_ja, sort_order) VALUES
  ('anxiety', 'Anxiety', '不安', 1),
  ('anger', 'Anger', '怒り', 2),
  ('fear', 'Fear', '恐れ', 3),
  ('depression', 'Depression', 'うつ', 4),
  ('pride', 'Pride', '高慢', 5),
  ('forgiveness', 'Forgiveness', '赦し', 6),
  ('hope', 'Hope', '希望', 7),
  ('love', 'Love', '愛', 8),
  ('faith', 'Faith', '信仰', 9),
  ('peace', 'Peace', '平安', 10),
  ('patience', 'Patience', '忍耐', 11),
  ('gratitude', 'Gratitude', '感謝', 12);
```

**Step 5: Commit**

Run: `git add . && git commit -m "feat: add Supabase migrations and seed data"`

---

## Phase 3: Core Features (Continue in next implementation session)

The remaining tasks will cover:
- Task 8-12: Authentication (Supabase Auth setup, login/register pages)
- Task 13-17: Home page with category grid and search
- Task 18-25: Reel viewer component with swipe navigation
- Task 26-30: Clip submission flow
- Task 31-35: Admin approval workflow
- Task 36-40: Voting system

---

## Execution Notes

**Testing Approach:** Manual testing for MVP (see docs/TESTING.md)

**Commit Frequency:** After each task completion

**Environment Setup Required:**
1. Create Supabase project
2. Copy environment variables to `.env.local`
3. Run migrations: `supabase db push`
4. Seed data: `supabase db seed`
