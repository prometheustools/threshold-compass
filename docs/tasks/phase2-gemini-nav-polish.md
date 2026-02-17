# Task: Navigation Polish + Settle FAB + Dead-End Audit

## Branch
You are on `phase2/lovable`. Commit directly to this branch.

## Context
The Threshold Compass PWA reduced navigation to 4 tabs. Remaining work: Settle FAB should open drift mode directly, and we need to ensure no orphaned routes or dead-end tabs exist.

## Files to modify
- `app/(app)/layout.tsx` - Settle FAB routing
- `app/(app)/history/page.tsx` - ensure batch actions are discoverable
- `app/(app)/settings/page.tsx` - ensure batch management is reachable

## Changes Required

### 1. Settle FAB → Drift mode (layout.tsx)
Change the Settle FAB link from `/settle` to `/drift`:
```tsx
<Link href="/drift" ...>
```
The drift page already exists at `app/(app)/drift/page.tsx`.

### 2. History page - batch discoverability
In `app/(app)/history/page.tsx`, ensure there is a way to navigate to batch management from the history view. If not present, add a small link/button near the top:
```tsx
<Link href="/batch" className="text-xs text-bone hover:text-ivory font-mono uppercase tracking-wider">
  Manage Batches
</Link>
```

### 3. Dead-end route audit
Check these routes still have working navigation back to compass or other core pages. If any route lacks a back button or nav path, add one:
- `/discovery` and `/discovery/complete`
- `/drift`
- `/settle`, `/settle/breathe`, `/settle/ground`, `/settle/guide`
- `/batch`
- `/reflect`

For any page that is a dead-end (no nav bar visible, no back link), add a minimal back link:
```tsx
<Link href="/compass" className="text-sm text-bone hover:text-ivory">
  ← Compass
</Link>
```

### 4. Remove stale route references
If any component still links to `/stash` as a primary navigation target (not as a sub-page), redirect those links to `/history` instead.

## Design system constraints
- Text: #F5F2E9 (ivory), #C4C0B6 (bone), #8A8A8A (ash)
- Accent: #E07A3E (orange), #8B4D2C (ember)
- Font: JetBrains Mono for data, uppercase tracking-wider
- Touch targets: 44px minimum
- NEVER use pure white (#FFFFFF)

## Commit message format
```
fix(nav): route Settle FAB to drift and audit dead-end routes
```

## Verification
Run `pnpm build` and ensure zero errors before committing.
