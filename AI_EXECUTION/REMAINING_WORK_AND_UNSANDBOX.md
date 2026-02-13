# Remaining Work + Runtime Constraints

Generated: 2026-02-13

## Completed in this validation pass
1. Added committed ESLint config so lint runs non-interactively.
2. `pnpm lint` now passes.
3. `pnpm build` passes after clearing stale `.next` artifacts.
4. Added operator handoff doc with DB verification SQL + explicit port map:
   - `AI_EXECUTION/DB_AND_PORTS_OPERATOR_GUIDE.md`
5. Updated comprehensive runbook with corrected SQL and port ownership:
   - `AI_EXECUTION/2026-02-12-comprehensive-integration/05-runbook.md`

## Current constraints observed from this execution environment
1. Live HTTP smoke tests cannot be run from this shell due `listen EPERM` when binding local ports (e.g. `127.0.0.1:3004`).
2. Direct Supabase host DNS resolution also failed in this shell, so DB verification must be done from your local browser/SQL editor.

## What is left for final integration handoff
1. Run live browser smoke flow on your machine:
   - `/autologin` -> `/onboarding` -> `/compass`
   - verify onboarding skip and preview route `/compass?preview=1`
2. Confirm Supabase state via SQL checks in `AI_EXECUTION/DB_AND_PORTS_OPERATOR_GUIDE.md`.
3. Validate end-to-end write/read:
   - create batch
   - log dose
   - verify history and insights render correctly
4. Optional but recommended:
   - implement full offline write queue/replay (currently offline banner baseline only)
   - expand insights visualizations beyond baseline cards/bars

## Local run commands
```bash
cd /home/taylor/GitHub/threshold-compass
pnpm install
pnpm lint
pnpm build
pnpm dev --port 3004
```
