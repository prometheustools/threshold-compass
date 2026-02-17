# Overnight Execution Plan v2 — Threshold Compass
# Date: 2026-02-14 (Valentine's Night Build)
# Orchestrator: Claude Opus 4.6 (manages, reviews, integrates, fixes build)
# Workers: Codex (o4-mini), Gemini 2.5 Pro, OpenCode (dispatched in parallel)
# Runtime: ~5 hours autonomous execution

---

## Orchestration Model

```
┌─────────────────────────────────────────────────┐
│              CLAUDE (Orchestrator)               │
│  - Owns: git, branches, commits, build gates     │
│  - Does: Block 0 (safety), integration, review   │
│  - Reviews: every agent's output before commit    │
│  - Fixes: build errors, type errors, conflicts    │
│  - NEVER burns tokens on bulk implementation      │
├─────────────────────────────────────────────────┤
│  CODEX              GEMINI            OPENCODE   │
│  codex exec         gemini -p         opencode   │
│  --approval-mode    --yolo            run        │
│  full-auto                                       │
│                                                  │
│  Block 1:           Block 2:          Block 3:   │
│  Threshold algo     Discovery flow    Nav + UX   │
│  (new files only)   (new + modify)    (modify)   │
│                                                  │
│  Zero file overlap between agents                │
└─────────────────────────────────────────────────┘
```

**Rules:**
1. Claude does Block 0 directly (small, safety-critical, needs precision not volume)
2. Agents get dispatched in parallel after Block 0 commits
3. Each agent touches ONLY its assigned files — zero overlap enforced
4. Claude reviews each agent's output, fixes build errors, commits
5. Block 4 (polish) dispatched to whichever agent finishes first
6. Block 5 is Claude-only: build verification, cleanup, final commits

---

## Why the Codex Plan Was Wrong

| Codex Diagnosis | Reality |
|---|---|
| "Two data layers competing" | FALSE. All writes go through Supabase. localStorage = auth tokens + UI flags only |
| WS1 Data Layer Unification (biggest workstream) | Phantom work — problem doesn't exist |
| Core loop "broken" | Core loop works. What's missing: threshold calculation algorithm |
| Schema precision issue | Partially right, but the REAL bug is unit='g' default (1000x error) |
| 7-day Phase 1 timeline | Inflated for a team that doesn't exist |
| Team roles (BE eng, FE eng, QA, Designer) | It's AI agents tonight |

---

## BLOCK 0: Schema & Safety Fixes
**Executor: Claude (direct)**
**Duration: 15 min**
**Why first: downstream agents need correct schema context**

```
FILES:
  MODIFY  supabase/schema.sql              — unit default 'g' → 'mg'
  MODIFY  app/api/doses/route.ts           — unit fallback + carryover persistence
  MODIFY  components/forms/DoseForm.tsx     — dose_number guard
  CREATE  supabase/migrations/003_fix_unit_defaults.sql
  DELETE  v2_schema_reference.sql
```

Tasks:
- [ ] Fix schema unit default: `'g'` → `'mg'`
- [ ] Fix API route unit: `unit ?? 'g'` → `unit ?? 'mg'`
- [ ] Create migration SQL for existing data
- [ ] Guard dose_number: only set when batch is calibrating
- [ ] Wire carryover_score + effective_dose into dose creation payload
- [ ] Delete obsolete v2_schema_reference.sql
- [ ] `pnpm build` — must pass

**Gate: build passes, commit to overnight/phase1-core**

---

## BLOCK 1: Threshold Range Algorithm + API
**Executor: Codex (`codex exec --approval-mode full-auto`)**
**Duration: ~45 min**
**Dependency: Block 0 committed**

```
FILES (ALL NEW — zero conflict risk):
  CREATE  lib/algorithms/threshold-range.ts
  CREATE  app/api/threshold-range/route.ts
  CREATE  __tests__/threshold-range.test.ts
```

