# Biome Migration Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers:subagent-driven-development` for parallel execution.

**Goal:** Replace ESLint with Biome for faster linting and formatting across the monorepo.

**Architecture:** Install Biome at the root level and configure it to handle all packages. Remove ESLint configs and dependencies from each package. Update Turborepo tasks to use Biome. Remove Prettier since Biome handles formatting.

**Tech Stack:** Biome, Turborepo, pnpm

---

## Task 1: Install Biome at Root

**Depends on:** None
**Files:**
- Modify: `package.json`

**Step 1: Install Biome**

Run:
```bash
pnpm add -D -w @biomejs/biome
```

Expected: Biome added to root devDependencies

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install biome"
```

---

## Task 2: Create Biome Configuration

**Depends on:** Task 1
**Files:**
- Create: `biome.json`

**Step 1: Create biome.json**

Create `biome.json` at the root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "noUselessElse": "warn",
        "useConst": "error"
      },
      "complexity": {
        "noBannedTypes": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      ".turbo",
      "*.config.js",
      "*.config.ts",
      "supabase"
    ]
  }
}
```

**Step 2: Commit**

```bash
git add biome.json
git commit -m "chore: add biome configuration"
```

---

## Task 3: Update Root package.json Scripts

**Depends on:** Task 2
**Files:**
- Modify: `package.json`

**Step 1: Add Biome scripts to root package.json**

Update the scripts section:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "type-check": "turbo type-check",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "clean": "turbo clean && rm -rf node_modules"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: update root scripts to use biome"
```

---

## Task 4: Update Turborepo Configuration

**Depends on:** Task 3
**Files:**
- Modify: `turbo.json`

**Step 1: Update turbo.json**

Remove the lint task from turbo.json since Biome runs at root level now:

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
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 2: Commit**

```bash
git add turbo.json
git commit -m "chore: remove lint task from turborepo (now runs at root)"
```

---

## Task 5: Remove ESLint from apps/web

**Depends on:** Task 4
**Files:**
- Delete: `apps/web/.eslintrc.js`
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.js`

**Step 1: Delete ESLint config**

```bash
rm apps/web/.eslintrc.js
```

**Step 2: Update package.json**

Remove the lint script from `apps/web/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit"
  }
}
```

**Step 3: Disable ESLint in Next.js build**

Update `apps/web/next.config.js` to disable the built-in ESLint check during build:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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

**Step 4: Commit**

```bash
git rm apps/web/.eslintrc.js
git add apps/web/package.json apps/web/next.config.js
git commit -m "chore: remove eslint from apps/web"
```

---

## Task 6: Remove ESLint from packages/database

**Depends on:** Task 4
**Files:**
- Delete: `packages/database/.eslintrc.js`
- Modify: `packages/database/package.json`

**Step 1: Delete ESLint config**

```bash
rm packages/database/.eslintrc.js
```

**Step 2: Update package.json**

