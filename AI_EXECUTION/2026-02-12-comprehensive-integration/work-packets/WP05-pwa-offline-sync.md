# WP05 - PWA and Offline Sync

## Goal
Make the app reliable under flaky connectivity.

## Source references
- `threshold-tracker/src/lib/idb.ts`
- `threshold-tracker/src/lib/pwa.ts`
- `threshold-tracker/src/hooks/useOnlineStatus.ts`
- `threshold-compass-v2/lib/hooks/useServiceWorker.ts`

## Target files
- `public/sw.js`
- `lib/hooks/useServiceWorker.ts` (new)
- `lib/offline/*` (new)
- `components/ui/OfflineBanner.tsx` (new)

## Tasks
1. Add online/offline status detection and UI indicator.
2. Queue offline writes in IDB.
3. Replay queue on reconnect with idempotent API semantics.
4. Surface sync conflicts and last-sync timestamps.

## Acceptance criteria
- Logging works offline and syncs when online.
- User sees reliable sync status.