**Prompt for Codex:**
> You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Supabase).
>
> Read these files first for patterns and types:
> - types/index.ts (ThresholdRange type definition)
> - lib/algorithms/carryover.ts (algorithm pattern to follow)
> - supabase/schema.sql (threshold_ranges table schema)
> - app/api/doses/route.ts (API route pattern)
> - lib/supabase/server.ts (how to create Supabase server client)
>
> Create THREE files:
>
> 1. `lib/algorithms/threshold-range.ts` — Pure function that computes a threshold range from dose logs.
>    - Input: array of dose_logs with {amount, threshold_feel, signal_score, texture_score, interference_score}
>    - Output: {floor_dose, sweet_spot, ceiling_dose, confidence, qualifier, doses_used}
>    - Algorithm: sort by amount ascending, floor = max amount where feel is 'nothing'|'under', ceiling = min amount where feel is 'over', sweet_spot = weighted mean of 'sweetspot' doses weighted by (signal_score - interference_score + 10), confidence = f(count, consistency, STI variance)
>    - Handle: <3 sweet spots (low confidence), all same feel (can't determine range), non-monotonic responses (reduce confidence)
>    - Export the function as `calculateThresholdRange`
>
> 2. `app/api/threshold-range/route.ts` — POST endpoint
>    - Accepts: {batch_id: string}
>    - Auth: get user from Supabase session (follow pattern in doses/route.ts)
>    - Fetches dose_logs for that batch where post_dose_completed = true
>    - Calls calculateThresholdRange
>    - Upserts into threshold_ranges table
>    - Updates batches set calibration_status = 'calibrated' where id = batch_id
>    - Returns the computed range
>
> 3. `__tests__/threshold-range.test.ts` — Unit tests for the algorithm
>    - Test: 10 doses with clear ascending feel pattern → correct floor/sweet_spot/ceiling
>    - Test: all doses feel 'sweetspot' → sweet_spot set, floor/ceiling null, low confidence
>    - Test: <3 doses → very low confidence
>    - Test: non-monotonic (higher dose = 'nothing', lower dose = 'over') → reduced confidence
>    - Test: missing STI scores → still computes with defaults
>
> IMPORTANT: TypeScript strict mode, no `any`. Import types from `@/types`. Follow existing patterns exactly.

---

## BLOCK 2: Discovery Protocol Completion
**Executor: Gemini (`gemini -p "..." --yolo`)**
**Duration: ~45 min**
**Dependency: Block 0 committed (needs correct DoseForm context)**

```
FILES:
  CREATE  app/(app)/discovery/complete/page.tsx     — NEW (no conflict)
  MODIFY  components/forms/DoseForm.tsx             — add completion trigger after dose 10
  MODIFY  components/compass/CompassVisualization.tsx — calibrated state display
  MODIFY  app/(app)/batch/page.tsx                  — recalibrate button
```

**Prompt for Gemini:**
> You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Tailwind CSS).
>
> DESIGN SYSTEM (MUST FOLLOW):
> - Background: #0A0A0A (base), #121212 (surface), #1E1E1E (elevated)
> - Text: #F5F2E9 (primary), #C4C0B6 (secondary), #8A8A8A (disabled)
> - Accent: #E07A3E (orange CTAs), #8B4D2C (ember borders)
> - Status: #4A9B6B (green), #C9A227 (amber), #D4682A (orange), #B54A4A (red)
> - Fonts: JetBrains Mono for data, Inter for body
> - Animations: 800ms ease-out ONLY. NO bounce/spring/confetti.
> - NEVER use pure white (#FFFFFF)
>
> Read these files first:
> - types/index.ts (ThresholdRange type)
> - components/forms/DoseForm.tsx (understand dose submission flow)
> - components/compass/CompassVisualization.tsx (understand compass states)
> - components/compass/ThresholdRange.tsx (existing range display component)
> - app/(app)/batch/page.tsx (batch management)
> - app/(app)/discovery/page.tsx (existing discovery page)
>
> Do these tasks:
>
> 1. Create `app/(app)/discovery/complete/page.tsx`:
>    - "Range Found" reveal page shown after dose 10 completes
>    - Reads threshold_range from URL search params or fetches from API
>    - Shows floor_dose, sweet_spot, ceiling_dose with staggered 800ms ease-out reveal
>    - Use status colors: green for floor zone, amber for sweet spot, red for ceiling
>    - CTA button "Continue to Compass" → navigates to /compass
>    - 'use client' component, Tailwind only, no external animation libraries
>
> 2. Modify `components/forms/DoseForm.tsx`:
>    - After a dose is successfully logged, check if this was dose 10 for a calibrating batch
>    - If so, POST to /api/threshold-range with {batch_id}
>    - On success, redirect to /discovery/complete?range={JSON} instead of /compass
>    - On failure, still redirect to /compass (graceful degradation)
>
> 3. Modify `components/compass/CompassVisualization.tsx`:
>    - Add a new visual state for when batch is calibrated (has threshold_range data)
>    - Replace "X/10 CALIBRATING" text with the actual range display
>    - Show floor and ceiling as subtle ring markers on the compass
>    - Keep existing dormant/calibrating/elevated states working
>
> 4. Modify `app/(app)/batch/page.tsx`:
>    - Add "Recalibrate" button for calibrated batches
>    - Recalibrate sets calibration_status back to 'calibrating' and dose_number to 0
>    - Confirm dialog before recalibrating

---

## BLOCK 3: Navigation + Quick Log + History
**Executor: OpenCode (`opencode run "..."`)**
**Duration: ~45 min**
**Dependency: Block 0 committed**

```
FILES (zero overlap with Block 1 or Block 2):
  MODIFY  app/(app)/layout.tsx           — nav reduction to 4 tabs
  MODIFY  app/(app)/compass/page.tsx     — quick log button
  MODIFY  app/(app)/history/page.tsx     — upgrade to reverse-chron dose list
  MODIFY  store/index.ts                 — getLastDose helper
  MODIFY  app/(app)/stash/StashClient.tsx — redirect to /history (keep alive)
```

**Prompt for OpenCode:**
> You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Tailwind CSS).
>
> DESIGN SYSTEM:
> - Background: #0A0A0A, #121212, #1E1E1E, #2A2A2A
> - Text: #F5F2E9, #C4C0B6, #8A8A8A
> - Accent: #E07A3E, #8B4D2C
> - Animations: 800ms ease-out only
> - Touch targets: min 44px
> - NEVER use #FFFFFF
>
> Read these files first:
> - app/(app)/layout.tsx (current navigation structure)
> - app/(app)/compass/page.tsx (compass page)
> - app/(app)/history/page.tsx (current history page)
> - store/index.ts (Zustand store)
> - app/api/doses/route.ts (dose API)
> - types/index.ts (DoseLog type)
>
> Do these tasks:
>
> 1. Simplify navigation in `app/(app)/layout.tsx`:
>    - Reduce bottom nav to exactly 4 items: Compass (/compass), Log (/log), History (/history), Settings (/settings)
>    - Remove: stash, insights, any overflow/more menu
>    - Keep the Settle floating action button if it exists
>    - Use lucide-react icons: Compass, PenLine, Clock, Settings
>
> 2. Add quick log to `app/(app)/compass/page.tsx`:
>    - Add a "Log Same" button below the compass when user has a previous dose
>    - Fetch last dose for active batch from /api/doses (GET with limit=1)
>    - On tap: POST to /api/doses with same batch, amount, unit
>    - Show brief toast: "Dose logged - X/10" for 3 seconds with "Undo" link
>    - If no previous dose, show "Log First Dose" button linking to /log
>    - Keep this simple — inline component, no separate file needed
>
> 3. Upgrade `app/(app)/history/page.tsx`:
>    - Reverse-chronological list of dose_logs grouped by date
>    - Each entry shows: time (HH:MM), amount + unit, batch name, threshold_feel as text
>    - Color-code left border by day_classification (green/yellow/red/gray)
>    - Tap row to expand showing: sleep, energy, stress, notes, STI scores
>    - Batch filter dropdown at top
>    - Show "X/10 doses logged" progress for active batch
>    - Fetch from /api/doses with user auth
>
> 4. Add `getLastDose` to `store/index.ts`:
>    - Simple async function that fetches the most recent dose_log for the active batch
>    - Cache in store state, refresh after new log
>
> IMPORTANT: Do NOT modify DoseForm.tsx, CompassVisualization.tsx, or batch/page.tsx — another agent owns those files.

