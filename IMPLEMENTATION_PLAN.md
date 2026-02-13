# Threshold Compass — UI/UX Improvement Sprint
## Implementation Plan: 2-Day Sprint

**Generated:** February 12, 2026  
**Sprint Duration:** 2 days  
**Workers:** Multiple AI agents can work in parallel

---

## Worker Ownership Matrix (Prevents Merge Conflicts)

| Worker | Owns (Create) | Owns (Modify) |
|--------|---------------|----------------|
| **Worker A** | Navigation.tsx, BottomNav.module.css, LoadingState.tsx, EmptyState.tsx | app/(app)/layout.tsx, app/layout.tsx |
| **Worker B** | DiscoveryProgress.tsx, DoseGuidance.tsx | app/(app)/discovery/page.tsx |
| **Worker C** | CompassVisualization.tsx, EffectiveDose.tsx, ConfidenceBadge.tsx, compass.css | components/compass/CompassView.tsx, components/compass/ThresholdRange.tsx, app/(app)/compass/page.tsx |
| **Worker D** | (All page updates) | app/(app)/log/page.tsx, app/(app)/history/page.tsx, app/(app)/batch/page.tsx, app/(app)/settle/*.tsx, app/(app)/settle/**/*.tsx, app/(app)/settings/page.tsx |
| **Worker E** | Test files | — |

---

## Phase 1: Navigation System [DAY 1 - Morning]

**Goal:** Global navigation with sticky Settle button on every screen.

| Task | File | PRD Ref | Owner |
|------|------|---------|-------|
| 1.1: Create Navigation Component | `components/ui/Navigation.tsx` | RULE 4: Safety Never Gates | A |
| 1.2: Create BottomNav CSS | `components/ui/BottomNav.module.css` | — | A |
| 1.3: Update App Layout | `app/(app)/layout.tsx`, `app/layout.tsx` | — | A |
| 1.4: Add Nav to All Pages | All (app) pages | — | D |

### Task 1.1: Navigation Component Spec

```typescript
// components/ui/Navigation.tsx
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, Pill, Clock, Layers, Wind } from 'lucide-react'

// Specification
- Bottom navigation bar (mobile-first)
- 5 items: Compass, Log, History, Batches, Settle
- Settle button: Always orange, slightly larger
- Other items: bone color when inactive, orange when active
- Sticky at bottom, above safe area
- Background: surface (#121212)
- Border top: ember/20
- 44px minimum touch targets

const navItems = [
  { href: '/compass', label: 'Compass', icon: Compass },
  { href: '/log', label: 'Log', icon: Pill },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/batch', label: 'Batches', icon: Layers },
  { href: '/settle', label: 'Settle', icon: Wind, highlight: true },
]
```

### Task 1.2: BottomNav CSS

```css
/* components/ui/BottomNav.module.css */
.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  height: calc(64px + env(safe-area-inset-bottom));
  background: #121212;
  border-top: 1px solid rgba(139, 77, 44, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 50;
  backdrop-filter: blur(8px);
}

.navItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 8px;
  color: #C4C0B6;
  text-decoration: none;
  transition: color 200ms ease-out;
}

.navItemActive {
  color: #E07A3E;
}

.navItemHighlight {
  color: #E07A3E;
}
```

**Acceptance Criteria:**
- [x] Navigation visible on all (app) routes
- [x] Settle button always accessible (PRD RULE 4)
- [x] Active route highlighted in orange
- [x] 44px minimum touch targets
- [x] No bounce/spring animations (800ms max)

**Updates Made (Feb 12, 2026):**
- Changed Settle button from magenta to orange (per PRD)
- Made Settle button larger (h-14 w-14) with Wind icon
- Added Log as second nav item (primary action per PRD)
- Kept Discovery for 10-dose protocol access
- Fixed position to avoid nav overlap (bottom-24)

**Note:** Navigation already existed in `app/(app)/layout.tsx`. Minor improvements made to match PRD spec.

---

## Phase 2: Compass Visualization [DAY 1 - Afternoon]

**Goal:** Visual compass with animated needle, gradient arc, threshold markers.

