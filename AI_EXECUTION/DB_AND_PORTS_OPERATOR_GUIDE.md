# DB and Ports Operator Guide

Generated: 2026-02-13

## 1. Database status checks (Supabase SQL Editor)

Run this to confirm all required tables exist:

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

Run this to confirm onboarding-critical columns exist:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'users' and column_name in ('id', 'email', 'onboarding_complete')) or
    (table_name = 'batches' and column_name in ('id', 'user_id', 'is_active')) or
    (table_name = 'dose_logs' and column_name in ('phase', 'dose_number', 'threshold_feel', 'day_classification'))
  )
order by table_name, column_name;
```

Run this to confirm RLS policies are present:

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'users',
    'batches',
    'dose_logs',
    'check_ins',
    'threshold_ranges',
    'substance_profiles',
    'reflections',
    'patterns'
  )
order by tablename, policyname;
```

After any schema change, reload PostgREST cache:

```sql
notify pgrst, 'reload schema';
```

## 2. Auth settings (Supabase dashboard)

- Go to `Authentication -> Providers -> Anonymous`.
- Enable anonymous sign-ins.
- Keep RLS enabled on app tables.

Why: app autologin uses `supabase.auth.signInAnonymously()` and policies rely on `auth.uid()`.

## 3. App runtime flow checks

Use this order in a clean browser session:

1. Open `http://localhost:3004/autologin`
2. Expect auto-create session and route to `/onboarding` (new user) or `/compass` (existing user)
3. On onboarding step 4, verify:
   - `Skip for now` works
   - `Check out app` preview route works (`/compass?preview=1`)
4. On `/compass`, verify no `public.users` schema-cache errors
5. Log a dose and verify `/history` shows entry
6. Open `/insights` and verify baseline charts/cards load

## 4. Port and ownership map (no collisions)

- `3004` -> Main app, primary integration lane (Codex)
- `3005` -> Parallel app lane (Opencode for UI copy/flow experiments)
- `3101` -> Optional static sidequest server (`labs/signal-constellation-lab`)

Commands:

```bash
# Codex lane
cd /home/taylor/GitHub/threshold-compass
pnpm dev --port 3004

# Opencode lane (same repo, separate terminal)
cd /home/taylor/GitHub/threshold-compass
pnpm dev --port 3005

# Optional sidequest static server
cd /home/taylor/GitHub/threshold-compass/labs/signal-constellation-lab
python3 -m http.server 3101
```

## 5. File ownership boundaries for parallel work

Codex lane:
- `app/**`
- `components/**`
- `lib/**`
- `middleware.ts`
- `supabase/**`

Opencode lane (non-interfering):
- `AI_EXECUTION/opencode-sidequests/**`
- `labs/**`
- docs under `AI_EXECUTION/**` that are explicitly sidequest-related

## 6. If onboarding fails at final step

1. Re-run `notify pgrst, 'reload schema';`
2. Re-check `users` table and `onboarding_complete` column
3. In browser devtools:
   - `localStorage.removeItem('threshold_compass_session')`
   - `localStorage.removeItem('threshold_compass_anon_user')`
4. Refresh `/autologin`