---

## BLOCK 4: Copy & Polish Pass
**Executor: Whichever agent finishes first (likely Gemini)**
**Duration: ~30 min**
**Dependency: Blocks 1-3 integrated**

```
FILES:
  MODIFY  components/forms/OnboardingSteps.tsx   — copy improvements
  MODIFY  app/(app)/settings/page.tsx            — substance source-of-truth fix
  MODIFY  components/compass/CompassVisualization.tsx — label clarity (if not done in Block 2)
```

Tasks:
- Fix settings substance display to read from Supabase user profile
- Add batch management link/section in settings
- Compass: replace abbreviations with readable labels, add "Carryover: Clear/Mild/etc"
- Remove any remaining wellness-speak ("You got this!", generic motivational copy)
- Ensure all empty states have specific, actionable copy

---

## BLOCK 5: Integration, Build, Commit
**Executor: Claude (direct)**
**Duration: ~30 min**
**Dependency: All blocks complete**

- [ ] Review every modified file for type errors, import issues, design violations
- [ ] `pnpm build` — zero errors
- [ ] Run tests if test runner configured
- [ ] Check for unused imports, dead code from removed nav items
- [ ] Conventional commits grouped by block:
  - `fix: correct unit defaults from g to mg in schema and API`
  - `feat: add threshold range calculation algorithm and API`
  - `feat: add discovery protocol completion with range reveal`
  - `feat: simplify navigation to 4 tabs with quick log`
  - `feat: upgrade history page with grouped dose timeline`
  - `fix: settings substance display reads from user profile`