| Task | File | PRD Ref | Owner |
|------|------|---------|-------|
| 2.1: Create CompassVisualization | `components/compass/CompassVisualization.tsx` | Section 6.6, VIZ-001 | C |
| 2.2: Create CSS Animation | `app/compass.css` | Section 6.6 | C |
| 2.3: Update CompassView | `components/compass/CompassView.tsx` | VIZ-001 | C |
| 2.4: Effective Dose Calculator | `components/compass/EffectiveDose.tsx` | FLOW-003 | C |

### Task 2.1: CompassVisualization Spec

```typescript
// components/compass/CompassVisualization.tsx
interface CompassVizProps {
  state: 'dormant' | 'calibrating' | 'calibrated_rest' | 'calibrated_active' | 'elevated_carryover'
  progress?: number // 0-10 for calibrating
  thresholdZones?: {
    floor: number
    sweetSpot: number
    ceiling: number
  }
  activeDoseHours?: number
  unit: 'g' | 'µg'
}

// Visual Specification
- SVG-based, responsive (aspect-ratio: 1/1)
- Arc: 270° sweep, centered bottom
- Gradient colors per state:
  - dormant: gray (#8A8A8A)
  - calibrating: #E07A3E → #6B4E8D (orange → violet)
  - calibrated_rest: #4A9B6B → #E07A3E → #B54A4A (green → orange → red)
  - calibrated_active: same as calibrated_rest
  - elevated_carryover: orange tint overlay
- Needle: Triangle pointer, 800ms ease-out settle animation
- Threshold markers: 3 vertical lines with labels (LOW/SWEET/HIGH)
- Center text per PRD Section 6.6:
  - DORMANT: "CALIBRATE"
  - CALIBRATING: "DOSE X OF 10"
  - CALIBRATED_REST: carryover tier
  - CALIBRATED_ACTIVE: "ACTIVE — Xh Ym"
  - ELEVATED_CARRYOVER: "REST — Xh to clear"
```

### Task 2.2: CSS Animation

```css
/* app/compass.css */
@keyframes needleSettle {
  from { transform: rotate(-135deg); }
  to { transform: rotate(var(--needle-target)); }
}

.animate-needle-settle {
  animation: needleSettle 800ms cubic-bezier(0.25, 0.1, 0.25, 1.0) forwards;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse-slow {
  animation: pulse 2s cubic-bezier(0.25, 0.1, 0.25, 1.0) infinite;
}
```

### Task 2.4: Effective Dose Calculator

```typescript
// components/compass/EffectiveDose.tsx
interface EffectiveDoseProps {
  amount: number // last dose amount
  effectiveMultiplier: number // 1 - (carryover / 100)
  unit: 'g' | 'µg'
}

// PRD: "If you dose 0.1g now, effective dose ≈ 0.07g"
// Formula: effectiveDose = inputAmount * effectiveMultiplier
// Only show when carryover > 15% (tier not CLEAR)
// Show at Guided level only
// Display: Monospace, orange accent for the "effective" value
```

**Acceptance Criteria:**
- [x] Compass shows visual arc with gradient
- [x] Needle animates 800ms ease-out, no bounce
- [x] 5 states visually distinct (PRD Section 6.6)
- [x] Threshold markers visible when calibrated
- [x] Effective dose when carryover > 15%

**Updates Made (Feb 12, 2026):**
- Created `components/compass/CompassVisualization.tsx` with 5 states (dormant, calibrating, calibrated_rest, calibrated_active, elevated_carryover)
- SVG-based with animated needle (800ms ease-out transition via CSS)
- Gradient arcs for each state matching PRD color specs
- Threshold markers (LOW/SWEET/HIGH) visible when calibrated
- Confidence badge (0-100%) displayed on visualization
- Calibration progress indicator (10 dots) for calibrating state
- Created `components/compass/EffectiveDose.tsx` with PRD formula
- Updated `components/compass/CompassView.tsx` to integrate visualization
- Removed duplicate Settle button (now handled by global nav in layout)
- TypeScript compiles without errors

---

## Phase 3: Discovery Protocol UI [DAY 1 - Afternoon]

