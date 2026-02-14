#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Release Check =="
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "Commit: $(git rev-parse --short HEAD)"
echo

echo "-- Lint --"
pnpm lint
echo

echo "-- Build --"
pnpm build
echo

echo "-- Upgrade Readiness --"
pnpm run upgrade:readiness
echo

echo "-- Production Audit --"
audit_with_retry() {
  local attempts=3
  local attempt=1
  local last_output=""

  while [[ "$attempt" -le "$attempts" ]]; do
    set +e
    last_output="$(pnpm audit --prod 2>&1)"
    local exit_code=$?
    set -e

    if [[ "$exit_code" -eq 0 ]]; then
      echo "$last_output"
      return 0
    fi

    echo "Audit attempt ${attempt}/${attempts} failed."
    echo "$last_output"

    if [[ "$attempt" -lt "$attempts" ]]; then
      echo "Retrying audit in 5s..."
      sleep 5
    fi

    attempt=$((attempt + 1))
  done

  if [[ "${ALLOW_AUDIT_NETWORK_FAILURE:-0}" == "1" ]] && grep -q "ENOTFOUND" <<<"$last_output"; then
    echo "Warning: audit skipped due to network DNS resolution failure (ALLOW_AUDIT_NETWORK_FAILURE=1)."
    return 0
  fi

  return 1
}

audit_with_retry
echo

if [[ -n "${SUPABASE_DB_URL:-}" || -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "-- Schema Check --"
  pnpm run schema:check
  echo
else
  echo "-- Schema Check --"
  echo "Skipped: SUPABASE_DB_URL / SUPABASE_DB_PASSWORD not set in environment."
  echo
fi

echo "Release check completed."
