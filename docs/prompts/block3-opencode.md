You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Tailwind CSS, Supabase, Zustand).

DESIGN SYSTEM (MUST FOLLOW EXACTLY):
- Background: #0A0A0A (base), #121212 (surface), #1E1E1E (elevated), #2A2A2A (raised)
- Text: #F5F2E9 (ivory, primary), #C4C0B6 (bone, secondary), #8A8A8A (ash, disabled)
- Accent: #E07A3E (orange, CTAs), #8B4D2C (ember, borders)
- Status: #4A9B6B (green), #C9A227 (amber), #D4682A (orange), #B54A4A (red)
- Fonts: font-mono for data/headers, font-sans for body
- Animations: 800ms ease-out ONLY (transition-settle class). NO bounce/spring.
- Touch targets: min 44px
- NEVER use #FFFFFF. Use text-ivory (#F5F2E9) instead.
- Border radius: rounded-instrument (2px), rounded-card (8px), rounded-button (6px)

Read these files first:
- app/(app)/layout.tsx (current navigation)
- app/(app)/compass/page.tsx (compass page)
- app/(app)/history/page.tsx (current history)
- store/index.ts (Zustand store)
- app/api/doses/route.ts (dose API — supports GET with limit/offset params)
- types/index.ts (DoseLog, Batch types)
- components/ui/Button.tsx (button component pattern)
- components/ui/Card.tsx (card component pattern)
- lib/supabase/client.ts (client-side supabase)
- lib/auth/anonymous.ts (resolveCurrentUserId)

Do these 4 tasks:

TASK 1: Simplify navigation in `app/(app)/layout.tsx`
- Change the bottom nav to exactly 4 items:
  1. Compass — icon: Compass from lucide-react — route: /compass
  2. Log — icon: PenLine from lucide-react — route: /log
  3. History — icon: Clock from lucide-react — route: /history
  4. Settings — icon: Settings from lucide-react — route: /settings
- Remove any "More" menu, overflow menu, or additional nav items
- Keep the Settle floating action button (FAB) if one exists
- Each nav item: icon + label, font-mono text-[10px] uppercase, min-h-[44px]
- Active state: text-orange, inactive: text-ash (#8A8A8A)
- Nav bar background: bg-base (#0A0A0A) with top border border-ember/20

TASK 2: Add quick log to `app/(app)/compass/page.tsx`
- Add a "Quick Log" section below the compass visualization
- Fetch the user's most recent dose for their active batch using supabase client
- If a previous dose exists, show a button: "Log Same ({amount}{unit})" in orange accent
- On tap:
  - POST to '/api/doses' with: { amount, unit, batch_id, preparation: null }
  - Show a simple inline confirmation: "Dose logged — X/10" that auto-dismisses after 3 seconds
  - Include an "Undo" text button during the confirmation (calls DELETE /api/doses?id=X or just visually dismisses)
  - After confirmation dismisses, refresh the page data
- If no previous dose exists, show "Log First Dose" button linking to /log
- Keep this as inline JSX in the compass page, not a separate component file
- Use existing Button component for the action buttons

TASK 3: Upgrade `app/(app)/history/page.tsx`
- Replace current content with a reverse-chronological dose log list
- 'use client' component
- On mount: fetch doses from '/api/doses' with the user's auth (use supabase client + resolveCurrentUserId, then fetch from dose_logs table directly)
- Group doses by date (use dosed_at field, group by calendar day)
- Each date group header: font-mono text-xs uppercase text-bone, showing date like "FEB 14, 2026"
- Each dose entry (inside Card):
  - Left color border based on day_classification: green (#4A9B6B), yellow (#C9A227), red (#B54A4A), gray (#8A8A8A for unclassified/null)
  - Main row: time (HH:MM format), amount + unit in font-mono, batch name in text-bone
  - If threshold_feel exists, show it as text badge
  - Tap/click to expand showing: sleep_quality, energy_level, stress_level, notes, signal/texture/interference scores
  - Use useState for expandedId tracking
- At top of page: show active batch name and "X doses logged" count
- Add batch filter: dropdown to filter by batch (fetch batches list)
- Empty state if no doses: "No doses logged yet. Start your first log." with link to /log

TASK 4: Add getLastDose helper to `store/index.ts`
- Read the current store structure first
- Add a `lastDose` field to the store state (type: DoseLog | null)
- Add a `fetchLastDose` action that:
  - Uses supabase client to query dose_logs ordered by dosed_at DESC limit 1 for the current user
  - Sets lastDose in the store
- This will be used by the compass quick log feature

CRITICAL: Do NOT modify these files (another agent owns them):
- components/forms/DoseForm.tsx
- components/compass/CompassVisualization.tsx
- app/(app)/batch/page.tsx
- Any files in lib/algorithms/
- Any files in app/api/threshold-range/