**Goal:** Enhanced 10-dose calibration flow with progress, phases, guidance.

| Task | File | PRD Ref | Owner |
|------|------|---------|-------|
| 3.1: Update Discovery Page | `app/(app)/discovery/page.tsx` | FLOW-006, CAL-001 | B |
| 3.2: Create DiscoveryProgress | `components/discovery/DiscoveryProgress.tsx` | FLOW-006 | B |
| 3.3: Create DoseGuidance | `components/discovery/DoseGuidance.tsx` | FLOW-006 | B |

### Task 3.2: DiscoveryProgress Spec

```typescript
// components/discovery/DiscoveryProgress.tsx
interface DiscoveryProgressProps {
  currentDose: number // 1-10
  dosesCompleted: number
  preliminaryRange?: ThresholdRange | null
}

// Phase mapping per PRD:
const getPhase = (dose: number): 'baseline' | 'mapping' | 'refinement' => {
  if (dose <= 4) return 'baseline'
  if (dose <= 7) return 'mapping'
  return 'refinement'
}

const phaseColors = {
  baseline: '#C4C0B6',   // bone
  mapping: '#C9A227',    // amber
  refinement: '#6B4E8D', // violet
}
```

### Task 3.3: DoseGuidance Spec

```typescript
// components/discovery/DoseGuidance.tsx
// PRD Table from FLOW-006:
const guidanceByDose = {
  1: { phase: 'baseline', guidance: 'Start low. Establish your floor.' },
  2: { phase: 'baseline', guidance: 'Same range. Confirm or adjust.' },
  3: { phase: 'baseline', guidance: 'Same range. Confirm or adjust.' },
  4: { phase: 'baseline', guidance: 'Same range. Confirm or adjust.' },
  5: { phase: 'mapping', guidance: 'Step up slightly. Finding the middle.' },
  6: { phase: 'mapping', guidance: 'Step up slightly. Finding the middle.' },
  7: { phase: 'mapping', guidance: 'One more step. Approaching your ceiling.' },
  8: { phase: 'refinement', guidance: 'Return to where it felt right. Confirm sweet spot.' },
  9: { phase: 'refinement', guidance: 'Return to where it felt right. Confirm sweet spot.' },
  10: { phase: 'refinement', guidance: 'Final calibration dose. Trust the data.' },
}
```

**Acceptance Criteria:**
- [x] Progress: "Dose X of 10 — PHASE"
- [x] Phase colors: Baseline=bone, Mapping=amber, Refinement=violet
- [x] Guidance text per dose (PRD table)
- [x] Preliminary range after dose 5
- [x] Full calibrated range after dose 10

**Updates Made (Feb 12, 2026):**
- Created `components/discovery/DiscoveryProgress.tsx` with:
  - Visual progress bar with 10 segments
  - Phase indicators (Baseline/Mapping/Refinement) with PRD colors
  - Current dose highlight with orange ring
  - Preliminary range display (floor/sweet/ceiling) after dose 5
  - Confidence percentage badge
  - Doses completed counter
- Created `components/discovery/DoseGuidance.tsx` with:
  - Specific guidance text for each of 10 doses per PRD FLOW-006
  - Phase-specific styling (bone/amber/violet)
  - Action items checklist for each dose
  - Detailed instructions per phase
- Updated `app/(app)/discovery/page.tsx` with:
  - Anonymous auth support via `getAnonymousUserId()`
  - Integrated DiscoveryProgress and DoseGuidance components
  - Better error states with actionable buttons
  - Complete state when calibrated
  - Loading and empty states
- TypeScript compiles without errors

---

## Phase 4: Enhanced Data Display [DAY 2 - Morning]

**Goal:** Uncertainty display, confidence levels, empty states.

| Task | File | PRD Ref | Owner |
|------|------|---------|-------|
| 4.1: Create Empty State Components | `components/ui/EmptyState*.tsx` | — | A |
| 4.2: Create ConfidenceBadge | `components/compass/ConfidenceBadge.tsx` | Section 5.1 | C |
| 4.3: Update ThresholdRange | `components/compass/ThresholdRange.tsx` | Section 5.1 | C |
| 4.4: Effective Dose (if not done) | — | FLOW-003 | C |