- [ ] Verify no CLAUDE.md design violations (no #FFFFFF, no bounce, no spring)

---

## Execution Timeline

```
TIME     CLAUDE                 CODEX                GEMINI              OPENCODE
──────── ────────────────────── ──────────────────── ─────────────────── ──────────────────
0:00     Block 0: schema fixes  ·                    ·                   ·
0:15     commit Block 0         ·                    ·                   ·
0:15     dispatch ──────────────►Block 1: threshold  ·                   ·
0:15     dispatch ──────────────────────────────────►Block 2: discovery  ·
0:15     dispatch ──────────────────────────────────────────────────────►Block 3: nav+UX
0:15-    monitor agents         algorithm + API      completion flow     nav + quicklog
1:00     ·                      + tests              + compass state     + history
~1:00    review Codex output    ◄── done             (working)           (working)
~1:00    fix build if needed    ·                    ·                   ·
~1:00    commit Block 1         ·                    ·                   ·
~1:15    review Gemini output   ·                    ◄── done            (working)
~1:15    resolve DoseForm       ·                    ·                   ·
         merge (Block 0+2)
~1:15    commit Block 2         ·                    ·                   ·
~1:30    review OpenCode output ·                    ·                   ◄── done
~1:30    commit Block 3         ·                    ·                   ·
~1:30    dispatch Block 4 ──────────────────────────►polish + copy       ·
~2:00    review Block 4         ·                    ◄── done            ·
~2:00    Block 5: build + clean ·                    ·                   ·
~2:30    DONE ✓                 ·                    ·                   ·
```

**Realistic estimate: 2-3 hours total.** Not 8. Not overnight. This is a focused sprint.

---

## File Ownership (Conflict Prevention)

```
CLAUDE ONLY (Block 0):
  supabase/schema.sql
  supabase/migrations/003_fix_unit_defaults.sql
  v2_schema_reference.sql (delete)

CODEX ONLY (Block 1):
  lib/algorithms/threshold-range.ts          ← NEW
  app/api/threshold-range/route.ts           ← NEW
  __tests__/threshold-range.test.ts          ← NEW

GEMINI ONLY (Block 2 + 4):
  app/(app)/discovery/complete/page.tsx      ← NEW
  components/forms/DoseForm.tsx              ← Claude touches first in Block 0, then Gemini
  components/compass/CompassVisualization.tsx
  app/(app)/batch/page.tsx
  components/forms/OnboardingSteps.tsx        (Block 4)
  app/(app)/settings/page.tsx                (Block 4)

OPENCODE ONLY (Block 3):
  app/(app)/layout.tsx
  app/(app)/compass/page.tsx
  app/(app)/history/page.tsx
  store/index.ts
  app/(app)/stash/StashClient.tsx

SHARED (Claude resolves):
  components/forms/DoseForm.tsx              ← Block 0 (Claude) then Block 2 (Gemini)
```

**The one merge point:** DoseForm.tsx is touched by Claude in Block 0 (dose_number fix) and Gemini in Block 2 (completion trigger). Claude commits Block 0 first, Gemini works on the updated version.

---

## Agent Dispatch Commands

```bash
# After Block 0 is committed:

# Codex — Block 1 (threshold algorithm)
codex exec --approval-mode full-auto \
  "$(cat docs/prompts/block1-codex.md)"

# Gemini — Block 2 (discovery completion)
gemini -p "$(cat docs/prompts/block2-gemini.md)" --yolo

# OpenCode — Block 3 (nav + quick log + history)
opencode run "$(cat docs/prompts/block3-opencode.md)"
```

Prompts are stored in `docs/prompts/` so they can be reviewed and reused.

---

## Not Doing Tonight (Hard No)

- Batch comparison UI
- PDF/JSON export reports
- PWA install prompt
- Cross-device sync
- Performance profiling
- Check-ins / Reflections / Workshop / Calculator
- Any gamification (streak/XP/badges)
- AI recommendations
- Social features

---

## Morning Acceptance Test

1. `pnpm build` — clean, zero warnings
2. Onboarding → first dose → compass shows "1/10 CALIBRATING" — <90 seconds
3. Quick log from compass — <10 seconds
4. History shows all doses grouped by date with expand
5. Navigation: exactly 4 tabs (Compass, Log, History, Settings)
6. Settings shows correct substance from Supabase
7. Algorithm: 10 fixture doses → correct floor/sweet_spot/ceiling
8. Discovery complete page renders with staggered range reveal
9. All commits on `overnight/phase1-core` with conventional messages
10. No design violations: no #FFFFFF, no bounce animations, no wellness-speak
