# Testimony Clips Feature Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers:subagent-driven-development` for parallel execution.

**Goal:** Add "Testimony" as a third clip type alongside "sermon" and "song", with minimal required fields (just YouTube link, start/end time, and title).

**Architecture:** Extend the existing `clip_type` discriminator from `sermon | song` to `sermon | song | testimony`. Testimony clips require no additional metadata tables (unlike `clip_verses` for sermons or `clip_songs` for songs) — they only need the base clip fields. The same pattern of conditional form fields applies: testimony shows only title, while sermon shows verse/categories and song shows artist/song name.

**Tech Stack:** Supabase PostgreSQL (migration), Next.js 14 App Router, TypeScript, Tailwind CSS

**Key Decisions:**
- **No separate `clip_testimonies` table:** Unlike sermons (verses) and songs (artist/song), testimonies need no extra metadata. Just the base `clips` table fields suffice.
- **Testimony requires only title (optional auto-generated):** Simplest form — just pick the clip segment. Title can auto-generate as "Testimony" if left blank.
- **No categories for testimonies (like songs):** Testimonies aren't categorized by life situation. Can add later if needed.
- **Same home page filter pattern:** Add `?type=testimony` option alongside existing `sermon` and `song` filters.

---

## Task 1: Database Migration

**Depends on:** None
**Files:**
- Create: `supabase/migrations/20260209_testimony_clips.sql`

**Purpose:** Update the clip_type CHECK constraint to allow 'testimony' as a valid value.

**Step 1: Create migration file**

```sql
-- Update clip_type constraint to include testimony
ALTER TABLE clips DROP CONSTRAINT clips_clip_type_check;
ALTER TABLE clips ADD CONSTRAINT clips_clip_type_check
  CHECK (clip_type IN ('sermon', 'song', 'testimony'));
```

**Step 2: Run migration**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260209_testimony_clips.sql
git commit -m "feat(db): add testimony to clip_type constraint"
```

---

## Task 2: Update TypeScript Types

**Depends on:** Task 1
**Files:**
- Modify: `packages/database/src/types.ts:7`
- Modify: `apps/web/types/workspace.ts:34,63`

**Purpose:** Extend ClipType union to include "testimony" so TypeScript enforces the new type throughout the codebase.

**Step 1: Update database types**

In `packages/database/src/types.ts`, line 7, change:

```typescript
export type ClipType = "sermon" | "song";
```

to:

```typescript
export type ClipType = "sermon" | "song" | "testimony";
```

**Step 2: Update workspace types**

In `apps/web/types/workspace.ts`:

Line 34, change:
```typescript
clip_type: "sermon" | "song";
```

to:
```typescript
clip_type: "sermon" | "song" | "testimony";
```

Line 63, change:
```typescript
clipType: "sermon" | "song";
```

to:
```typescript
clipType: "sermon" | "song" | "testimony";
```

**Step 3: Commit**

```bash
git add packages/database/src/types.ts apps/web/types/workspace.ts
git commit -m "feat: add testimony to ClipType union"
```

---

## Task 3: Update Server Actions

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/workspace/actions.ts:179,187,202,212,245,308`

**Purpose:** Update saveClip and updateClip to handle testimony clips (no verse, no song metadata, no categories).

**Step 1: Update saveClip conditional logic**

In `apps/web/app/workspace/actions.ts`, the existing logic already uses `input.clipType !== "song"` for verse/category inserts. Update to explicitly check for sermon:

Line 187, change:
```typescript
if (input.clipType !== "song") {
```

to:
```typescript
if (input.clipType === "sermon") {
```

Line 212, change:
```typescript
if (input.clipType !== "song" && input.categoryIds.length > 0) {
```

to:
```typescript
if (input.clipType === "sermon" && input.categoryIds.length > 0) {
```

**Step 2: Update UpdateClipInput type**

Line 245, change:
```typescript
clipType?: "sermon" | "song";
```

to:
```typescript
clipType?: "sermon" | "song" | "testimony";
```

**Step 3: Commit**

```bash
git add apps/web/app/workspace/actions.ts
git commit -m "feat: support testimony clips in save/update actions"
```

---

## Task 4: Update Workspace Clip Form

**Depends on:** Task 3
**Files:**
- Modify: `apps/web/components/workspace/clip-form.tsx:137,158-166,282-302`

**Purpose:** Add Testimony button to the clip type selector and show only title field (no verse, no song fields) when testimony is selected.

**Step 1: Update clipType state type**

Line 137, change:
```typescript
const [clipType, setClipType] = useState<"sermon" | "song">("sermon");
```

