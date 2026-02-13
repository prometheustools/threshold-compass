# WP03 - Dose Logging and Protocol Engine

## Goal
Integrate full protocol logic and richer dose capture.

## Source references
- `threshold-tracker/src/components/ui/STISliders.tsx`
- `threshold-tracker/src/components/ui/ThresholdFeelSelector.tsx`
- `threshold-tracker/src/lib/threshold-profile.ts`
- `threshold-tracker/src/lib/smart-suggestions.ts`
- `threshold-compass-v2/components/dose/*`

## Target files
- `components/forms/DoseForm.tsx`
- `app/(app)/log/page.tsx`
- `lib/algorithms/threshold-range.ts`
- `types/index.ts`
- `store/index.ts`

## Tasks
1. Convert single-form logging into pre-dose + post-dose completion workflow.
2. Add STI model capture and day classification.
3. Track dose phase and protocol dose number reliably.
4. Add context tags and timing fields.
5. Implement smart suggestions with safe constraints.

## Acceptance criteria
- User can complete 10-dose protocol with accurate phase metadata.
- STI/day classification persisted and visible in history.
