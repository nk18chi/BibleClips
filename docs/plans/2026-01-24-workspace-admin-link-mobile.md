# Workspace Admin Link & Mobile-Friendly Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers:subagent-driven-development` for parallel execution.

**Goal:** Add an admin-only link to the workspace page in the header and make the workspace page mobile-friendly.

**Architecture:** Add a conditional "Workspace" link in the Header component that only renders for admin/contributor users. Refactor the workspace layout to use a responsive design with a collapsible sidebar on mobile devices.

**Tech Stack:** React, Tailwind CSS responsive utilities, existing Supabase auth hooks

---

## Task 1: Add Workspace Link to Header

**Depends on:** None
**Files:**
- Modify: `apps/web/components/ui/header.tsx:11,155-173`
- Modify: `apps/web/components/providers/language-provider.tsx:14-40`

**Step 1: Read the current header implementation**

Review the header to understand where the admin link is placed.

**Step 2: Add the workspace link for admin/contributor users**

The header already has access to `isAdmin` from `useUserProfile()`. We need to also check `canAccessWorkspace` which is available from `useSupabase()`. Add the workspace link next to the existing admin link.

Modify the header to destructure `canAccessWorkspace` from the existing `useSupabase()` call:

```typescript
// Update line 11 to destructure canAccessWorkspace:
const { supabase, user, canAccessWorkspace } = useSupabase();

// Add the Workspace link after the Admin link (around line 161):
{canAccessWorkspace && (
  <Link href="/workspace" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
    {t("header.workspace")}
  </Link>
)}
```

**Step 3: Add translation key for workspace**

Check `apps/web/components/providers/language-provider.tsx` for the translations object and add:
- English: `"header.workspace": "Workspace"`
- Japanese: `"header.workspace": "ワークスペース"`

**Step 4: Run type-check**

```bash
pnpm type-check
```

Expected: No errors

**Step 5: Commit**

```bash
git add apps/web/components/ui/header.tsx apps/web/components/providers/language-provider.tsx
git commit -m "feat: add workspace link to header for admin/contributors"
```

---

## Task 2: Add Mobile Menu for Additional Navigation

**Depends on:** Task 1
**Files:**
- Modify: `apps/web/components/ui/header.tsx`

**Step 1: Add mobile menu state and hamburger button**

The header currently hides several links on mobile (`hidden sm:block`). We need a mobile menu to access these links including the new workspace link.

Add state for mobile menu:
```typescript
const [showMobileMenu, setShowMobileMenu] = useState(false);
```

**Step 2: Add hamburger button (visible only on mobile)**

Add a hamburger menu button that's only visible on small screens:

```typescript
{/* Mobile menu button - only show when user is logged in */}
{user && (
  <button
    onClick={() => setShowMobileMenu(!showMobileMenu)}
    className="p-2 text-gray-600 hover:text-gray-900 sm:hidden"
    aria-label="Menu"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
)}
```

**Step 3: Add mobile menu dropdown**

Add a dropdown menu that slides down when hamburger is clicked. This should be rendered at the end of the `<header>` element (after the inner `<div>` with `max-w-7xl`), not inside the nav container:

```typescript
// Place this JSX AFTER the closing </div> of the "max-w-7xl mx-auto..." div,
// but still INSIDE the <header> element:

{/* Mobile menu dropdown */}
{showMobileMenu && user && (
  <>
    <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowMobileMenu(false)} />
    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 sm:hidden">
      <div className="px-4 py-3 space-y-3">
        {canAccessWorkspace && (
          <Link
            href="/workspace"
            className="block text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setShowMobileMenu(false)}
          >
            {t("header.workspace")}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/pending"
            className="block text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setShowMobileMenu(false)}
          >
            {t("header.admin")}
          </Link>
        )}
        <Link
          href="/my-clips"
          className="block text-sm text-gray-700 hover:text-gray-900"
          onClick={() => setShowMobileMenu(false)}
        >
          {t("header.myClips")}
        </Link>
        <button
          onClick={() => {
            handleSignOut();
            setShowMobileMenu(false);
          }}
          className="block w-full text-left text-sm text-gray-700 hover:text-gray-900"
        >
          {t("header.signOut")}
        </button>
      </div>
    </div>
  </>
)}
```

