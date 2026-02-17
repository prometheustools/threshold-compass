# Threshold Compass - Ruthless Critique and Accelerated Delivery Plan

Date: 2026-02-15  
Owner: Product + Engineering  
Audience: Current team, handoff engineers, QA, design

## 1) Executive Summary

The product direction is valid, but the core loop is still the only thing that matters:

- Must work every time: create batch -> log dose -> see protocol progress (X/10).
- Current blockers are structural, not cosmetic: split data layers, schema mismatch, and trust-breaking UI bugs.
- Settle Mode, onboarding framing, and the compass shell are strong assets.
- Content-heavy modules are currently diluting execution focus.

If only one thing ships: fix batch creation and dose logging end-to-end on one data path.

## 2) Brutal Truths (Intake, preserved)

- Core loop is effectively broken when batch creation or dose logging fails.
- Two data layers are competing (Supabase and localStorage) without deterministic sync.
- "30-second log" is not credible with current form layout and scroll depth.
- Compass visualization is not currently self-explanatory.
- Hydration mismatch (OfflineBanner SSR/CSR) causes repeated instability/perf noise.
- Stash identity is confused (calendar + batches + manager split).
- Gamification artifacts remain in the model and should be removed.
- Incorrect substance display in Settings destroys trust.
- North Star currently adds friction without functional contribution.
- Workshop scope is oversized relative to core stability needs.

## 3) Timeline Compression (Shortened)

Original schedule implied up to 10 weeks. New schedule is 4 weeks total.

| Phase | New Timeline | Dates | Exit Gate |
|---|---:|---|---|
| Phase 1 - Core | 1 week | 2026-02-16 to 2026-02-22 | New user completes onboarding + first log + sees 1/10 in <=90s |
| Phase 2 - Lovable | 1 week | 2026-02-23 to 2026-03-01 | 10-dose users get meaningful return reason |
| Phase 3 - Complete | 2 weeks | 2026-03-02 to 2026-03-15 | Spreadsheet replacement value proven |

## 4) Phase 1 - Core (Week 1)

### Objective
Ship a reliable, trustable instrument loop: batch creation and dose logging work every time, with clear protocol progress.

### Scope

#### Keep
- Onboarding steps 1-5 (streamline but keep tone and first-batch setup).
- Compass home information hierarchy.
- Settle Mode (Drift) as-is with minor polish only.
- Collapsible dose form structure.
- Medication safety list.
- Data export/import.

#### Cut in this phase
- Achievements/XP/streak/challenges structures and UI hooks.
- North Star from onboarding flow.
- Workshop entry points from core routes.
- Calendar-first stash presentation.
- Reflect page as primary path.
- Offline banner rendering until hydration-safe.

### Critical Fix Workstreams

#### WS1 - Data Layer Unification (P0)
Owner: Backend engineer  
Support: Frontend engineer

Tasks:
- Route all batch and dose writes through Supabase-backed APIs only.
- Keep localStorage as read-through cache and offline fallback only.
- Add a single repository/service layer for reads/writes used by onboarding, batch manager, and dose form.
- Remove direct localStorage mutations from feature UIs.

Deliverables:
- Unified data service module with shared methods.
- Refactored Batch Manager and Dose Form to call shared service.
- Migration note documenting cache behavior and conflict rules.

Acceptance criteria:
- Batch created in any UI is immediately available in all UIs.
- No code path writes authoritative data only to localStorage.

#### WS2 - Schema and Write Reliability (P0)
Owner: Backend engineer

Tasks:
- Fix `dose_logs` amount column precision/scale to support common ranges.
- Add migration guard and rollback SQL.
- Add server-side validation for amount, unit, and batch linkage.
- Return structured API errors with codes.

Deliverables:
- SQL migration applied locally and staged for production.
- API tests covering 50-500mg and 5-50ug ranges.

Acceptance criteria:
- No "numeric field overflow" across supported dose ranges.
- Failed writes return actionable error objects.

#### WS3 - Core Loop UX Speed (P0)
Owner: Frontend engineer  
Support: Designer

Tasks:
- Make dose form open in minimal mode every new session.
- Sticky submit/footer CTA always visible.
- Add success confirmation state: "Dose logged" + batch tally + protocol step.
- Auto-return to compass after confirmation (or explicit CTA).
- Add compass progress marker: `X/10 CALIBRATING`.

