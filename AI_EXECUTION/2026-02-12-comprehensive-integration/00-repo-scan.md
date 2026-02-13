# 00 - Repository Scan

## Scanned directories
- `/home/taylor/GitHub/threshold-compass`
- `/home/taylor/GitHub/threshold-compass-v2`
- `/home/taylor/GitHub/threshold-tracker`
- `/home/taylor/GitHub/_apps/threshold-compass-fe0f62ec`
- `/home/taylor/GitHub/StealingFire/apps/thresholdapp`
- `/home/taylor/GitHub/StealingFire/web` (partial relevance)
- Duplicate mirrors also found under `(copy)` and `_apps/` for v2/tracker.

## Canonical mapping (deduplicated)
- `threshold-compass` and `threshold-compass (copy)` share commit `b5bfc2e`.
- `threshold-compass-v2`, `threshold-compass-v2 (copy)`, `_apps/threshold-compass-v2` share `e096776`.
- `threshold-tracker`, `threshold-tracker (copy)`, `_apps/threshold-tracker` share `2178905`.
- `_apps/threshold-compass-fe0f62ec` is separate (`c122e09`).

## Architecture snapshots
- `threshold-compass`: Next.js 14, React 18, Supabase backend, 5 core tables used in app today.
- `threshold-compass-v2`: Next.js 16, React 19, broader APIs, richer schema (`substance_profiles`, `reflections`, `patterns`) and advanced components.
- `threshold-tracker`: Vite + React 19 PWA; strongest source for protocol engine, STI/day-classification, analytics charts, offline/IDB patterns.
- `fe0f62ec`: onboarding-heavy Vite app; useful UI patterns, not backend-integrated.
- `thresholdapp`: useful checklist and calibration panel patterns; no Supabase integration.

## High-value reusable modules
- From `threshold-compass-v2`
  - `components/dose/STISliders.tsx`
  - `components/dose/ThresholdFeelSelector.tsx`
  - `components/dose/BodyMap.tsx`
  - `components/insights/ThresholdTerrainMap.tsx`
  - `components/insights/ToleranceVisualizer.tsx`
  - `components/ui/Toast.tsx`, `components/ui/ErrorBoundary.tsx`, `components/ui/Skeleton.tsx`
  - `lib/algorithms/patterns.ts`, `lib/algorithms/pattern-pipeline.ts`
  - `lib/hooks/useServiceWorker.ts`, `components/pwa/PWAProvider.tsx`
  - API patterns: `app/api/patterns/route.ts`, `app/api/reflections/route.ts`
- From `threshold-tracker`
  - `src/lib/tolerance.ts`, `src/lib/threshold-profile.ts`, `src/lib/smart-suggestions.ts`
  - `src/components/ui/STISliders.tsx`, `ThresholdFeelSelector.tsx`, `ReflectionReminderModal.tsx`, `SmartSuggestionCard.tsx`
  - `src/components/insights/*` chart set
  - `src/lib/pwa.ts`, `src/lib/idb.ts`, `public/sw.js`, `src/hooks/useOnlineStatus.ts`
- From `thresholdapp`
  - `src/components/onboarding/OnboardingChecklist.tsx`
  - `src/components/home/panels/BatchCalibrationPanel.tsx`
  - `src/components/home/CompassArc.tsx` (visual inspiration only)
- From `fe0f62ec`
  - onboarding step pacing and transition patterns (`OnboardingLayout.tsx`, onboarding screens)

## Not recommended to merge directly
- Whole-project dependency stacks from Vite apps into Next app.
- Framer-motion-heavy onboarding from `fe0f62ec` as-is.
- Astrology-specific modules from `StealingFire/web`.
