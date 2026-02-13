# OpenCode Sidequest: Signal Constellation Lab (Non-Interfering)

## Mission
Build a standalone "signal simulator + visual lab" that generates synthetic microdosing datasets and visualizes protocol outcomes.

This should help us test insights/pattern logic later, but must not touch production app code.

## Strict Boundaries (must follow)
- Allowed write paths only:
  - `labs/signal-constellation-lab/**`
  - `AI_EXECUTION/opencode-sidequests/**`
- Do NOT modify:
  - `app/**`
  - `components/**`
  - `lib/**` (except if creating `labs/...` only)
  - `types/**`
  - `package.json`
  - `pnpm-lock.yaml`
  - `supabase/**`
- No dependency installs.

## Deliverables
1. `labs/signal-constellation-lab/README.md`
2. `labs/signal-constellation-lab/generate-fixtures.mjs`
3. `labs/signal-constellation-lab/fixtures/` sample JSON outputs
4. `labs/signal-constellation-lab/index.html`
5. `labs/signal-constellation-lab/viewer.js`
6. `labs/signal-constellation-lab/out/report.md`

## Creative Concept
Create a "constellation map" of doses where each point is a dose event and color indicates day class:
- green: optimal
- yellow: caution
- red: too high
- gray: unclassified

Include controls for:
- sensitivity (1-5)
- tolerance carryover (% baseline)
- context weighting (work/creative/social/etc)
- noise/randomness
- substance (`psilocybin`, `lsd`)

## Fixture Schema (minimum)
Each generated dose row should include:
- `id`
- `timestamp`
- `amount`
- `substance`
- `phase` (`baseline`|`context`)
- `dose_number`
- `signal_score`
- `texture_score`
- `interference_score`
- `day_classification`
- `threshold_feel`
- `context_tags` (array)
- `carryover_score`
- `effective_dose`

## Output Requirements
- Generate at least 5 fixture profiles:
  - cautious responder
  - average responder
  - high sensitivity
  - inconsistent responder
  - rapid tolerance buildup
- For each fixture, output summary stats:
  - green/yellow/red counts
  - estimated floor/sweet/ceiling
  - confidence estimate

## Validation Command
OpenCode should be able to run:
```bash
node labs/signal-constellation-lab/generate-fixtures.mjs
```
Then open:
```bash
xdg-open labs/signal-constellation-lab/index.html
```

## Handoff Notes
- Keep code plain JS/HTML/CSS, zero deps.
- Keep everything self-contained.
- Write concise docs so other AIs can reuse these fixtures for integration tests.
