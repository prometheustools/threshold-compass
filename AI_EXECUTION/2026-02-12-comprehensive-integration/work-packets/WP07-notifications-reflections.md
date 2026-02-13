# WP07 - Notifications and Reflections

## Goal
Close the integration loop after dosing.

## Source references
- `threshold-tracker/src/components/ui/ReflectionReminderModal.tsx`
- `threshold-compass-v2/app/(app)/reflect/page.tsx`
- `threshold-compass-v2/app/api/push/subscribe/route.ts`

## Target files
- `app/(app)/reflect/page.tsx` (new)
- `app/api/reflections/route.ts` (new)
- `app/api/push/subscribe/route.ts` (new)
- `components/ui/ReflectionReminderModal.tsx` (new)

## Tasks
1. Add reflection capture for EOD/24h/72h.
2. Add reminder scheduling hooks and subscription endpoint.
3. Store reflection records with dose linkage.

## Acceptance criteria
- Reflection prompts trigger and save correctly.
- Notification preference toggles work end-to-end.