### Task 4.2: ConfidenceBadge Spec

```typescript
// components/compass/ConfidenceBadge.tsx
// PRD verbal qualifiers from Section 5.1:
const confidenceQualifiers = {
  '<30': 'Need more data.',
  '30-49': 'Preliminary range (±0.0Xg). Keep logging.',
  '50-69': 'Working range. Refine with more doses.',
  '>=70': 'Calibrated range.',
}

const confidenceColors = {
  '<30': '#B54A4A',    // red
  '30-49': '#C9A227',  // amber
  '50-69': '#6B4E8D',  // violet
  '>=70': '#4A9B6B',   // green
}
```

**Acceptance Criteria:**
- [x] Empty states for missing data
- [x] Confidence always visible on ranges
- [x] Verbal qualifier always shown

**Updates Made (Feb 12, 2026):**
- Created `components/ui/EmptyState.tsx` with:
  - Generic `EmptyState` component with customizable icon, title, description, action
  - Pre-configured states: `EmptyStateNoBatch`, `EmptyStateNoDoses`, `EmptyStateNoCalibration`, `EmptyStateNoData`
  - `EmptyStatePlaceholder` for inline empty states
  - Support for subtle and default variants
- Created `components/compass/ConfidenceBadge.tsx` with:
  - PRD-compliant verbal qualifiers for all confidence levels (0-100%)
  - Color-coded badges: <30% red, 30-49% amber, 50-69% violet, >=70% green
  - Three size variants (sm, md, lg)
  - `ConfidenceIndicator` compact version for inline display
  - `ConfidenceBar` visual progress bar with percentage
- Updated `components/compass/ThresholdRange.tsx` to use `ConfidenceBadge`
- Created `components/ui/LoadingState.tsx` with:
  - PRD-compliant text-only loading (no spinners)
  - "Calibrating...", "Loading...", "Saving..." messages
  - Three size variants and three display modes (default, inline, card, page)
  - Updated `components/compass/CompassView.tsx` to use `LoadingState`
- TypeScript compiles without errors

---

## Phase 5: Loading States & Polish [DAY 2 - Afternoon]

**Goal:** Instrument-like animations, settings expansion.

| Task | File | PRD Ref | Owner |
|------|------|---------|-------|
| 5.1: LoadingState Component | `components/ui/LoadingState.tsx` | Section 5.4 | A |
| 5.2: Add Loading to Forms | DoseForm, BatchForm, CheckInForm | — | D |
| 5.3: Fade-in Animations | `app/globals.css` | Section 2 | A |
| 5.4: Settings Expansion | `app/(app)/settings/page.tsx` | EXP-001 | D |

### Task 5.1: LoadingState Spec

```typescript
// components/ui/LoadingState.tsx
// PRD: No spinners. Use "calibrating" text.
// Style: Pulsing opacity, monospace text

interface LoadingStateProps {
  message: 'calibrating' | 'loading' | 'saving'
}

const messages = {
  calibrating: 'Calibrating...',
  loading: 'Loading data...',
  saving: 'Saving...',
}
```

### Task 5.4: Settings Expansion

```typescript
// Add to settings page:
// - Data Export button (calls /api/export - already exists)
// - Delete account option
// - Emergency contact editing
```

**Acceptance Criteria:**
- [x] No loading spinners (text only)
- [x] All transitions 800ms ease-out
- [x] Settings has Export + Delete options

**Updates Made (Feb 12, 2026):**
- Created `lib/auth/anonymous.ts` with `getAnonymousUserId()` helper
- Updated `app/(app)/settings/page.tsx` with:
  - Anonymous auth support via `getAnonymousUserId()`
  - Data export button with file download (JSON)
  - "Reset Session" button to create new anonymous user
  - "Delete Account & Data" button with confirmation modal
  - Delete confirmation modal with data deletion warning
  - Privacy note explaining anonymous account behavior
  - All profile fields displayed (email, substance, north star, guidance, sensitivity)
  - Loading states using `LoadingState` component
