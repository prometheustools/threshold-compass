#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_PATH="${1:-$ROOT_DIR/supabase/schema.sql}"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  # Load project env without overriding explicitly provided shell vars.
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ROOT_DIR/.env.local" | cut -d= -f1) >/dev/null 2>&1 || true
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env.local"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but was not found in PATH."
  exit 1
fi

if [[ ! -f "$SCHEMA_PATH" ]]; then
  echo "Schema file not found: $SCHEMA_PATH"
  exit 1
fi

CONNECTION_MODE="env"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  CONNECTION_MODE="url"
elif [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  SUPABASE_HOST="${SUPABASE_DB_HOST:-}"

  if [[ -z "$SUPABASE_HOST" ]]; then
    if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
      echo "Set SUPABASE_DB_URL or provide SUPABASE_DB_PASSWORD with NEXT_PUBLIC_SUPABASE_URL."
      exit 1
    fi

    PROJECT_REF="$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -nE 's#https?://([a-z0-9-]+)\.supabase\.co/?#\1#p')"
    if [[ -z "$PROJECT_REF" ]]; then
      echo "Unable to parse project ref from NEXT_PUBLIC_SUPABASE_URL."
      exit 1
    fi

    SUPABASE_HOST="db.${PROJECT_REF}.supabase.co"
  fi

  export PGHOST="$SUPABASE_HOST"
  export PGPORT="${SUPABASE_DB_PORT:-5432}"
  export PGUSER="${SUPABASE_DB_USER:-postgres}"
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  export PGDATABASE="${SUPABASE_DB_NAME:-postgres}"
  export PGSSLMODE="${SUPABASE_DB_SSLMODE:-require}"
else
  echo "Missing DB credentials."
  echo "Provide either:"
  echo "1) SUPABASE_DB_URL"
  echo "2) SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL, optional SUPABASE_DB_HOST)"
  exit 1
fi

run_psql() {
  if [[ "$CONNECTION_MODE" == "url" ]]; then
    psql "$SUPABASE_DB_URL" "$@"
  else
    psql "$@"
  fi
}

MISSING_TABLES="$(run_psql -Atc "
  SELECT string_agg(expected.name, ',')
  FROM (VALUES
    ('users'),
    ('batches'),
    ('dose_logs'),
    ('check_ins'),
    ('threshold_ranges'),
    ('substance_profiles'),
    ('reflections'),
    ('patterns')
  ) AS expected(name)
  WHERE to_regclass('public.' || expected.name) IS NULL;
")"

if [[ -z "$MISSING_TABLES" ]]; then
  echo "Supabase schema already present."
  exit 0
fi

echo "Missing tables detected: $MISSING_TABLES"
echo "Applying schema: $SCHEMA_PATH"

run_psql -v ON_ERROR_STOP=1 -f "$SCHEMA_PATH"

# Ask PostgREST to refresh its schema cache.
run_psql -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true

MISSING_AFTER="$(run_psql -Atc "
  SELECT string_agg(expected.name, ',')
  FROM (VALUES
    ('users'),
    ('batches'),
    ('dose_logs'),
    ('check_ins'),
    ('threshold_ranges'),
    ('substance_profiles'),
    ('reflections'),
    ('patterns')
  ) AS expected(name)
  WHERE to_regclass('public.' || expected.name) IS NULL;
")"

if [[ -n "$MISSING_AFTER" ]]; then
  echo "Schema apply finished, but some tables are still missing: $MISSING_AFTER"
  exit 1
fi

echo "Supabase schema is ready."
