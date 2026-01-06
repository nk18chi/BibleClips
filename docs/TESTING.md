# BibleClips Testing Guide

## Testing Strategy

For MVP phase, BibleClips uses **manual testing** to ensure quality while maintaining development velocity. Automated testing will be introduced in Phase 2.

## Manual Testing Procedures

### User Roles

Test as each user type:

| Role | Test Account |
|------|--------------|
| Anonymous | No login |
| User | test@example.com |
| Admin | admin@example.com |

## Public Features Testing

### Home Page

| Test | Steps | Expected |
|------|-------|----------|
| Page loads | Navigate to `/` | Home page displays |
| Categories display | View category grid | All categories visible |
| Language toggle | Switch EN/JP | UI language changes |
| Search works | Enter verse reference | Navigate to verse page |

### Verse Page

| Test | Steps | Expected |
|------|-------|----------|
| Clips display | Navigate to `/verse/philippians/4/6` | Clips for verse shown |
| Reel navigation | Swipe/click through clips | Next clip loads |
| Video plays | Click play on clip | YouTube video plays |
| Start/end time | Watch clip | Video starts/ends at correct times |

### Category Page

| Test | Steps | Expected |
|------|-------|----------|
| Clips display | Navigate to `/category/anxiety` | Category clips shown |
| Filter works | Filter by language | Only filtered clips shown |
| Reel navigation | Swipe through clips | Navigation works |

### Single Clip Page

| Test | Steps | Expected |
|------|-------|----------|
| Clip displays | Navigate to `/clip/[id]` | Clip details shown |
| Shareable URL | Copy URL, open in new tab | Same clip displays |
| YouTube link | Click "Watch full sermon" | Opens YouTube |

## Authentication Testing

### Registration

| Test | Steps | Expected |
|------|-------|----------|
| Valid registration | Enter valid email/password | Account created |
| Duplicate email | Register existing email | Error message |
| Weak password | Enter short password | Validation error |
| Invalid email | Enter invalid format | Validation error |

### Login

| Test | Steps | Expected |
|------|-------|----------|
| Valid login | Enter correct credentials | Logged in, redirected |
| Wrong password | Enter wrong password | Error message |
| Non-existent user | Enter unknown email | Error message |

### Logout

| Test | Steps | Expected |
|------|-------|----------|
| Logout | Click logout | Session ended, redirected |
| Session cleared | Refresh after logout | Still logged out |

## Authenticated User Testing

### Voting

| Test | Steps | Expected |
|------|-------|----------|
| Vote on clip | Click vote button | Vote count increases |
| Remove vote | Click vote again | Vote count decreases |
| Persist vote | Refresh page | Vote state persists |
| Anonymous blocked | Vote without login | Redirect to login |

### Submit Clip

| Test | Steps | Expected |
|------|-------|----------|
| Valid submission | Fill all required fields | Clip submitted |
| Invalid YouTube URL | Enter non-YouTube URL | Validation error |
| Missing verse | Submit without verse | Validation error |
| Invalid time range | End before start | Validation error |
| Preview works | Paste URL | Video preview shows |

### My Clips

| Test | Steps | Expected |
|------|-------|----------|
| View submissions | Navigate to My Clips | User's clips shown |
| Status display | View clip status | Pending/Approved shown |
| Empty state | New user with no clips | Empty message |

## Admin Testing

### Pending Review

| Test | Steps | Expected |
|------|-------|----------|
| View pending | Navigate to admin/pending | Pending clips shown |
| Approve clip | Click approve | Status changes to approved |
| Reject clip | Click reject | Status changes to rejected |
| Preview clip | Play pending clip | Video plays correctly |
| Feature clip | Mark as featured | Featured flag set |

### Category Management

| Test | Steps | Expected |
|------|-------|----------|
| View categories | Navigate to admin/categories | Categories listed |
| Add category | Create new category | Category added |
| Edit category | Modify category name | Name updated |
| Reorder | Change sort order | Order updated |

## Cross-Browser Testing

Test on these browsers:

| Browser | Version | Priority |
|---------|---------|----------|
| Chrome | Latest | High |
| Safari | Latest | High |
| Firefox | Latest | Medium |
| Edge | Latest | Medium |

### Mobile Testing

| Device | Browser | Priority |
|--------|---------|----------|
| iPhone | Safari | High |
| Android | Chrome | High |
| iPad | Safari | Medium |

## Accessibility Testing

### Keyboard Navigation

| Test | Expected |
|------|----------|
| Tab through page | Focus moves logically |
| Enter to activate | Buttons/links work |
| Escape to close | Modals/menus close |

### Screen Reader

| Test | Expected |
|------|----------|
| Page structure | Headings read correctly |
| Form labels | Inputs announced |
| Button labels | Actions clear |
| Error messages | Errors announced |

### Visual

| Test | Expected |
|------|----------|
| Color contrast | Meets WCAG AA |
| Text scaling | Works at 200% |
| Focus indicators | Visible focus ring |

## Performance Testing

### Load Times

| Page | Target |
|------|--------|
| Home | < 2s |
| Verse page | < 3s |
| Clip playback | < 1s to start |

### Lighthouse Scores (Targets)

| Metric | Target |
|--------|--------|
| Performance | > 80 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |

## API Testing

### Supabase Queries

Test using Supabase Studio or API client:

| Query | Test |
|-------|------|
| Get approved clips | Returns only approved |
| Get user's clips | Returns only user's |
| Create clip | Requires auth |
| Vote | One per user per clip |

### RLS Policy Testing

| Policy | Test |
|--------|------|
| Anonymous read | Can read approved clips |
| User read own | Can see own pending |
| User can't read others' pending | Returns empty |
| Admin read all | Can see all clips |

## Regression Testing

Before each release, verify:

- [ ] Home page loads correctly
- [ ] Authentication flows work
- [ ] Voting works
- [ ] Clip submission works
- [ ] Admin approval works
- [ ] Video playback works
- [ ] Language switching works

## Bug Reporting Template

```markdown
## Bug Description
[Clear description of the issue]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser:
- Device:
- User Role:

## Screenshots
[If applicable]
```

## Future: Automated Testing (Phase 2)

### Planned Test Types

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Vitest | Utilities, hooks |
| Component | Testing Library | React components |
| E2E | Playwright | Critical flows |
| API | Vitest | Supabase queries |

### Critical E2E Flows

1. User registration and login
2. Browse clips by verse
3. Browse clips by category
4. Submit a clip
5. Admin approve clip
6. Vote on clip