- Updated `app/globals.css` with:
  - `fadeInUp` keyframe animation
  - `.animate-fade-in` utility class
  - `.animate-fade-in-up` utility class
  - All animations use 800ms ease-out timing (PRD compliant)
- Verified all transitions use `transition-settle` (800ms ease-out)
- TypeScript compiles without errors

---

## Phase 6: Testing [END OF SPRINT]

| Task | File | Owner |
|------|------|-------|
| Unit Tests: carryover | `__tests__/lib/algorithms/carryover.test.ts` | E |
| Unit Tests: threshold-range | `__tests__/lib/algorithms/threshold-range.test.ts` | E |
| Component Tests: Navigation | `__tests__/components/Navigation.test.tsx` | E |
| Component Tests: CompassViz | `__tests__/components/CompassVisualization.test.tsx` | E |
| Component Tests: Discovery | `__tests__/components/DiscoveryProgress.test.tsx` | E |

### Test Commands

```bash
# Type check
pnpm tsc --noEmit

# Unit tests
pnpm test

# E2E tests
pnpm playwright test
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Worker C + B both modify CompassView** | Merge conflict | Worker C owns all compass components; B only modifies discovery page |
| **Settle Mode must work offline** | PRD RULE 4 violation | Navigation in Settle pages should NOT require auth check; Settle pages are already separate route group |
| **10 pages need nav updates** | Missed routes | Worker D should verify all routes: /compass, /log, /history, /batch, /discovery, /settle, /settle/breathe, /settle/ground, /settle/guide, /settings |

---

## Deferred to Future Sprint

| Feature | PRD Ref | Reason |
|---------|---------|--------|
| Batch switch recalibration prompt | BAT-002 | Lower priority; can skip batch switch for now |
| Course corrections | COR-001 | Needs conditions/signals data first |
| PWA offline queue | OFF-001 | Requires service worker updates |

---

## New Files Summary

```
components/ui/Navigation.tsx
components/ui/BottomNav.module.css
components/ui/EmptyState.tsx
components/ui/LoadingState.tsx
components/compass/CompassVisualization.tsx
components/compass/EffectiveDose.tsx
components/compass/ConfidenceBadge.tsx
components/discovery/DiscoveryProgress.tsx
components/discovery/DoseGuidance.tsx
app/compass.css
__tests__/lib/algorithms/carryover.test.ts
__tests__/lib/algorithms/threshold-range.test.ts
__tests__/components/Navigation.test.tsx
__tests__/components/CompassVisualization.test.tsx
__tests__/components/DiscoveryProgress.test.tsx
```

---

## Modified Files Summary

```
app/(app)/layout.tsx          [Owner: A]
app/layout.tsx                 [Owner: A]
app/(app)/compass/page.tsx    [Owner: C]
app/(app)/log/page.tsx        [Owner: D]
app/(app)/history/page.tsx    [Owner: D]
app/(app)/batch/page.tsx      [Owner: D]
app/(app)/discovery/page.tsx  [Owner: B]
app/(app)/settle/page.tsx     [Owner: D]
app/(app)/settle/breathe/*    [Owner: D]
app/(app)/settle/ground/*     [Owner: D]
app/(app)/settle/guide/*      [Owner: D]
app/(app)/settings/page.tsx   [Owner: D]
components/compass/CompassView.tsx      [Owner: C]
components/compass/ThresholdRange.tsx   [Owner: C]
app/globals.css               [Owner: A]
```

---

## Success Criteria

- [ ] Navigation works on all 10 app routes
- [ ] Settle button accessible from every screen (per PRD RULE 4)
- [ ] Compass visualization shows 5 distinct states
- [ ] Needle animates with 800ms ease-out, no bounce
- [ ] Discovery protocol shows progress, phases, guidance
- [ ] Confidence levels visible on all ranges
- [ ] Effective dose calculator functional
- [ ] Empty states for all null data scenarios
- [ ] No loading spinners (text only)
- [ ] All transitions 800ms or less
- [ ] Tests pass for core algorithms
- [ ] TypeScript compiles without errors
