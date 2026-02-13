# 03 - Master Plan

## Objective
Ship a production-stable `threshold-compass` that combines:
- Compass backend/security architecture
- Tracker protocol + analytics depth
- V2 visual and reliability improvements

## Execution principles
- Keep `threshold-compass` as the only shipping app.
- Port logic first, then port UI components.
- Use idempotent SQL migrations only (no destructive resets in shared environments).
- Preserve anonymous auth path while keeping RLS valid.

## Phase breakdown

### Phase 0 - Stabilize existing flows (P0)
- Fix onboarding-final-step schema failures with deterministic checks.
- Implement true skip path: "Check out app" should enter preview mode without onboarding hard-fail.
- Tighten `autologin` + local session consistency.

Exit criteria:
- New user can enter app even when onboarding is skipped.
- Missing schema errors show actionable message and recovery CTA.

### Phase 1 - Schema and data model expansion (P0)
- Add migration set for:
  - `substance_profiles`
  - `reflections`
  - `patterns`
  - extended `dose_logs` columns for protocol/STI/context
- Keep backward compatibility for existing data.
- Add DB health endpoint and startup checks.

Exit criteria:
- migrations run cleanly on existing DB with data retained.
- app can read/write both legacy and new fields.

### Phase 2 - Protocol and logging engine (P0)
- Pre-dose form + post-dose completion workflow.
- STI sliders, threshold feel selector, day classification.
- 10-dose phase tracking and recalibration triggers.

Exit criteria:
- Can complete baseline 1-4 and context 5-10 with correct metadata.
- protocol state updates automatically after dose insert.

### Phase 3 - Insights and patterns (P1)
- Add insights route and charts.
- Add threshold range finder UI and tolerance visualizer.
- Add pattern generation pipeline and pattern cards.

Exit criteria:
- Insights page renders meaningful output from seeded demo + live data.
- pattern cards show confidence and recommendation with dismiss/action tracking.

### Phase 4 - Offline, notifications, reflections (P1/P2)
- IDB action queue + sync replay.
- Push subscription route and reminder scheduler wiring.
- Reflection prompts at EOD/24h/72h.

Exit criteria:
- Offline create/update works and syncs when online.
- reflection reminders and capture path functional.

### Phase 5 - UX polish + QA hardening (P0)
- unify loading/error/empty states, toasts, skeletons.
- visual consistency pass across all pages.
- end-to-end smoke tests and release checklist.

Exit criteria:
- smoke tests pass for auth, onboarding skip, logging, insights, export/import.

## Recommended parallelization
- Parallel lane A: WP01 + WP02
- Parallel lane B: WP03
- Parallel lane C: WP06
- After A/B merge: WP04
- Then WP05 + WP07 + WP08
- Final gate: WP09
