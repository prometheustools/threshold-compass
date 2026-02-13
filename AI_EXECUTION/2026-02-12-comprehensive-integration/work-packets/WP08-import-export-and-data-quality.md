# WP08 - Import, Export, Data Quality

## Goal
Make user data portable and resilient across app versions.

## Source references
- `threshold-compass/app/api/export/route.ts`
- `threshold-tracker/src/lib/import.ts`

## Target files
- `app/api/export/route.ts`
- `app/api/import/route.ts` (new)
- `lib/data-migrations/*` (new)

## Tasks
1. Add versioned export schema metadata.
2. Add import endpoint with strict validation and merge modes.
3. Add migration layer for legacy payloads.
4. Add partial-failure reporting for imports.

## Acceptance criteria
- Export payload includes schema version and timestamp.
- Import can restore data from at least one prior payload version.
