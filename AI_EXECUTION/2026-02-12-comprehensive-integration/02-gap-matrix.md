# 02 - Gap Matrix (`threshold-compass` target)

| Area | Current State | Gap | Source of Truth | Priority |
|---|---|---|---|---|
| Auth + onboarding skip | Has `/autologin`, onboarding still gates flows in places | Need true "Check out app" and schema-safe fallback behavior | `threshold-compass` + `threshold-compass-v2` auth patterns | P0 |
| Supabase schema/RLS | 5-table schema active, RLS tied to `auth.uid()` | Need expanded idempotent migrations + cache refresh and verification runbook | `threshold-compass-v2/schema.sql` + current schema | P0 |
| Dose logging | Single-flow with minimal protocol metadata | Need pre/post loop, STI, threshold feel, context tags, phase/dose numbering | `threshold-tracker` + `threshold-compass-v2` | P0 |
| Discovery/protocol engine | Basic calibration progress | Need full 10-dose state machine and recalibration logic | `threshold-tracker/src/types/index.ts` + `src/lib/threshold-profile.ts` | P0 |
| Insights | No dedicated insights page in current app | Need charts + correlations + range analysis | `threshold-tracker/src/components/insights/*` | P1 |
| Patterns | No full pattern pipeline in current app | Need pattern generation + user feedback cycle | `threshold-compass-v2/lib/algorithms/pattern-pipeline.ts` | P1 |
| Reflections | Not first-class in current target schema | Need reflection capture and reminders | `threshold-compass-v2/app/(app)/reflect/page.tsx` | P1 |
| Offline/PWA | `public/sw.js` exists, limited app-level queue strategy | Need robust IDB queue and sync status UX | `threshold-tracker/src/lib/idb.ts`, `src/lib/pwa.ts` | P1 |
| Notifications | Partial support only | Need subscription path and reminder scheduling wiring | `threshold-compass-v2/app/api/push/subscribe/route.ts` | P2 |
| Visual UX | Improved but uneven across pages | Need consistent states, empty/loading/error, richer compass visuals | `threshold-compass-v2/components/*` + thresholdapp patterns | P1 |
| Data portability | Export exists | Need import validation + migration versioning + safer CSV/JSON handling | `threshold-tracker/src/lib/import.ts` | P2 |
| QA and release safety | Limited regression harness | Need test matrix + smoke scripts + seeded fixtures | New in target repo | P0 |
