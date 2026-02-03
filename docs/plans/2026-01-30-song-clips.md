# Song Clips Feature Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers:subagent-driven-development` for parallel execution.

**Goal:** Support song clips alongside sermon clips, with a clip_type discriminator that controls which metadata fields are shown (verse/version/category for sermons, artist/song_name for songs), and a home page filter to browse all/sermons/songs.

**Architecture:** Add a `clip_type` column (`sermon` | `song`) to the `clips` table and a `clip_songs` table for song metadata (artist_name, song_name). The existing `clip_verses`, `clip_categories`, and version fields remain sermon-only. All query paths add `clip_type` awareness. The home page gets a filter bar. Subtitles/translations work identically for both types.

**Tech Stack:** Supabase PostgreSQL (migration), Next.js 14 App Router, TypeScript, Tailwind CSS

**Key Decisions:**
- **Separate `clip_songs` table over adding columns to `clips`:** Keeps song metadata normalized like `clip_verses` is for sermons. Avoids nullable columns on `clips`.
- **`clip_type` on `clips` table over a separate junction:** Simple discriminator column is the most straightforward filter — one WHERE clause. Default `sermon` migrates all existing data.
- **Home page filter via query param over client state:** Server-side filtering with `?type=sermon|song` means filtered views are shareable/bookmarkable and reduces data sent to client.
- **Keep categories sermon-only for now:** Songs don't need life-situation categories (anxiety, hope, etc.). Can add song genres later if needed.

---

## Task 1: Database Migration

**Depends on:** None
**Files:**
- Create: `supabase/migrations/20260133_song_clips.sql`

**Purpose:** Add clip_type discriminator and song metadata table so the app can distinguish sermon vs song clips.

**Step 1: Create migration file**

```sql
-- Add clip_type to clips table
ALTER TABLE clips ADD COLUMN clip_type TEXT NOT NULL DEFAULT 'sermon'
  CHECK (clip_type IN ('sermon', 'song'));

-- Index for filtering by type
CREATE INDEX idx_clips_clip_type ON clips(clip_type);

-- Song metadata table (parallel to clip_verses for sermons)
CREATE TABLE clip_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  song_name TEXT NOT NULL,
  UNIQUE(clip_id)
);

CREATE INDEX idx_clip_songs_clip_id ON clip_songs(clip_id);
CREATE INDEX idx_clip_songs_artist ON clip_songs(artist_name);

-- RLS policies for clip_songs
ALTER TABLE clip_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clip_songs_read" ON clip_songs
  FOR SELECT USING (true);

CREATE POLICY "clip_songs_admin"  ON clip_songs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
```

**Step 2: Run migration**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260133_song_clips.sql
git commit -m "feat: add clip_type and clip_songs table"
```

---

## Task 2: Update TypeScript Types

**Depends on:** Task 1
**Files:**
- Modify: `packages/database/src/types.ts`
- Modify: `apps/web/types/workspace.ts`

**Purpose:** Add TypeScript types for clip_type and clip_songs so all downstream code has type safety.

**Step 1: Add ClipType and ClipSong to database types**

In `packages/database/src/types.ts`, add after the `ClipStatus` type:

```typescript
export type ClipType = "sermon" | "song";
```

Add `clip_type: ClipType;` to the `Clip` interface after `is_featured`.

Add new interface after `ClipVerse`:

```typescript
export interface ClipSong {
  id: string;
  clip_id: string;
  artist_name: string;
  song_name: string;
}
```

Add `songs?: ClipSong[];` to `ClipWithRelations`.

**Step 2: Update workspace types**

In `apps/web/types/workspace.ts`:

Add to `ClipWithVerse` type:
- `clip_type: "sermon" | "song";`
- `clip_songs?: { artist_name: string; song_name: string }[];`

Add to `SaveClipInput` type:
- `clipType: "sermon" | "song";`
- `artistName?: string;`
- `songName?: string;`

**Step 3: Commit**

```bash
git add packages/database/src/types.ts apps/web/types/workspace.ts
git commit -m "feat: add clip_type and clip_songs types"
```

---

## Task 3: Update Server Actions (Save & Update)

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/workspace/actions.ts`

**Purpose:** Make saveClip and updateClip handle both sermon and song metadata.

**Step 1: Update saveClip**

In the `saveClip` function, add `clip_type: input.clipType || "sermon"` to the clips insert.

After the existing verse insert block, add a conditional song insert:

