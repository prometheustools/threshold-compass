# Live Schema Migration Runbook

Date: 2026-02-14

## Purpose

Safely verify and apply `supabase/schema.sql` to the live Supabase Postgres database.

## Required Environment Variables

Provide one connection mode:

1. `SUPABASE_DB_URL`

or

2. `SUPABASE_DB_PASSWORD` plus either:
   - `SUPABASE_DB_HOST`, or
   - `NEXT_PUBLIC_SUPABASE_URL` (host auto-derived as `db.<project-ref>.supabase.co`)

Optional DB vars:
- `SUPABASE_DB_PORT` (default `5432`)
- `SUPABASE_DB_USER` (default `postgres`)
- `SUPABASE_DB_NAME` (default `postgres`)
- `SUPABASE_DB_SSLMODE` (default `require`)

## Preflight

1. Ensure `psql` is installed.
2. Ensure `.env.local` has production-safe values for the selected mode.
3. Run app checks:

```bash
pnpm lint
pnpm build
```

## Step 1: Check-Only (No Writes)

```bash
pnpm run schema:check
```

Expected outcomes:
- Exit `0`: schema already present.
- Exit `2`: missing tables detected (safe to continue to Step 2).
- Exit `1`: misconfiguration/error (fix env/connection first).

## Step 2: Apply Schema

```bash
pnpm run schema:ensure
```

This applies `supabase/schema.sql`, then sends `NOTIFY pgrst, 'reload schema'`.

## Step 3: Verify

1. Re-run:

```bash
pnpm run schema:check
```

2. Validate app endpoints:
- `/api/health`
- `/compass`
- `/log`

## Notes

- `schema:ensure` is idempotent for existing tables because it only applies when expected tables are missing.
- Use `bash ./scripts/ensure-supabase-schema.sh --schema <path>` to target another schema file.
