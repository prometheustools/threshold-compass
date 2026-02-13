# WP06 - Compass Visual UX and Navigation

## Goal
Unify product look/feel and improve information clarity.

## Source references
- `threshold-compass-v2/components/compass/*`
- `threshold-compass-v2/components/layout/*`
- `StealingFire/apps/thresholdapp/src/components/home/CompassArc.tsx`

## Target files
- `components/compass/CompassView.tsx`
- `components/compass/CompassVisualization.tsx`
- `app/(app)/layout.tsx`
- `components/ui/{EmptyState,LoadingState}.tsx`

## Tasks
1. Normalize state-driven compass visuals (clear/mild/moderate/elevated + calibration states).
2. Ensure consistent nav affordances and action hierarchy.
3. Standardize empty/loading/error states across pages.
4. Improve mobile-first spacing and visual rhythm.

## Acceptance criteria
- Visual states are consistent across compass/log/history/batch/settings.
- No dead-end pages without recovery action.