Deliverables:
- Updated `/log` and `/compass` interaction flows.
- Manual timing test results (fresh user <=90s to first successful loop).

Acceptance criteria:
- New user can complete first log and see `1/10` without confusion.
- Primary submit action is visible without deep scroll.

#### WS4 - Trust/Quality Bugs (P1)
Owner: Frontend engineer

Tasks:
- Fix OfflineBanner SSR/CSR hydration mismatch (client-only render strategy).
- Fix settings substance source-of-truth (onboarding selection reflected correctly).
- Initialize store safely when cache missing/cleared.

Acceptance criteria:
- No hydration warning on first load.
- Settings always reflects actual selected substance.
- Fresh install and cleared-storage paths do not crash.

### Execution Sequence (Handoff-Ready)

| Day | Primary Owner | Deliverable | QA Gate |
|---|---|---|---|
| Day 1 (2026-02-16) | Backend | Final SQL migration for dose precision + error-code API responses | Migration dry run passes on local DB clone |
| Day 2 (2026-02-17) | Backend + Frontend | Unified batch/dose service layer wired into onboarding + batch manager | Batch created in either flow appears everywhere |
| Day 3 (2026-02-18) | Frontend | Dose form minimal mode + sticky submit + success confirmation | First log completes without scroll hunting |
| Day 4 (2026-02-19) | Frontend | Compass `X/10 CALIBRATING` and post-log return path | Logged dose updates progress deterministically |
| Day 5 (2026-02-20) | Frontend | Hydration fix + settings substance source-of-truth fix | No hydration warnings, settings value correct |
| Day 6 (2026-02-21) | QA | Full happy path regression on fresh and returning users | 0 open P0 defects |
| Day 7 (2026-02-22) | DRI | Release candidate, handoff docs, rollback validation | Phase exit metric achieved |

### Handoff Package (Required)
- `docs/phase1-core-handoff.md` with architecture changes and edge cases.
- Updated ERD or schema diff for dose/batch entities.
- API contract examples (`createBatch`, `logDose`, `getProgress`).
- Test evidence: lint/build, unit tests, and a manual happy-path recording.
- Rollback plan for schema migration.

### Definition of Done
- Core loop works across onboarding and returning-user flows.
- No P0/P1 regression in batch and dose paths.
- Success metric met: onboarding -> first log -> `1/10` in <=90 seconds.

## 5) Phase 2 - Lovable (Week 2)

### Objective
Make users want to come back after calibration starts.

### Build

#### WS5 - Quick Log (P0)
Owner: Frontend engineer

Tasks:
- Add one-tap quick log from compass using last-used batch, amount, and food state.
- Confirmation toast + undo window (short duration).
- Fallback to full form if required fields are missing.

Acceptance criteria:
- Returning user can log in <=10 seconds from compass.

#### WS6 - Compass Clarity and Drift Value (P0)
Owner: Frontend + Designer

Tasks:
- Replace abbreviations with readable labels (Excess, Consistent, Minimal/None).
- Add visual legend and first-run tooltip.
- Add drift detection banner based on recent pattern deviation.

Acceptance criteria:
- User can explain current compass state without external docs.
- Drift banner appears only on clear threshold-change criteria.

#### WS7 - Navigation Simplification (P1)
Owner: Frontend engineer

Tasks:
- Reduce bottom nav to 4: Compass, Log, History, Settings.
- Make Settle FAB directly open Drift mode.
- Merge stash/calendar into a useful reverse-chron history view.

Acceptance criteria:
- No dead-end tabs.
- Batch actions discoverable from Settings/History without route confusion.

### Execution Sequence (Handoff-Ready)

| Day | Primary Owner | Deliverable | QA Gate |
|---|---|---|---|
| Day 1 (2026-02-23) | Frontend | Quick-log interaction and fallback routing to full form | Quick log works for fully configured user |
| Day 2 (2026-02-24) | Frontend + Design | Compass label rewrite + legend + first-run tooltip | Users interpret state correctly in usability check |
| Day 3 (2026-02-25) | Full-stack | Drift detection logic + banner display thresholds | No false-positive alerts on static data |
| Day 4 (2026-02-26) | Frontend | Bottom nav reduction + Settle FAB direct action | Navigation tasks complete in <=2 taps |
| Day 5 (2026-02-27) | Frontend | History-first stash replacement and batch discoverability | No orphaned routes or dead CTAs |
| Day 6 (2026-02-28) | QA | Cross-device/manual regression | 0 open P0/P1 defects |
| Day 7 (2026-03-01) | DRI | Release candidate + handoff and metrics review | Phase exit metric achieved |

