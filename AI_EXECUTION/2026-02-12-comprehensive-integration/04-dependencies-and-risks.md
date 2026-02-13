# 04 - Dependencies and Risks

## Dependency order
1. `WP02` must precede heavy feature ports (schema + policies + migrations).
2. `WP01` should run early so product is testable immediately.
3. `WP03` before `WP04` (insights depend on richer dose metadata).
4. `WP05` depends on finalized mutation endpoints.
5. `WP09` depends on all prior packets.

## Top risks and mitigations
- RLS mismatch with anonymous strategy
  - Mitigation: use Supabase anonymous auth sessions so `auth.uid()` remains authoritative.
- Schema drift between environments
  - Mitigation: strict migration numbering, idempotent SQL, startup schema check route.
- UI port regressions due framework differences (Vite -> Next)
  - Mitigation: port logic and small primitives first, avoid direct wholesale copy.
- Offline conflict complexity
  - Mitigation: action log with deterministic replay and idempotent API writes.
- Over-scoping from non-core modules
  - Mitigation: defer education/challenges/planner until post-MVP.

## Out of scope for this release
- Full Firebase migration
- Education hub/challenges/planner as first-class features
- Astrology/timekeeping modules
