# 01 - Feature Catalog

## Already in `threshold-compass`
- Supabase auth/middleware and protected routes
- Anonymous auto-login page (`/autologin`)
- Core routes: compass, log, history, batch, discovery, settings, settle
- Core schema/tables: `users`, `batches`, `dose_logs`, `check_ins`, `threshold_ranges`
- Basic carryover and threshold-range algorithms
- Export endpoint

## Missing or partial vs other repos
- Protocol UX depth
  - Pre/post split logging flow
  - STI model and day classification (`green/yellow/red`)
  - Context tags and post-dose completion loop
- Insights depth
  - Multi-chart analytics suite
  - Correlation and trend views
  - Threshold range explainer visuals
- Backend model depth
  - `substance_profiles`, `patterns`, `reflections`
  - richer `dose_logs` fields (phase, dose_number, threshold_feel, context_tags, carryover json)
- Reliability / app quality
  - Offline queue and resync
  - Robust error boundaries, skeletons, toasts
  - background notification plumbing
- UX cohesion
  - stronger dashboard composition
  - consistent visual status language
  - onboarding skip/preview that truly bypasses blockers

## Concrete additions beyond onboarding
- Logging engine: STI + threshold feel + context tagging
- Insights tab: tolerance, STI trends, correlation charts, threshold terrain
- Pattern detection pipeline + pattern cards
- Reflections flow (`eod/24h/72h`) and reminder loops
- Offline-first: IDB queue + service worker + stale/dirty indicators
- Notification APIs and push subscription path
- Advanced batch recalibration flows
- Data import/export resilience and schema versioning