**Step 4: Run type-check**

```bash
pnpm type-check
```

Expected: No errors

**Step 5: Commit**

```bash
git add apps/web/components/ui/header.tsx
git commit -m "feat: add mobile menu for navigation links"
```

---

## Task 3: Create Responsive Workspace Layout - Mobile Video Queue Panel

**Depends on:** None
**Files:**
- Modify: `apps/web/app/workspace/page.tsx:152-215`

**Step 1: Add mobile panel state**

Add state to track whether the video queue sidebar is shown on mobile. Start with `!searchParams.get("id")` to handle direct URL navigation:

```typescript
const [showMobileQueue, setShowMobileQueue] = useState(!searchParams.get("id"));
```

This handles the edge case where a user navigates directly to `/workspace?id=xxx` on mobile - they'll see the player, not the queue.

**Step 2: Update the main layout container**

Replace the fixed width sidebar with a responsive layout. On mobile, show either the queue OR the player (not both simultaneously).

Current layout:
```typescript
<div className="flex h-[calc(100vh-64px)]">
  {/* Left Panel - Video Queue */}
  <div className="w-80 bg-white border-r flex-shrink-0">
```

New responsive layout:
```typescript
<div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
  {/* Left Panel - Video Queue
      - On mobile: full width, hidden when a video is selected (unless showMobileQueue is true)
      - On desktop (md+): fixed 320px width, always visible */}
  <div className={`
    ${selectedVideo && !showMobileQueue ? 'hidden md:block' : 'block'}
    w-full md:w-80 bg-white border-r flex-shrink-0
    ${!selectedVideo ? 'flex-1 md:flex-initial' : ''}
  `}>
```

**Step 3: Update right panel visibility and add back button**

The right panel (player area) should also be hidden on mobile when showing the queue. Update the right panel div:

```typescript
{/* Right Panel - Player & Form (hidden on mobile when showing queue) */}
<div className={`
  ${showMobileQueue && !selectedVideo ? 'hidden md:block' : 'block'}
  flex-1 overflow-y-auto p-4 md:p-6
`}>
```

When a video is selected on mobile, add a "back to queue" button at the top of the player panel:

```typescript
{/* Mobile back button */}
{selectedVideo && (
  <button
    onClick={() => setShowMobileQueue(true)}
    className="md:hidden flex items-center gap-2 text-sm text-gray-600 mb-4"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    Back to Queue
  </button>
)}
```

**Step 4: Update video selection to hide queue on mobile**

Modify `handleSelectVideo` to hide the queue on mobile when a video is selected:

```typescript
const handleSelectVideo = useCallback(
  (video: WorkQueueVideo | null) => {
    setSelectedVideo(video);
    if (video) {
      setShowMobileQueue(false); // Hide queue on mobile when video selected
      router.replace(`/workspace?id=${video.youtube_video_id}`, { scroll: false });
    } else {
      setShowMobileQueue(true);
      router.replace("/workspace", { scroll: false });
    }
  },
  [router]
);
```

**Step 5: Run type-check**

```bash
pnpm type-check
```

Expected: No errors

**Step 6: Commit**

```bash
git add apps/web/app/workspace/page.tsx
git commit -m "feat: add responsive layout for workspace page"
```

---

## Task 4: Make Video Queue Component Mobile-Friendly

**Depends on:** None
**Files:**
- Modify: `apps/web/components/workspace/video-queue.tsx`

**Step 1: Adjust video list item padding for touch targets**

Increase touch targets on mobile:

```typescript
<button
  key={video.id}
  onClick={() => onSelectVideo(video)}
  className={`w-full p-4 md:p-3 border-b hover:bg-gray-50 text-left transition-colors ${
    selectedVideoId === video.youtube_video_id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
  }`}
>
```

