# Phase 4 Framework Upgrade Prep

Date: 2026-02-14  
Current branch baseline: `main`

## Scope

Prepare for:
1. `next` 14 -> 15 -> 16
2. `react` 18 -> 19
3. `react-dom` 18 -> 19

This repo currently uses:
- `next`: `16.1.6`
- `react`: `^19.2.0`
- `react-dom`: `^19.2.0`

## Status

- `next` upgraded from `14.2.18` to `15.5.10` and then `16.1.6`
- `react` and `react-dom` upgraded from `18.3.1` to `19.2.0`
- `pnpm audit --prod` is clean (0 vulnerabilities)
- Next 16 lint stack migrated to ESLint 9 + flat config (`eslint.config.mjs`)
- `middleware.ts` moved to `proxy.ts` (Next 16 convention)

## Readiness Command

Run this first on every upgrade attempt:

```bash
pnpm run upgrade:readiness
```

It checks for high-risk legacy patterns (for example `next/router`, legacy pages-router data methods, and `ReactDOM.render`).

## When Network Is Available

Run:

```bash
pnpm run sync:online
```

This will:
1. Push `main` and `phase4/next15-react19-prep`
2. Run production audit
3. Show outdated dependencies
4. Re-run readiness + lint + build

## Recommended Sequence

1. Lock baseline:
```bash
pnpm lint
pnpm build
pnpm run upgrade:readiness
```

2. Upgrade Next to 15 and run official Next codemod(s).
3. Fix compile/type/runtime issues and re-run baseline checks.
4. Upgrade React + React DOM to 19 and run official React codemod(s).
5. Upgrade Next 15 -> 16 and resolve framework convention changes (`proxy.ts`, lint config).
6. Re-run baseline checks and smoke-test all critical routes:
   `/compass`, `/log`, `/log/complete`, `/insights`, `/settle`, `/drift`, `/stash`, `/workshop`.

## Operational Notes

- Network access is required for package upgrades and codemods.
- Keep migrations and framework upgrades in separate commits.
- Do not cut over if `pnpm run upgrade:readiness` reports critical blockers.
- CI now enforces `lint`, `build`, `upgrade:readiness`, and production `audit` on push/PR.