to:
```typescript
const [clipType, setClipType] = useState<"sermon" | "song" | "testimony">("sermon");
```

**Step 2: Update validation logic**

Lines 158-166, change:
```typescript
if (clipType === "sermon" && (!book || !chapter || !verseStart)) {
  setError("Please fill in the verse reference");
  return;
}

if (clipType === "song" && (!artistName || !songName)) {
  setError("Please fill in the artist name and song name");
  return;
}
```

to:
```typescript
if (clipType === "sermon" && (!book || !chapter || !verseStart)) {
  setError("Please fill in the verse reference");
  return;
}

if (clipType === "song" && (!artistName || !songName)) {
  setError("Please fill in the artist name and song name");
  return;
}

// Testimony has no additional required fields beyond title
```

**Step 3: Update auto-generated title**

Line 176, change:
```typescript
title: title || (clipType === "sermon" ? `${book} ${chapter}:${verseStart}` : `${artistName} - ${songName}`),
```

to:
```typescript
title: title || (clipType === "sermon" ? `${book} ${chapter}:${verseStart}` : clipType === "song" ? `${artistName} - ${songName}` : "Testimony"),
```

**Step 4: Add Testimony button to type selector**

Lines 282-302, after the Song button, add:
```tsx
<button
  type="button"
  onClick={() => setClipType("testimony")}
  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
    clipType === "testimony" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`}
>
  Testimony
</button>
```

**Step 5: Commit**

```bash
git add apps/web/components/workspace/clip-form.tsx
git commit -m "feat: add testimony type to workspace clip form"
```

---

## Task 5: Update Clip History (Edit Form)

**Depends on:** Task 3
**Files:**
- Modify: `apps/web/components/workspace/clip-history.tsx:120,178,202-212,223,266-270,289-310`

**Purpose:** Support displaying and editing testimony clips in the clip history list.

**Step 1: Update editClipType state type**

Line 120, change:
```typescript
const [editClipType, setEditClipType] = useState<"sermon" | "song">("sermon");
```

to:
```typescript
const [editClipType, setEditClipType] = useState<"sermon" | "song" | "testimony">("sermon");
```

**Step 2: Update handleCancelEdit reset**

Line 178, no change needed (already resets to "sermon").

**Step 3: Update validation in handleSaveEdit**

Lines 202-212, change:
```typescript
if (editClipType === "song") {
  if (!editArtistName || !editSongName) {
    setEditError("Please fill in artist and song name");
    return;
  }
} else {
  if (!editBook || !editChapter || !editVerseStart) {
    setEditError("Please fill in the verse reference");
    return;
  }
}
```

to:
```typescript
if (editClipType === "song") {
  if (!editArtistName || !editSongName) {
    setEditError("Please fill in artist and song name");
    return;
  }
} else if (editClipType === "sermon") {
  if (!editBook || !editChapter || !editVerseStart) {
    setEditError("Please fill in the verse reference");
    return;
  }
}
// Testimony has no additional required fields
```

**Step 4: Update auto-generated title**

Line 223, change:
```typescript
title: editTitle || (editClipType === "sermon" ? `${editBook} ${editChapter}:${editVerseStart}` : `${editArtistName} - ${editSongName}`),
```

to:
```typescript
title: editTitle || (editClipType === "sermon" ? `${editBook} ${editChapter}:${editVerseStart}` : editClipType === "song" ? `${editArtistName} - ${editSongName}` : "Testimony"),
```

**Step 5: Update display logic for clip list**

Lines 266-270, change:
```typescript
const verseRef = clip.clip_type === "song" && song
  ? `${song.artist_name} — ${song.song_name}`
  : verse
    ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
    : clip.title;
```

to:
```typescript
const verseRef = clip.clip_type === "testimony"
  ? "Testimony"
  : clip.clip_type === "song" && song
    ? `${song.artist_name} — ${song.song_name}`
    : verse
      ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
      : clip.title;
```

**Step 6: Add Testimony button to edit type toggle**

Lines 289-310, after the Song button add:
```tsx
<button
  type="button"
  onClick={() => setEditClipType("testimony")}
  disabled={saving}
  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
    editClipType === "testimony" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`}
>
  Testimony
</button>
```

**Step 7: Commit**

```bash
git add apps/web/components/workspace/clip-history.tsx
git commit -m "feat: support testimony clips in clip history"
```

---