**Step 2: Make thumbnail responsive**

```typescript
<img src={video.thumbnail_url} alt="" className="w-20 md:w-24 h-12 md:h-14 object-cover rounded" />
```

**Step 3: Commit**

```bash
git add apps/web/components/workspace/video-queue.tsx
git commit -m "feat: improve video queue touch targets for mobile"
```

---

## Task 5: Make Clip Form Mobile-Friendly

**Depends on:** None
**Files:**
- Modify: `apps/web/components/workspace/clip-form.tsx`

**Step 1: Make verse reference grid stack on small screens**

Current:
```typescript
<div className="grid grid-cols-4 gap-2">
```

New responsive grid:
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
```

**Step 2: Make time display wrap on small screens**

Current:
```typescript
<div className="flex gap-4 text-sm">
```

New:
```typescript
<div className="flex flex-wrap gap-2 md:gap-4 text-sm">
```

**Step 3: Commit**

```bash
git add apps/web/components/workspace/clip-form.tsx
git commit -m "feat: improve clip form layout for mobile"
```

---

## Task 6: Make Workspace Player Mobile-Friendly

**Depends on:** None
**Files:**
- Modify: `apps/web/components/workspace/workspace-player.tsx`

**Step 1: Make time control buttons stack on very small screens**

Update the button container to wrap on small screens:

```typescript
<div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-100 rounded-lg p-3">
  <div className="text-lg font-mono">{formatTime(currentTime)}</div>
  <div className="flex gap-2 w-full sm:w-auto">
    <button
      type="button"
      onClick={handleSetStart}
      disabled={!isReady}
      className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
    >
      Set Start (S)
    </button>
    <button
      type="button"
      onClick={handleSetEnd}
      disabled={!isReady}
      className="flex-1 sm:flex-initial px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
    >
      Set End (E)
    </button>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add apps/web/components/workspace/workspace-player.tsx
git commit -m "feat: improve workspace player controls for mobile"
```

---

## Task 7: Verification Gate

**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
**Files:**
- Test: All modified files

## Verification Gate

This task verifies the implementation is complete and meets quality standards.

**Do not close this task until ALL criteria are met.**

## Final Checks

1. `pnpm lint` runs without errors
2. `pnpm build` succeeds
3. `pnpm type-check` passes
4. Workspace link appears in header for admin/contributor users
5. Workspace link is hidden for regular users
6. Mobile menu shows all navigation links on small screens
7. Workspace page sidebar collapses to full-width on mobile
8. Video selection shows player and hides queue on mobile
9. "Back to Queue" button works on mobile
10. All form inputs have adequate touch targets
11. Direct URL navigation to `/workspace?id=xxx` shows player on mobile
12. Navigating to non-existent video ID shows queue (graceful fallback)

---

## Verification Record

### Plan Verification Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Complete | ✓ | Admin-only link + mobile-friendly layout addressed |
| Accurate | ✓ | File paths verified - header.tsx, workspace page, and components exist |
| Commands valid | ✓ | Standard pnpm and git commands |
| YAGNI | ✓ | Only adding what's needed - link + responsive layout |
| Minimal | ✓ | 7 tasks total, focused scope |
| Not over-engineered | ✓ | Using Tailwind responsive utilities, no new libraries |

### Rule-of-Five Passes
| Pass | Changes Made |
|------|--------------|
| Draft | Initial 7-task structure covering header link, mobile menu, responsive workspace |
| Correctness | Fixed canAccessWorkspace destructuring, confirmed header uses sticky positioning for dropdown, updated height calc |
| Clarity | Added language-provider.tsx to Task 1 files, clarified mobile/desktop visibility logic with comments |
| Edge Cases | Handle direct URL navigation on mobile (showMobileQueue initial state), added verification for edge cases |
| Excellence | Updated verification record, confirmed all code blocks are complete and implementable |
