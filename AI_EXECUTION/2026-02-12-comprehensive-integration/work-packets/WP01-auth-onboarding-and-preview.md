# WP01 - Auth, Onboarding, Skip, Preview

## Goal
Make onboarding resilient and optional without blocking app exploration.

## Scope
- Harden anonymous auth/session flow.
- Add explicit "Check out app" route behavior.
- Ensure skip path does not leave app in broken state.

## Target files
- `app/(auth)/autologin/page.tsx`
- `components/forms/OnboardingSteps.tsx`
- `app/(app)/compass/page.tsx`
- `lib/auth/anonymous.ts`
- `middleware.ts`

## Tasks
1. Replace brittle localStorage-only identity assumptions with Supabase session identity as source of truth.
2. In onboarding, implement explicit skip action that either:
   - sets preview mode and routes to `/compass?preview=1`, or
   - creates minimum viable `users` row then routes to `/compass`.
3. In `/compass`, if profile missing but session valid, show recovery CTA instead of hard fail.
4. Keep existing anonymous-disabled error messaging with clear settings path.

## Acceptance criteria
- Fresh user can click "Check out app" and land in usable app state.
- No redirect loops between `/autologin`, `/onboarding`, and `/compass`.
- Works with schema present and with schema-missing fallback UX.