```typescript
// Insert song metadata (for song clips)
if (input.clipType === "song" && input.artistName && input.songName) {
  const { error: songError } = await supabase.from("clip_songs").insert({
    clip_id: clip.id,
    artist_name: input.artistName,
    song_name: input.songName,
  });
  if (songError) throw songError;
}
```

Wrap the existing verse insert in a conditional:

```typescript
// Insert verse (for sermon clips)
if (input.clipType !== "song") {
  // ... existing verse insert code ...
}

// Insert categories (for sermon clips)
if (input.clipType !== "song" && input.categoryIds.length > 0) {
  // ... existing category insert code ...
}
```

**Step 2: Update UpdateClipInput and updateClip**

Add to `UpdateClipInput`:
- `clipType?: "sermon" | "song";`
- `artistName?: string;`
- `songName?: string;`

In `updateClip`, add song metadata update logic:

```typescript
// Update song metadata if song clip
if (input.clipType === "song" && input.artistName && input.songName) {
  await supabase.from("clip_songs").delete().eq("clip_id", input.clipId);
  const { error: songError } = await supabase.from("clip_songs").insert({
    clip_id: input.clipId,
    artist_name: input.artistName,
    song_name: input.songName,
  });
  if (songError) throw songError;
}
```

**Step 3: Update getVideoClips query**

Add `clip_type` and `clip_songs (artist_name, song_name)` to the select string.

**Step 4: Commit**

```bash
git add apps/web/app/workspace/actions.ts
git commit -m "feat: support song clips in save/update actions"
```

---

## Task 4: Update Workspace Clip Form

**Depends on:** Task 3
**Files:**
- Modify: `apps/web/components/workspace/clip-form.tsx`

**Purpose:** Add sermon/song toggle to the workspace form that conditionally shows verse fields or artist/song fields.

**Step 1: Add clip type state and song fields**

Add state variables:

```typescript
const [clipType, setClipType] = useState<"sermon" | "song">("sermon");
const [artistName, setArtistName] = useState("");
const [songName, setSongName] = useState("");
```

**Step 2: Add clip type selector UI**

After the title input and before the verse reference section, add:

```tsx
{/* Clip Type */}
<div className="flex gap-2">
  <button
    type="button"
    onClick={() => setClipType("sermon")}
    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
      clipType === "sermon"
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
    }`}
  >
    Sermon
  </button>
  <button
    type="button"
    onClick={() => setClipType("song")}
    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
      clipType === "song"
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
    }`}
  >
    Song
  </button>
</div>
```

**Step 3: Conditionally show verse or song fields**

Wrap the existing verse reference, Bible version, and categories sections in `{clipType === "sermon" && (...)}`.

Add song fields for song type:

```tsx
{clipType === "song" && (
  <div className="space-y-2">
    <input
      type="text"
      value={artistName}
      onChange={(e) => setArtistName(e.target.value)}
      placeholder="Artist name *"
      className="w-full px-3 py-2 border rounded-lg text-sm"
      required
    />
    <input
      type="text"
      value={songName}
      onChange={(e) => setSongName(e.target.value)}
      placeholder="Song name *"
      className="w-full px-3 py-2 border rounded-lg text-sm"
      required
    />
  </div>
)}
```

**Step 4: Update validation and submit**

Update the validation to check song fields when clipType is "song":

```typescript
if (clipType === "song" && (!artistName || !songName)) {
  setError("Please fill in artist and song name");
  return;
}
if (clipType === "sermon" && (!book || !chapter || !verseStart)) {
  setError("Please fill in the verse reference");
  return;
}
```

Pass new fields to `saveClip`:

```typescript
clipType,
artistName: clipType === "song" ? artistName : undefined,
songName: clipType === "song" ? songName : undefined,
```

Reset new fields on save:

```typescript
setClipType("sermon");
setArtistName("");
setSongName("");
```

**Step 5: Commit**

```bash
git add apps/web/components/workspace/clip-form.tsx
git commit -m "feat: add sermon/song toggle to workspace clip form"
```

---

## Task 5: Update Clip History (Edit Form)

**Depends on:** Task 3
**Files:**
- Modify: `apps/web/components/workspace/clip-history.tsx`

**Purpose:** Support editing song metadata in the clip history edit form.

**Step 1: Add state for clip type and song fields**

```typescript
const [editClipType, setEditClipType] = useState<"sermon" | "song">("sermon");
const [editArtistName, setEditArtistName] = useState("");
const [editSongName, setEditSongName] = useState("");
```

