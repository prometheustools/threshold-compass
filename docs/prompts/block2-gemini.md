You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Tailwind CSS, Supabase).

DESIGN SYSTEM (MUST FOLLOW EXACTLY):
- Background: #0A0A0A (base), #121212 (surface), #1E1E1E (elevated), #2A2A2A (raised)
- Text: #F5F2E9 (ivory, primary), #C4C0B6 (bone, secondary), #8A8A8A (ash, disabled)
- Accent: #E07A3E (orange, CTAs), #8B4D2C (ember, borders at rest)
- Status: #4A9B6B (clear/green), #C9A227 (mild/amber), #D4682A (moderate/orange), #B54A4A (elevated/red)
- Fonts: font-mono for data/headers (JetBrains Mono), font-sans for body (Inter)
- Animations: 800ms ease-out ONLY via transition-settle class. NO bounce. NO spring. NO confetti.
- Touch targets: minimum 44px (min-h-[44px] min-w-[44px])
- NEVER use pure white (#FFFFFF). Use #F5F2E9 (ivory) instead.
- Border radius: rounded-instrument (2px), rounded-card (8px), rounded-button (6px)

Read these files first to understand patterns:
- types/index.ts (ThresholdRange, Batch, DoseLog types)
- components/forms/DoseForm.tsx (understand the dose submission flow — especially handleSubmit around line 376-501)
- components/compass/CompassVisualization.tsx (understand compass states and rendering)
- components/compass/ThresholdRange.tsx (existing range display component)
- app/(app)/batch/page.tsx (batch management page)
- app/(app)/discovery/page.tsx (existing discovery page for context)
- components/ui/Button.tsx and components/ui/Card.tsx (UI component patterns)

Do these 4 tasks:

TASK 1: Create `app/(app)/discovery/complete/page.tsx`
- 'use client' component
- Page shown after completing dose 10 of discovery protocol
- Read threshold range from URL search params: ?floor=X&sweet_spot=Y&ceiling=Z&confidence=N&qualifier=Q
- Layout:
  - Top: font-mono uppercase "RANGE FOUND" in orange (#E07A3E)
  - Staggered reveal of three zones with 800ms delay between each:
    1. Floor dose (green #4A9B6B background tint): "Floor: Xmg — below this, you feel nothing"
    2. Sweet spot (amber #C9A227 background tint): "Sweet Spot: Ymg — your threshold zone"
    3. Ceiling (red #B54A4A background tint): "Ceiling: Zmg — above this, interference rises"
  - Each zone fades in with opacity 0 → 1 transition, 800ms ease-out, staggered
  - Below zones: confidence percentage and qualifier text in bone color
  - CTA Button: "Continue to Compass" → router.push('/compass')
- Use Card component from @/components/ui/Card
- Use Button component from @/components/ui/Button
- Handle missing params gracefully (show "Calculating..." and redirect to compass after 3s)

TASK 2: Modify `components/forms/DoseForm.tsx`
- In the handleSubmit function, after a successful dose insert (around line 491-496):
- Check if this was dose 10 for a calibrating batch:
  ```
  const wasLastDiscoveryDose = selectedBatch?.calibration_status === 'calibrating' && discoveryDoseNumber === 10
  ```
- If wasLastDiscoveryDose:
  - Try to POST to '/api/threshold-range' with body { batch_id: batchId }
  - If response.ok, parse the range from response JSON
  - Redirect to `/discovery/complete?floor=${range.floor_dose}&sweet_spot=${range.sweet_spot}&ceiling=${range.ceiling_dose}&confidence=${range.confidence}&qualifier=${encodeURIComponent(range.qualifier)}`
  - If the API call fails, still redirect to /compass (graceful degradation)
- The existing redirect logic for non-discovery doses stays unchanged
- Do NOT change any other part of handleSubmit

TASK 3: Modify `components/compass/CompassVisualization.tsx`
- Add visual handling for when the batch is calibrated (calibration_status === 'calibrated')
- Accept an optional thresholdRange prop: { floor_dose: number | null, sweet_spot: number | null, ceiling_dose: number | null, confidence: number }
- When thresholdRange is provided and has data:
  - Replace the "X/10 CALIBRATING" text with: "RANGE: floor-ceiling unit" (e.g., "RANGE: 80-150mg")
  - Show sweet spot value below in orange
  - Show confidence as small text
- Keep all existing compass states (dormant, calibrating, elevated_carryover, etc.) working
- Do NOT break any existing functionality

TASK 4: Modify `app/(app)/batch/page.tsx`
- Add a "Recalibrate" button for batches where calibration_status === 'calibrated'
- The button should:
  - Show a confirm: "This will reset your calibration. You'll need to log 10 new doses. Continue?"
  - On confirm: PATCH/UPDATE the batch in Supabase setting calibration_status = 'calibrating'
  - Refresh the batch list after update
- Style the button with border-ember/30, text-bone, smaller than primary actions
- Keep all existing batch functionality intact

IMPORTANT: Follow the design system exactly. No #FFFFFF. No bounce animations. Use existing UI components (Button, Card) where available.
