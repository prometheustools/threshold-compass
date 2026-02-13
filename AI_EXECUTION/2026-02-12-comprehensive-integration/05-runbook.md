# 05 - Runbook

## Prereqs
- Node/pnpm installed
- Supabase project URL and anon key in `.env.local`
- Access to Supabase SQL Editor

## Local dev
```bash
cd /home/taylor/GitHub/threshold-compass
pnpm install
pnpm dev --port 3004
```

## Schema setup notes
If `pnpm schema:ensure` fails with network/IPv6 reachability to `db.<project-ref>.supabase.co:5432`, run schema SQL in Supabase SQL Editor manually.

Required file:
- `/home/taylor/GitHub/threshold-compass/supabase/schema.sql`

Verification SQL:
```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'batches',
    'dose_logs',
    'check_ins',
    'threshold_ranges',
    'substance_profiles',
    'reflections',
    'patterns'
  )
order by table_name;
```

Reload PostgREST schema cache after SQL changes:
```sql
notify pgrst, 'reload schema';
```

## App smoke checks
1. Open `/autologin` and verify session created.
2. Open `/onboarding`, complete or skip, ensure `/compass` loads.
3. Create batch, log dose, verify history entry.
4. Run export endpoint and verify payload shape.

## Port map
- `3004`: primary app (Codex integration branch)
- `3005`: secondary app instance (Opencode safe test instance)
- `3101`: optional static lab server (`labs/signal-constellation-lab`)

## Pre-merge checks per packet
```bash
pnpm lint
pnpm build
```

## Final release checklist
- [ ] All P0 packets complete
- [ ] DB migrations applied and validated
- [ ] onboarding skip path verified on clean browser storage
- [ ] no schema cache missing table errors in final step
- [ ] manual cross-device responsive pass
