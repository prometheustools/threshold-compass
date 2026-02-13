# Threshold Compass Comprehensive Integration Pack

Generated: 2026-02-12
Target repo: `/home/taylor/GitHub/threshold-compass`

This folder is an execution-ready plan for integrating the best parts of related Threshold projects into the current `threshold-compass` app.

## What this covers
- Repository scan and canonical source mapping (no duplicate-copy confusion)
- Comprehensive feature inventory
- Gap matrix for `threshold-compass`
- Phased implementation plan with dependencies and risks
- Agent-ready work packets with file-level targets
- Validation runbook and final release gates

## Canonical source repos
- Primary target: `threshold-compass` (Next.js 14, Supabase, Zustand)
- Source 1: `threshold-compass-v2` (merged architecture and richer component set)
- Source 2: `threshold-tracker` (protocol engine, STI model, insights, PWA/offline patterns)
- Optional source: `_apps/threshold-compass-fe0f62ec` (onboarding UX patterns)
- Optional source: `StealingFire/apps/thresholdapp` (checklist UX, compass arc/terrain concepts)

## Read order
1. `00-repo-scan.md`
2. `01-feature-catalog.md`
3. `02-gap-matrix.md`
4. `03-master-plan.md`
5. `05-runbook.md`
6. `work-packets/*.md`

## Fast start for another AI
1. Execute `WP02` first (schema + RLS + auth correctness).
2. Execute `WP01` next (onboarding skip, preview path, autologin hardening).
3. Execute `WP03`, `WP04`, `WP06` in parallel.
4. Execute `WP05`, `WP07`, `WP08` after data model settles.
5. Execute `WP09` last for test hardening and release checks.
