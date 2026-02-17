# Task: Compass Readable Labels + Visual Legend

## Branch
You are on `phase2/lovable`. Commit directly to this branch.

## Context
The Threshold Compass app uses a compass SVG visualization. Currently the North Star direction labels use cryptic abbreviations: CL, CN, CR, CA, EX. These need to become readable words.

## File to modify
`components/compass/CompassVisualization.tsx`

## Changes Required

### 1. Replace northStarShortLabels with readable labels
Change the `northStarShortLabels` record (line ~41-47) from abbreviations to full words:
- clarity → "CLARITY"
- connection → "CONNECT"
- creativity → "CREATE"
- calm → "CALM"
- exploration → "EXPLORE"

Adjust the font size from `text-[6px]` to `text-[5px]` if needed to prevent overlap, and offset the label positions slightly outward.

### 2. Replace tier labels with user-friendly terms
Change `tierLabels` record (line ~34-39):
- clear → "CLEAR"  (keep)
- mild → "MINIMAL"
- moderate → "MODERATE" (keep)
- elevated → "EXCESS"

### 3. Add zone legend below compass SVG
After the closing `</svg>` tag (around line 349), add a small legend row:
```tsx
{hasThresholdMarkers && thresholdRange && (
  <div className="flex justify-center gap-4 mt-2 px-4">
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-status-clear" />
      <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Floor</span>
    </div>
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-orange" />
      <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Sweet Spot</span>
    </div>
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-status-elevated" />
      <span className="font-mono text-[10px] text-bone uppercase tracking-wider">Ceiling</span>
    </div>
  </div>
)}
```

### 4. Replace LOW/SWEET/HIGH labels in the SVG
Change the threshold zone labels (line ~337-348):
- "LOW" → "FLOOR"
- "SWEET" → "SWEET SPOT"
- "HIGH" → "CEILING"

## Design system constraints
- Background: #0A0A0A (base), #121212 (surface)
- Text: #F5F2E9 (ivory), #C4C0B6 (bone), #8A8A8A (ash)
- Accent: #E07A3E (orange)
- Font: JetBrains Mono for data, uppercase tracking-wider
- Animations: 800ms ease-out ONLY
- NEVER use pure white (#FFFFFF)
- Touch targets: 44px minimum

## Commit message format
```
feat(compass): replace abbreviations with readable labels and add zone legend
```

## Verification
Run `pnpm build` and ensure zero errors before committing.
