#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Online Sync: threshold-compass =="
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
echo

echo "-- 1) Push main + phase4 branch --"
git push origin main
git push origin phase4/next15-react19-prep
echo

echo "-- 2) Production dependency audit --"
pnpm audit --prod
echo

echo "-- 3) Show outdated dependencies --"
pnpm outdated || true
echo

echo "-- 4) Re-run readiness + CI checks --"
pnpm run upgrade:readiness
pnpm lint
pnpm build
echo

echo "Online sync completed."