## Task 6: Update Public Submit Page

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/submit/page.tsx:128,172-180,278-305,368-484`

**Purpose:** Allow public users to submit testimony clips with just YouTube URL, time range, and title.

**Step 1: Update clipType state type**

Line 128, change:
```typescript
const [clipType, setClipType] = useState<"sermon" | "song">("sermon");
```

to:
```typescript
const [clipType, setClipType] = useState<"sermon" | "song" | "testimony">("sermon");
```

**Step 2: Update validation**

Lines 172-180, update to only require categories for sermons (already correct), and add comment for testimony:
```typescript
if (clipType === "sermon" && selectedCategories.length === 0) {
  setError("Please select at least one category");
  return;
}

if (clipType === "song" && (!artistName.trim() || !songName.trim())) {
  setError("Please enter both artist name and song name");
  return;
}

// Testimony has no additional validation beyond title
```

**Step 3: Add Testimony button**

Lines 278-305, add after the Song button:
```tsx
<button
  type="button"
  onClick={() => setClipType("testimony")}
  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    clipType === "testimony"
      ? "bg-blue-600 text-white"
      : "bg-white text-gray-700 border border-gray-300 hover:border-blue-400"
  }`}
>
  Testimony
</button>
```

**Step 4: Update conditional form fields**

Lines 368-484, change the conditional logic:

```tsx
{clipType === "sermon" && (
  <>
    {/* Bible Verse, Version, Categories */}
  </>
)}

{clipType === "song" && (
  <>
    {/* Artist Name, Song Name */}
  </>
)}

{clipType === "testimony" && (
  <p className="text-sm text-gray-500">
    No additional fields required for testimony clips.
  </p>
)}
```

**Step 5: Commit**

```bash
git add apps/web/app/submit/page.tsx
git commit -m "feat: support testimony submission on public page"
```

---

## Task 7: Update Home Page Filter

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/reel/reel-viewer.tsx`

**Purpose:** Add "Testimonies" filter option to the home page alongside "All", "Sermons", "Songs".

**Step 1: Update Clip type in page.tsx**

Add `"testimony"` to the clipType parameter handling:
```typescript
const clipType = searchParams.type as "sermon" | "song" | "testimony" | undefined;
```

**Step 2: Update filter bar in reel-viewer.tsx**

Lines 305-314, after the Songs Link, add a Testimonies filter button:
```tsx
<Link
  href="/?type=testimony"
  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
    clipType === "testimony"
      ? "bg-white text-black shadow-sm"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`}
>
  Testimonies
</Link>
```

