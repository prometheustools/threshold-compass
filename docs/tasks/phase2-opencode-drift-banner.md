# Task: Drift Detection Banner + First-Run Tooltip

## Branch
You are on `phase2/lovable`. Commit directly to this branch.

## Context
The Threshold Compass shows a compass visualization. Users who have completed calibration (10 doses) need to see a drift detection banner when their recent doses deviate from their established threshold range. New users need a first-run tooltip explaining the compass.

## Files to modify
- `app/(app)/compass/page.tsx` - add drift banner and first-run tooltip to the compass page
- `lib/algorithms/drift.ts` - NEW FILE: drift detection algorithm

## Changes Required

### 1. Create drift detection algorithm (lib/algorithms/drift.ts)
```typescript
import type { ThresholdRange } from '@/types'

interface DriftResult {
  isDrifting: boolean
  direction: 'above' | 'below' | null
  message: string
  severity: 'info' | 'warning'
}

interface RecentDose {
  amount: number
  dosed_at: string
}

export function detectDrift(
  recentDoses: RecentDose[],
  thresholdRange: ThresholdRange | null
): DriftResult {
  const noDrift: DriftResult = { isDrifting: false, direction: null, message: '', severity: 'info' }

  if (!thresholdRange || !thresholdRange.sweet_spot || !thresholdRange.floor_dose || !thresholdRange.ceiling_dose) {
    return noDrift
  }

  if (recentDoses.length < 3) return noDrift

  // Look at last 3 doses
  const last3 = recentDoses.slice(0, 3)
  const avgAmount = last3.reduce((sum, d) => sum + d.amount, 0) / last3.length

  // Check if average is drifting above ceiling or below floor
  if (avgAmount > thresholdRange.ceiling_dose) {
    return {
      isDrifting: true,
      direction: 'above',
      message: `Recent doses averaging ${avgAmount.toFixed(1)} — above your ceiling of ${thresholdRange.ceiling_dose}`,
      severity: 'warning',
    }
  }

  if (avgAmount < thresholdRange.floor_dose) {
    return {
      isDrifting: true,
      direction: 'below',
      message: `Recent doses averaging ${avgAmount.toFixed(1)} — below your floor of ${thresholdRange.floor_dose}`,
      severity: 'info',
    }
  }

  return noDrift
}
```

### 2. Add drift banner to compass page (compass/page.tsx)
Import the drift detection and add state + UI. After the compass data loads, compute drift:

Add import at top:
```typescript
import { detectDrift } from '@/lib/algorithms/drift'
```

Add state:
```typescript
const [driftResult, setDriftResult] = useState<{ isDrifting: boolean; direction: 'above' | 'below' | null; message: string; severity: 'info' | 'warning' } | null>(null)
```

After setting thresholdRange in the loadCompassData function, compute drift from doseRows:
```typescript
if (nextThresholdRange) {
  const drift = detectDrift(typedDoseRows, nextThresholdRange)
  setDriftResult(drift)
}
```

Add the banner UI between CompassView and the Quick Log card:
```tsx
{driftResult?.isDrifting && (
  <div className={`mx-auto w-full max-w-xl rounded-card border px-4 py-3 ${
    driftResult.severity === 'warning'
      ? 'border-status-moderate/30 bg-status-moderate/10'
      : 'border-ember/30 bg-elevated'
  }`}>
    <p className="font-mono text-xs uppercase tracking-widest text-bone mb-1">
      {driftResult.direction === 'above' ? 'Upward Drift' : 'Downward Drift'}
    </p>
    <p className="text-sm text-ivory">{driftResult.message}</p>
  </div>
)}
```

### 3. First-run tooltip on compass
Add a localStorage-based tooltip that shows once for new calibrating users.

Add state:
```typescript
const [showTooltip, setShowTooltip] = useState(false)
```

In the loadCompassData effect, after setting state, check if user has seen the tooltip:
```typescript
const tooltipKey = 'compass_tooltip_seen'
if (!window.localStorage.getItem(tooltipKey) && typedBatch?.calibration_status === 'calibrating') {
  setShowTooltip(true)
}
```

Add tooltip UI right after the CompassView:
```tsx
{showTooltip && (
  <div className="mx-auto w-full max-w-xl rounded-card border border-ember/30 bg-elevated px-4 py-3">
    <p className="text-sm text-ivory mb-2">
      Your compass tracks calibration progress. Log 10 doses to discover your threshold range — the dose window where you feel effects without excess.
    </p>
    <button
      type="button"
      onClick={() => {
        window.localStorage.setItem('compass_tooltip_seen', '1')
        setShowTooltip(false)
      }}
      className="text-xs text-orange font-mono uppercase tracking-wider hover:underline"
    >
      Got it
    </button>
  </div>
)}
```

## Design system constraints
- Background: #0A0A0A (base), #121212 (surface), #1E1E1E (elevated)
- Text: #F5F2E9 (ivory), #C4C0B6 (bone)
- Accent: #E07A3E (orange), #8B4D2C (ember)
- Status: #4A9B6B (clear), #C9A227 (mild/amber), #D4682A (moderate/orange), #B54A4A (elevated/red)
- Borders: rounded-card = 8px
- Font: JetBrains Mono for data labels
- NEVER use pure white (#FFFFFF)
- TypeScript strict mode, no `any`

## Commit message format
```
feat(compass): add drift detection banner and first-run tooltip
```

## Verification
Run `pnpm build` and ensure zero errors before committing.
