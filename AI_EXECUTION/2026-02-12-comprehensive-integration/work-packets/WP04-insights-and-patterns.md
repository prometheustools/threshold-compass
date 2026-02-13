# WP04 - Insights and Patterns

## Goal
Add an analytics layer that makes logged data actionable.

## Source references
- `threshold-tracker/src/components/insights/*`
- `threshold-compass-v2/lib/algorithms/pattern-pipeline.ts`
- `threshold-compass-v2/app/api/patterns/route.ts`

## Target files
- `app/(app)/insights/page.tsx` (new)
- `components/insights/*` (new)
- `app/api/patterns/route.ts` (new)
- `lib/algorithms/patterns.ts` (expand)

## Tasks
1. Stand up insights route and core chart widgets.
2. Add tolerance visualizer, STI trend charts, threshold range card.
3. Add backend pattern generation endpoint and persistence.
4. Add pattern card UI with dismiss/feedback loop.

## Acceptance criteria
- Insights page loads from production data.
- Pattern cards generated for qualifying data volumes.