**Step 3: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: add testimony filter to home page"
```

---

## Task 8: Update ReelCard Display for Testimonies

**Depends on:** Task 7
**Files:**
- Modify: `apps/web/components/reel/reel-viewer.tsx:55,89,112-148,361`

**Purpose:** Display testimony clips correctly in the reel viewer (show title, no verse link, no artist/song).

**Step 1: Update Clip type definition**

Line 55, change:
```typescript
clip_type?: string;
```

This is already flexible (`string`), so no change needed here. The type check at line 89 handles specific values.

**Step 2: Add testimony type check**

Line 89, after `const isSong = clip.clip_type === "song";`, add:
```typescript
const isTestimony = clip.clip_type === "testimony";
```

**Step 3: Update overlay conditional**

Lines 112-148, change the overlay condition from:
```tsx
{(verse || (isSong && song)) && (
```

to:
```tsx
{(verse || (isSong && song) || isTestimony) && (
```

**Step 4: Add testimony overlay display**

Inside the overlay div (lines 113-148), add testimony case:
```tsx
{isTestimony ? (
  <span
    style={{
      background: style.verse.background,
      color: style.verse.textColor,
      fontSize: style.verse.fontSize,
      fontWeight: style.verse.fontWeight,
      padding: style.verse.padding,
      borderRadius: style.verse.borderRadius,
      boxShadow: style.verse.boxShadow,
    }}
  >
    Testimony
  </span>
) : isSong && song ? (
  // ... existing song span ...
) : (
  // ... existing verse link ...
)}
```

**Step 5: Update verse modal condition**

Line 361, the condition already excludes songs:
```typescript
{showVerseModal && verse && currentClip.clip_type !== "song" && (
```

Change to:
```typescript
{showVerseModal && verse && currentClip.clip_type === "sermon" && (
```

**Step 6: Commit**

```bash
git add apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: display testimony clips in reel viewer"
```

---

## Task 9: Update Remaining Query Pages

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/my-clips/page.tsx:13,118-129`
- Modify: `apps/web/app/clip/[id]/page.tsx:18`

**Purpose:** Display testimony clips correctly in all user-facing clip list pages.

**Not In Scope:** The verse page (`apps/web/app/verse/[ref]/page.tsx`) and category page (`apps/web/app/category/[slug]/page.tsx`) remain sermon-only — testimonies don't have verses or categories.

**Step 1: Update my-clips Clip type**

In `apps/web/app/my-clips/page.tsx`, line 13, change:
```typescript
clip_type: "sermon" | "song";
```

to:
```typescript
clip_type: "sermon" | "song" | "testimony";
```

**Step 2: Update formatClipRef function in my-clips**

Lines 118-129, add testimony handling at the start:
```typescript
function formatClipRef(clip: Clip): string {
  if (clip.clip_type === "testimony") {
    return "Testimony";
  }
  if (clip.clip_type === "song" && clip.clip_songs?.length > 0) {
    const song = clip.clip_songs[0]!;
    return `${song.artist_name} - ${song.song_name}`;
  }
  // ... existing verse logic
}
```

**Step 3: Update clip/[id]/page.tsx ClipFromDb type**

In `apps/web/app/clip/[id]/page.tsx`, line 18, change:
```typescript
clip_type: "sermon" | "song";
```

to:
```typescript
clip_type: "sermon" | "song" | "testimony";
```

**Step 4: Commit**

```bash
git add apps/web/app/my-clips/page.tsx apps/web/app/clip/[id]/page.tsx
git commit -m "feat: display testimony clips in remaining query pages"
```

---

## Task 10: Update Admin Pending Page

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/admin/pending/page.tsx:15,69-80`

**Purpose:** Display testimony clips correctly in the admin pending review page.

**Step 1: Update PendingClip type**

Line 15, change:
```typescript
clip_type: "sermon" | "song";
```

to:
```typescript
clip_type: "sermon" | "song" | "testimony";
```

**Step 2: Update formatClipRef function**

Lines 69-80, add testimony handling at the start:
```typescript
function formatClipRef(clip: PendingClip): string {
  if (clip.clip_type === "testimony") {
    return "Testimony";
  }
  if (clip.clip_type === "song" && clip.clip_songs?.length > 0) {
    const song = clip.clip_songs[0]!;
    return `${song.artist_name} - ${song.song_name}`;
  }
  // ... existing verse logic
}
```

**Step 3: Commit**

```bash
git add apps/web/app/admin/pending/page.tsx
git commit -m "feat: display testimony clips in admin pending page"
```

---

## Task 11: Type Check and Final Verification

**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10
**Files:** None (verification only)

**Purpose:** Ensure everything compiles and the testimony feature works end-to-end.

**Step 1: Run type check**

```bash
pnpm type-check
```

Expected: All packages pass with no errors.

**Step 2: Run lint**

```bash
pnpm lint
```

Expected: No linting errors.

**Step 3: Manual verification**

- [ ] Create a sermon clip in workspace → verify verse/categories saved
- [ ] Create a song clip in workspace → verify artist/song saved
- [ ] Create a testimony clip in workspace → verify only title saved, no errors
- [ ] Edit a testimony clip → verify fields editable
- [ ] Home page default shows all three types
- [ ] Home page `?type=testimony` shows only testimonies
- [ ] Testimony clip in reel shows "Testimony" overlay (not verse link)
- [ ] Submit page allows testimony submission with only URL/times/title
- [ ] my-clips shows "Testimony" for testimony clips
- [ ] Admin pending page shows "Testimony" for pending testimony clips

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete testimony clips feature"
```

---

## Verification Record

### Plan Verification Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Complete | ✓ | All requirements: /submit testimony, /workspace testimony, display in reel/my-clips |
| Accurate | ✓ | File paths verified via codebase exploration |
| Commands valid | ✓ | pnpm type-check, pnpm lint, supabase db push, git commands |
| YAGNI | ✓ | No testimony-specific metadata table, no categories — just the base clip |
| Minimal | ✓ | 11 tasks, follows song clips pattern exactly |
| Not over-engineered | ✓ | Reuses existing clip_type pattern, no new tables |
| Key Decisions documented | ✓ | 4 decisions with rationale |
| Context sections present | ✓ | Purpose on all tasks |

### Rule-of-Five Passes
| Pass | Changes Made |
|------|--------------|
| Draft | Initial structure, 10 tasks following song clips pattern |
| Correctness | Updated Task 5 with specific line numbers and validation fix for testimony; updated Task 8 with isTestimony variable and overlay logic; fixed filter bar styling in Task 7 |
| Clarity | Removed redundant Step 5 from Task 4 |
| Edge Cases | Added Task 10 for admin pending page; expanded Task 9 to include clip/[id]/page.tsx; added Not In Scope to Task 9; now 11 tasks total |
| Excellence | Added checklist format to manual verification; added edit testimony test case and admin pending verification |