### Handoff Package (Required)
- Interaction spec updates for quick log and compass legend.
- Copy deck for labels/tooltips/banners.
- Analytics events for `quick_log_used`, `drift_alert_seen`, `history_opened`.

### Definition of Done
- Users who finish dose 10 have a clear reason to return weekly.
- Navigation and logging feel lighter than Phase 1 baseline.

## 6) Phase 3 - Complete (Weeks 3-4)

### Objective
Deliver clear spreadsheet-replacement value and retention utility.

### Build

#### WS8 - Batch Comparison (P0)
Owner: Full-stack engineer

Tasks:
- Compute per-batch threshold ranges and confidence.
- Show side-by-side comparison when batch switches.
- Add exportable summary snippet for practitioner discussion.

Acceptance criteria:
- User can answer: "How does Batch B differ from Batch A?" from one screen.

#### WS9 - Threshold Report Export (P0)
Owner: Full-stack engineer

Tasks:
- Build one-page report view (range, preferred batch, context effects).
- Export as shareable PDF/JSON.
- Add clear privacy copy and local/offline export behavior.

Acceptance criteria:
- Report generation succeeds for any user with >=10 logs.

#### WS10 - Ops and Delivery Hardening (P1)
Owner: Platform engineer

Tasks:
- PWA install prompt + manifest sanity.
- Optional account linking for cross-device sync (anonymous-first remains).
- Performance pass: fix hydration overhead, lazy-load non-core modules.
- Mobile QA at 375px width on real devices.

Acceptance criteria:
- Interactive performance target met on mobile.
- Install and sync features do not block anonymous usage.

### Execution Sequence (Handoff-Ready)

| Week | Primary Owner | Deliverable | QA Gate |
|---|---|---|---|
| Week 1 (2026-03-02 to 2026-03-08) | Full-stack | Batch comparison calculations + UI + threshold report draft | Comparison outputs validated on seeded datasets |
| Week 2 (2026-03-09 to 2026-03-15) | Platform + Full-stack | Export finalization, PWA/install polish, perf and mobile hardening | Mobile perf and install checks pass, 0 open P0 |

### Handoff Package (Required)
- Comparison calculation notes and assumptions.
- Report schema + example outputs.
- Performance benchmark before/after summary.

### Definition of Done
- A paid course user prefers this app over spreadsheet tracking due to comparison + reporting utility.

## 7) Never-Build List (Enforced)

- Social sharing/community/leaderboards
- AI dose recommendations
- Long-form journaling as core feature
- Any achievements/XP/streak gamification
- Paywall on logging/compass/Settle core
- Health app integrations (Apple Health, etc.)
- Content-feed/discover behavior
- Chat assistant for advice-giving

## 8) Pass-Off Operating Model

### Roles
- DRI (single owner per phase): accountable for schedule and acceptance.
- Feature owners: one engineer per workstream.
- QA owner: owns test matrix and release gate.
- Design owner: owns copy/clarity and interaction constraints.

### Branch and PR Protocol
- Branch naming: `phase{n}/ws{n}-{short-desc}`
- PR size cap: <=500 net LOC preferred, split by workstream.
- Every PR must include:
  - user-visible change summary,
  - risk notes,
  - test evidence,
  - rollback notes if DB touched.

### Release Gates
- No phase close without:
  - passing lint/build/tests,
  - manual happy-path script completion,
  - updated handoff doc,
  - zero open P0 defects.

## 9) Immediate Next 48 Hours

1. Finalize and run schema fix for dose amount precision.
2. Lock unified data service and cut direct localStorage writes.
3. Verify create batch and log dose from onboarding and standalone flows.
4. Ship compass `X/10` progress and post-log confirmation.
5. Remove/disable non-core distractions from main navigation.

## 10) One Thing (Non-Negotiable)

Before any additional feature work: batch creation and dose logging must function end-to-end through one authoritative Supabase path, with localStorage only as cache/fallback.
