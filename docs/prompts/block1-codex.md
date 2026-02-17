You are working in /home/taylor/GitHub/threshold-compass (Next.js 16, TypeScript strict, Supabase).

Read these files first for patterns and types:
- types/index.ts (ThresholdRange type definition)
- lib/algorithms/carryover.ts (algorithm pattern to follow)
- supabase/schema.sql (threshold_ranges table schema)
- app/api/doses/route.ts (API route pattern)
- lib/supabase/server.ts (how to create Supabase server client)

Create THREE files:

1. `lib/algorithms/threshold-range.ts` — Pure function that computes a threshold range from dose logs.
   - Input: array of dose log objects with fields: amount (number), threshold_feel ('nothing'|'under'|'sweetspot'|'over'|null), signal_score (number|null, 0-10), texture_score (number|null, 0-10), interference_score (number|null, 0-10)
   - Output: object with fields: floor_dose (number|null), sweet_spot (number|null), ceiling_dose (number|null), confidence (number, 0-100), qualifier (string), doses_used (number)
   - Algorithm:
     a. Filter to only doses where threshold_feel is not null
     b. Sort by amount ascending
     c. floor_dose = max amount where threshold_feel is 'nothing' or 'under', and there exists a higher amount with a different feel
     d. ceiling_dose = min amount where threshold_feel is 'over'
     e. sweet_spot = weighted average of amounts where threshold_feel is 'sweetspot', weighted by ((signal_score ?? 5) - (interference_score ?? 5) + 10) to keep weights positive
     f. confidence calculation: start at 50, add 5 per dose used (max +25), add 15 if feel ordering is monotonic (nothing < under < sweetspot < over by amount), add 10 if STI variance is low across sweetspot doses, cap at 100
     g. qualifier: "Insufficient data" if <3 doses with feel, "Low confidence — keep logging" if confidence < 40, "Emerging pattern" if confidence 40-65, "Reliable range" if confidence 65-85, "High confidence" if >85
   - Handle edge cases: if no 'sweetspot' doses, sweet_spot is null; if no 'over' doses, ceiling_dose is null; if all same feel, set appropriate nulls and low confidence
   - Export the function as `calculateThresholdRange`
   - Use TypeScript strict mode, no `any`. Import types from `@/types` where needed.

2. `app/api/threshold-range/route.ts` — POST endpoint:
   - Import createClient from '@/lib/supabase/server'
   - Import NextResponse, NextRequest from 'next/server'
   - Import calculateThresholdRange from '@/lib/algorithms/threshold-range'
   - Auth: get user via supabase.auth.getUser(), return 401 if not authenticated
   - Parse body for batch_id (string, required)
   - Verify batch belongs to user: query batches table
   - Fetch dose_logs for that batch_id where post_dose_completed = true, ordered by amount ascending
   - Call calculateThresholdRange with the dose logs
   - Upsert into threshold_ranges table with: user_id, batch_id, floor_dose, sweet_spot, ceiling_dose, confidence, qualifier, doses_used, calculated_at = new Date().toISOString()
   - Update batches: set calibration_status = 'calibrated' where id = batch_id AND user_id = user.id
   - Return the computed range as JSON with status 200
   - Handle errors with proper status codes

3. `__tests__/threshold-range.test.ts` — Unit tests using whatever test runner is configured (check package.json), or plain assertions if none:
   - Test: 10 doses with ascending feel pattern (3 nothing, 2 under, 3 sweetspot, 2 over) — verify floor < sweet_spot < ceiling, confidence >= 65
   - Test: all doses have feel 'sweetspot' — sweet_spot is set, floor and ceiling are null, confidence is low
   - Test: only 2 doses with feel — very low confidence, qualifier mentions insufficient data
   - Test: non-monotonic pattern (higher dose = 'nothing', lower dose = 'over') — confidence reduced
   - Test: missing STI scores (all null) — algorithm still computes with default weights
   - Test: empty array input — returns nulls with 0 confidence

IMPORTANT: Do NOT modify any existing files. Only create these three new files. TypeScript strict mode, no `any` type.