**Step 2: Populate on edit start**

In `handleStartEdit`:

```typescript
setEditClipType((clip as any).clip_type || "sermon");
const song = (clip as any).clip_songs?.[0];
setEditArtistName(song?.artist_name || "");
setEditSongName(song?.song_name || "");
```

**Step 3: Add UI toggle and conditional fields**

Same pattern as Task 4: sermon/song toggle buttons, conditional verse/song fields in the edit form.

**Step 4: Update save handler**

Pass `clipType`, `artistName`, `songName` to `updateClip`. Skip verse validation for songs.

**Step 5: Commit**

```bash
git add apps/web/components/workspace/clip-history.tsx
git commit -m "feat: support song clip editing in clip history"
```

---

## Task 6: Update Public Submit Page

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/submit/page.tsx`

**Purpose:** Allow public users to submit song clips with artist/song name instead of verse info.

**Step 1: Add state and UI**

Same pattern as Task 4: clipType state, sermon/song toggle, conditional fields. Song clips skip verse and category requirements.

**Step 2: Update submit handler**

Add `clip_type` to clips insert. Conditionally insert into `clip_songs` instead of `clip_verses` for song type.

**Step 3: Skip category requirement for songs**

```typescript
if (clipType === "sermon" && selectedCategories.length === 0) {
  setError("Please select at least one category");
  return;
}
```

**Step 4: Commit**

```bash
git add apps/web/app/submit/page.tsx
git commit -m "feat: support song clip submission on public page"
```

---

## Task 7: Update Home Page with Filter

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/reel/reel-viewer.tsx`

**Purpose:** Add all/sermons/songs filter to the home page so users can browse by clip type.

**Step 1: Accept filter param on home page**

Update the page component to read a `type` search param:

```typescript
export default async function HomePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const clipType = searchParams.type as "sermon" | "song" | undefined;
  const clips = await getApprovedClips(undefined, clipType);
```

**Step 2: Update getApprovedClips**

Add `clipType` parameter and filter:

```typescript
async function getApprovedClips(userId?: string, clipType?: "sermon" | "song"): Promise<Clip[]> {
```

Add to the query:

```typescript
let query = supabase
  .from("clips")
  .select(`...existing select..., clip_type, clip_songs (artist_name, song_name)`)
  .eq("status", "APPROVED");

if (clipType) {
  query = query.eq("clip_type", clipType);
}

query = query.order("created_at", { ascending: false }).limit(50);
```

**Step 3: Update ClipFromDb and Clip types**

Add to both types:
- `clip_type?: "sermon" | "song";`
- `clip_songs?: { artist_name: string; song_name: string }[];`

Pass through in the mapping:

```typescript
clip_type: clip.clip_type || "sermon",
clip_songs: clip.clip_songs || [],
```

**Step 4: Pass clipType and filter to ReelViewer**

Add `clipType` prop to ReelViewer. Pass the current filter value so the filter bar can show the active state.

**Step 5: Add filter bar to ReelViewer**

In `reel-viewer.tsx`, add a filter bar below the header (when `showHeader` is true):

```tsx
{showHeader && (
  <div className="absolute top-16 left-0 right-0 z-20 flex justify-center gap-2 px-4 py-2">
    <Link
      href="/"
      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
        !clipType ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"
      }`}
    >
      All
    </Link>
    <Link
      href="/?type=sermon"
      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
        clipType === "sermon" ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"
      }`}
    >
      Sermons
    </Link>
    <Link
      href="/?type=song"
      className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
        clipType === "song" ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"
      }`}
    >
      Songs
    </Link>
  </div>
)}
```

**Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: add clip type filter to home page"
```

---

## Task 8: Update ReelCard for Song Clips

**Depends on:** Task 7
**Files:**
- Modify: `apps/web/components/reel/reel-viewer.tsx`

**Purpose:** Show artist/song name instead of verse reference for song clips in the reel card overlay.

**Step 1: Update Clip type in reel-viewer**

Add to the Clip type:
- `clip_type?: "sermon" | "song";`
- `clip_songs?: { artist_name: string; song_name: string }[];`

**Step 2: Update ReelCard display logic**

Replace the verse ref logic at the top of ReelCard:

```typescript
const verse = clip.clip_verses[0];
const song = clip.clip_songs?.[0];
const isSong = clip.clip_type === "song";

// Display text for the top overlay
const overlayText = isSong
  ? song
    ? `${song.artist_name} — ${song.song_name}`
    : clip.title
  : verse
    ? /* existing verseRef logic */
    : "";
```

**Step 3: Conditionally show verse overlay or song overlay**

Replace the verse overlay block:

```tsx
{/* Top overlay - verse ref or song info */}
{overlayText && (
  <div className="absolute top-24 left-0 right-0 z-10 flex justify-center">
    {isSong ? (
      <span style={{ /* same style object */ }}>
        {overlayText}
      </span>
    ) : (
      <a href={bibleGatewayUrl} target="_blank" rel="noopener noreferrer" style={{ /* same style */ }}>
        {overlayText}
      </a>
    )}
  </div>
)}
```

**Step 4: Hide verse-related actions for songs**

In the ReelViewer component, only show the verse modal button for sermon clips. Pass `clip_type` info to ActionButtons or conditionally render the verse click handler.

**Step 5: Commit**

```bash
git add apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: display song info in reel card overlay"
```

---

## Task 9: Update Remaining Query Pages

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/app/clip/[id]/page.tsx`
- Modify: `apps/web/app/my-clips/page.tsx`
- Modify: `apps/web/app/admin/pending/page.tsx`
- Modify: `apps/web/app/api/workspace/clips/route.ts`

**Purpose:** Ensure clip_type and clip_songs are included in all query paths so songs display correctly everywhere.

**Not In Scope:** The verse page (`apps/web/app/verse/[ref]/page.tsx`) and category page (`apps/web/app/category/[slug]/page.tsx`) remain sermon-only — songs don't have verses or categories.

**Step 1: Update clip/[id]/page.tsx**

Add `clip_type`, `clip_songs (artist_name, song_name)` to the select query. Add fields to ClipFromDb type. Pass through to the Clip mapping.

**Step 2: Update my-clips/page.tsx**

Add `clip_type` to the select queries. Update the Clip type. Show clip type badge or artist name in the list.

**Step 3: Update admin/pending/page.tsx**

Add `clip_type`, `clip_songs (artist_name, song_name)` to the query. Show song info for song clips in the pending review list instead of verse reference.

**Step 4: Update workspace clips API route**

Add `clip_type`, `clip_songs (artist_name, song_name)` to the select.

**Step 5: Commit**

```bash
git add apps/web/app/clip/[id]/page.tsx apps/web/app/my-clips/page.tsx apps/web/app/admin/pending/page.tsx apps/web/app/api/workspace/clips/route.ts
git commit -m "feat: add clip_type awareness to all query pages"
```

---

## Task 10: Type Check and Final Verification

**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9
**Files:** None (verification only)

**Purpose:** Ensure everything compiles and works end-to-end.

**Step 1: Run type check**

```bash
pnpm type-check
```

Expected: All 3 packages pass.

**Step 2: Manual verification**

- Create a sermon clip in workspace → verify verse/version/category saved
- Create a song clip in workspace → verify artist_name/song_name saved, no verse/category
- Home page default shows both types
- Home page `?type=sermon` shows only sermons
- Home page `?type=song` shows only songs
- Song clip in reel shows artist/song overlay instead of verse
- Edit a song clip → verify song fields editable

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete song clips feature"
```

---

## Verification Record

### Plan Verification Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Complete | ✓ | All requirements covered: clip_type, song metadata, conditional forms, home filter, display |
| Accurate | ✓ | File paths verified via codebase exploration |
| Commands valid | ✓ | pnpm type-check, supabase db push, git commands |
| YAGNI | ✓ | No song genres, no song search page — only what was requested |
| Minimal | ✓ | 10 tasks, each focused on one concern |
| Not over-engineered | ✓ | Simple discriminator column + one metadata table |
| Key Decisions documented | ✓ | 4 decisions with rationale |
| Context sections present | ✓ | Purpose on all tasks, Not In Scope on Task 9 |

### Rule-of-Five Passes
| Pass | Changes Made |
|------|--------------|
| Draft | Initial structure, 10 tasks |
| Correctness | Fixed migration filename collision (20260130→20260133), fixed searchParams to non-Promise pattern matching codebase convention |
| Clarity | None needed — task structure and code snippets are clear |
| Edge Cases | All covered: existing clip migration, song validation, verse modal hiding, BibleGateway link conditional, RLS policies |
| Excellence | None needed — plan is clean and ready for implementation |
