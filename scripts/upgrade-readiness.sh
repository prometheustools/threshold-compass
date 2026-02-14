#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
node_version="$(node -v 2>/dev/null || echo "not-installed")"
pnpm_version="$(pnpm -v 2>/dev/null || echo "not-installed")"
next_version="$(node -p "require('./package.json').dependencies.next || 'missing'" 2>/dev/null || echo "unknown")"
react_version="$(node -p "require('./package.json').dependencies.react || 'missing'" 2>/dev/null || echo "unknown")"
react_dom_version="$(node -p "require('./package.json').dependencies['react-dom'] || 'missing'" 2>/dev/null || echo "unknown")"

printf "Phase 4 Framework Upgrade Readiness\n"
printf "Timestamp (UTC): %s\n" "$timestamp"
printf "Branch: %s\n" "$(git rev-parse --abbrev-ref HEAD)"
printf "Node: %s\n" "$node_version"
printf "pnpm: %s\n" "$pnpm_version"
printf "next: %s\n" "$next_version"
printf "react: %s\n" "$react_version"
printf "react-dom: %s\n" "$react_dom_version"
printf "\n"

critical_hits=0

run_check() {
  local label="$1"
  local pattern="$2"
  local severity="${3:-warn}"
  local matches
  local count

  matches="$(
    rg -n --no-heading "$pattern" \
      app components lib store types proxy.ts middleware.ts next.config.js \
      2>/dev/null || true
  )"
  if [[ -n "$matches" ]]; then
    count="$(printf "%s\n" "$matches" | sed '/^$/d' | wc -l | tr -d ' ')"
  else
    count=0
  fi

  printf "[%s] %s: %s match(es)\n" "$severity" "$label" "$count"

  if [[ "$count" -gt 0 ]]; then
    printf "%s\n" "$matches" | head -n 5
    printf "\n"
  fi

  if [[ "$severity" == "critical" && "$count" -gt 0 ]]; then
    critical_hits=$((critical_hits + count))
  fi
}

run_check "Legacy pages-router import" "from ['\"]next/router['\"]" "critical"
run_check "Legacy data methods" "getServerSideProps|getStaticProps|getInitialProps" "critical"
run_check "ReactDOM legacy render API" "ReactDOM\\.(render|hydrate)\\(" "critical"
run_check "Next runtime config usage" "publicRuntimeConfig|serverRuntimeConfig" "warn"
run_check "Legacy next/head usage in app router code" "from ['\"]next/head['\"]" "warn"
run_check "Legacy next/image props" "layout=|objectFit=|objectPosition=" "warn"
run_check "Explicit unstable API usage" "\\bunstable_[a-zA-Z0-9_]+" "warn"

if [[ "$critical_hits" -gt 0 ]]; then
  printf "Result: FAIL (%s critical blocker matches)\n" "$critical_hits"
  exit 1
fi

printf "Result: PASS (no critical blockers detected)\n"
