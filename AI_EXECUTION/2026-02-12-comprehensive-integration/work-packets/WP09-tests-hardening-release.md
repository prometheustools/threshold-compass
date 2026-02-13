# WP09 - Tests, Hardening, Release

## Goal
Prevent regressions and make release repeatable.

## Scope
- Add critical-path automated checks.
- Add manual QA script for product sanity.

## Target areas
- Auth + onboarding skip flow
- Dose logging lifecycle
- Insights rendering with real and empty datasets
- Export/import
- Offline queue replay

## Tasks
1. Add smoke tests for core user journeys.
2. Add regression tests for schema-missing and policy-denied errors.
3. Add CI commands for lint/build/smoke.
4. Create release verification checklist.

## Acceptance criteria
- No P0 regressions in smoke test matrix.
- Build and lint pass on clean install.
