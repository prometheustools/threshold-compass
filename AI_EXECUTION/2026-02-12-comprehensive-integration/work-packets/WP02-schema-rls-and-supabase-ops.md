# WP02 - Schema, RLS, and Supabase Ops

## Goal
Eliminate schema/RLS instability and prepare expanded data model.

## Scope
- Idempotent migrations from current schema.
- Maintain compatibility with current reads/writes.
- Provide operational verification script + docs.

## Target files
- `supabase/schema.sql`
- `supabase/migrations/*.sql` (new)
- `scripts/ensure-supabase-schema.sh`
- `lib/supabase/errors.ts`

## Tasks
1. Add migration files for:
   - `substance_profiles`
   - `reflections`
   - `patterns`
   - additional `dose_logs` protocol fields
2. Keep policy creation idempotent and safe for repeated runs.
3. Extend `ensure-supabase-schema.sh` to check expanded table set.
4. Add a schema verification SQL snippet to docs and app error messages.

## Acceptance criteria
- Running migrations twice yields no destructive errors.
- Existing data remains accessible.
- RLS still constrains rows by authenticated identity.