Remove the `"lint"` script from `packages/database/package.json`. The scripts section should become:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types.generated.ts"
  }
}
```

**Step 3: Commit**

```bash
git rm packages/database/.eslintrc.js
git add packages/database/package.json
git commit -m "chore: remove eslint from packages/database"
```

---

## Task 7: Remove ESLint from packages/validation

**Depends on:** Task 4
**Files:**
- Delete: `packages/validation/.eslintrc.js`
- Modify: `packages/validation/package.json`

**Step 1: Delete ESLint config**

```bash
rm packages/validation/.eslintrc.js
```

**Step 2: Update package.json**

Remove the `"lint"` script from `packages/validation/package.json`. The scripts section should become:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

**Step 3: Commit**

```bash
git rm packages/validation/.eslintrc.js
git add packages/validation/package.json
git commit -m "chore: remove eslint from packages/validation"
```

---

## Task 8: Remove ESLint from packages/config

**Depends on:** Task 4
**Files:**
- Delete: `packages/config/eslint/index.js`
- Modify: `packages/config/package.json`

**Step 1: Delete ESLint config file**

```bash
rm packages/config/eslint/index.js
rmdir packages/config/eslint
```

**Step 2: Update package.json**

Remove ESLint-related exports and devDependencies from `packages/config/package.json`:

```json
{
  "name": "@bibleclips/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./typescript/base": "./typescript/base.json",
    "./typescript/nextjs": "./typescript/nextjs.json",
    "./tailwind": "./tailwind/index.ts"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 3: Commit**

```bash
git rm -r packages/config/eslint
git add packages/config/package.json
git commit -m "chore: remove eslint config package"
```

---

## Task 9: Remove Prettier (Optional - Biome handles formatting)

**Depends on:** Task 8
**Files:**
- Modify: `package.json`
- Delete: `.prettierrc` (if exists)
- Delete: `.prettierignore` (if exists)

**Step 1: Check for Prettier config files**

```bash
ls -la .prettierrc .prettierignore 2>/dev/null || echo "No prettier config files"
```

**Step 2: Remove Prettier from root devDependencies**

Update root `package.json` to remove prettier:

```json
{
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "turbo": "^2.0.0"
  }
}
```

**Step 3: Delete Prettier config files if they exist**

```bash
rm -f .prettierrc .prettierignore
```

**Step 4: Commit**

```bash
git add package.json .prettierrc .prettierignore 2>/dev/null
git commit -m "chore: remove prettier (biome handles formatting)"
```

---

## Task 10: Fix Existing Lint Errors

**Depends on:** Task 9
**Files:**
- Modify: Files flagged by Biome (varies based on output)

**Step 1: Run Biome check to see errors**

```bash
pnpm check
```

**Step 2: Auto-fix what can be fixed**

```bash
pnpm check:fix
```

**Step 3: Manually fix remaining errors**

Review output and fix any errors that can't be auto-fixed.

**Step 4: Commit**

```bash
git add .
git commit -m "fix: resolve biome lint errors"
```

---

## Task 11: Reinstall Dependencies

**Depends on:** Task 10
**Files:**
- Modify: `pnpm-lock.yaml`

**Step 1: Remove node_modules and reinstall**

```bash
pnpm clean
pnpm install
```

This ensures all ESLint packages are removed from the lockfile.

**Step 2: Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: clean up lockfile after eslint removal"
```

---

## Task 12: Verify Build and Type-Check

**Depends on:** Task 11
**Files:**
- Test: All files

**Step 1: Run type-check**

```bash
pnpm type-check
```

Expected: No TypeScript errors

**Step 2: Run build**

```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors (or only warnings)

---

## Task 13: Update Documentation

**Depends on:** Task 12
**Files:**
- Modify: `CLAUDE.md` (if lint commands are mentioned)

**Step 1: Check if CLAUDE.md mentions ESLint**

Review CLAUDE.md for any references to ESLint or lint commands.

**Step 2: Update if needed**

Replace any ESLint references with Biome equivalents.

**Step 3: Commit if changes made**

```bash
git add CLAUDE.md
git commit -m "docs: update lint references to biome"
```

---

## Task 14: Verification Gate

**Depends on:** Task 13
**Files:**
- Test: All files

This task verifies the migration is complete.

**Do not close until ALL criteria are met:**

1. `pnpm lint` runs without errors
2. `pnpm build` succeeds
3. `pnpm type-check` passes
4. No ESLint config files remain in the repo
5. No ESLint packages in any package.json

**Note for developers:** Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) for real-time linting and formatting in your editor.

---

## Verification Record

### Plan Verification Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Complete | ✓ | All ESLint configs identified and removal planned |
| Accurate | ✓ | File paths verified via Glob |
| Commands valid | ✓ | pnpm and biome commands are standard |
| YAGNI | ✓ | Only essential migration tasks |
| Minimal | ✓ | Could combine some tasks but kept separate for clarity |
| Not over-engineered | ✓ | Direct replacement, no unnecessary complexity |

### Rule-of-Five Passes
| Pass | Changes Made |
|------|--------------|
| Draft | Initial structure with 13 tasks + verification gate |
| Correctness | Fixed: git rm for deleted files, updated Biome to v2.0.0 |
| Clarity | Added explicit package.json script outputs for Tasks 6-7 |
| Edge Cases | Added: Disable ESLint in next.config.js for Next.js build |
| Excellence | Added VS Code extension note, renumbered Verification Gate to Task 14 |
