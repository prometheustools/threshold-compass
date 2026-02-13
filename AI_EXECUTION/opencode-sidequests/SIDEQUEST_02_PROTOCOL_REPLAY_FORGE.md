# OpenCode Sidequest: Protocol Replay Forge (Non-Interfering)

## Mission
Build a standalone protocol replay engine that simulates 30-90 day dosing journeys and outputs timeline diagnostics.

This is a stress-test lab for discovery logic and pattern detection ideas, with no production code changes.

## Strict Boundaries
- Allowed writes:
  - `labs/protocol-replay-forge/**`
  - `AI_EXECUTION/opencode-sidequests/**`
- Forbidden writes:
  - `app/**`, `components/**`, `lib/**`, `types/**`, `supabase/**`
  - `package.json`, lockfiles, root config files
- No dependency installs.

## Deliverables
1. `labs/protocol-replay-forge/README.md`
2. `labs/protocol-replay-forge/replay.mjs`
3. `labs/protocol-replay-forge/scenarios/*.json` (at least 4)
4. `labs/protocol-replay-forge/out/*.json` generated timeline outputs
5. `labs/protocol-replay-forge/out/summary.md`

## Creative Concept
Build a flight recorder for a microdosing protocol:
- Input: scenario config
- Engine: simulated day-by-day dosing + rest + carryover + STI scoring
- Output: timeline with detected inflection points

## Required scenario set
- `steady_discovery.json`
- `overeager_escalation.json`
- `high_variability_batch.json`
- `excellent_protocol_adherence.json`

## Required output fields per event
- `day_index`
- `date`
- `action` (`dose`|`rest`)
- `dose_amount`
- `carryover_score`
- `effective_dose`
- `signal_score`
- `texture_score`
- `interference_score`
- `day_classification`
- `threshold_feel`
- `phase`
- `dose_number`

## Diagnostics required
For each run, compute:
- green/yellow/red ratios
- threshold-feel distribution
- projected floor/sweet/ceiling
- trend note: `stabilizing`, `drifting`, or `overheating`
- top 3 intervention suggestions

## CLI contract
```bash
node labs/protocol-replay-forge/replay.mjs --scenario steady_discovery
```

Optional:
```bash
node labs/protocol-replay-forge/replay.mjs --all
```

## Handoff quality bar
- Plain JS only, no dependencies.
- Deterministic output when using same seed.
- Clear docs and concise code comments only where needed.
