# Protocol Replay Forge

Standalone simulation lab for replaying discovery protocols over time.

## Usage

```bash
node replay.mjs [options]
```

## Options

| Flag | Description |
|------|-------------|
| `--scenario <name>` | Run a specific scenario |
| `--all` | Run all scenarios |
| `--json-only` | Only output JSON |
| `--md-only` | Only output markdown |
| `--help`, `-h` | Show help |

## Scenarios

| Scenario | Description |
|----------|-------------|
| `steady_discovery` | Standard 8-week protocol, 3-day intervals, 92% adherence |
| `overeager_escalation` | Progressive dose increase, high tolerance buildup |
| `excellent_protocol_adherence` | Near-perfect adherence, minimal variability |
| `high_variability_batch` | Inconsistent batch potency, unpredictable results |

## Run Examples

```bash
# Run one scenario
node replay.mjs --scenario steady_discovery

# Run all scenarios
node replay.mjs --all

# Run all, JSON only
node replay.mjs --all --json-only
```

## Output

Outputs written to `out/`:
- `{scenario}.json` - Full event log
- `{scenario}.md` - Human-readable report
- `index.md` - Summary of all scenarios
