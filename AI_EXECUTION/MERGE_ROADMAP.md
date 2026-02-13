# Merge Roadmap: threshold-compass (v1) ← threshold-compass-v2

> **Canonical app:** threshold-compass (Next 14 / React 18, live Supabase keys)
> **Parts catalog:** threshold-compass-v2 (Next 16 / React 19, placeholder keys)
> **Generated:** 2026-02-12

---

## Route-by-Route Comparison

| Route | v1 (canonical) | v2 | Winner | Priority |
|-------|---------------|-----|--------|----------|
| **batch** | Full CRUD, potency, supplements, archive | Simpler list, calibration labels | v1 | LOW |
| **calculator** | Dose calc: weight, experience, sensitivity, tolerance | Missing | v1 unique | MEDIUM |
| **compass** | Carryover calc, preview mode, threshold range viz | Server component, CompassClient wrapper | v2 arch | MEDIUM |
| **discovery** | Guided 3-phase protocol (Baseline/Mapping/Refinement) | Missing | v1 unique | HIGH |
| **drift** | Missing | 4-7-8 breathing + 5-4-3-2-1 grounding, crisis support | v2 unique | HIGH |
| **history** | Expandable entries, zone labels, check-in display | Filterable (all/complete/incomplete/sweetspot), delete, threshold feel icons | v2 | MEDIUM |
| **insights** | Pattern detection UI, zone distribution, manual trigger | Server component, ThresholdTerrainMap, confidence scoring | v2 arch | HIGH |
| **log** | Simple DoseForm wrapper | Full form: batch, food state, intention, threshold feel, context tags, med contraindication | v2 | HIGH |
| **log/complete** | Missing | STI sliders, BodyMap, threshold feel, context tags, day classification, milestones | v2 unique | HIGH |
| **reflect** | Reflection form: timing, still_with_me, would_change, gratitude | Same prompts, linked dose, cleaner layout | Equivalent | LOW |
| **settings** | Profile, delete account, export/import | North star, guidance level, notifications, push, sensitivity | v2 | HIGH |
| **settle** | Menu → breathe/ground/guide subroutes, emergency contact | SettleClient component (consolidated) | v1 structure | MEDIUM |
| **settle/breathe** | Breathing patterns from JSON, BreathingGuide | Possibly in SettleClient | v1 explicit | MEDIUM |
| **settle/ground** | GroundingExercise component | Possibly in SettleClient | v1 explicit | MEDIUM |
| **settle/guide** | "What is happening" cards from JSON | Possibly in SettleClient | v1 explicit | MEDIUM |
| **stash** | Missing | Calendar + batch tabs, monthly grid, day classification colors, batch switching | v2 unique | HIGH |
| **workshop** | Missing | Drills (breath/grounding/attention) + mental models from JSON | v2 unique | MEDIUM |
| **offline** | Missing | Offline detection, retry, reassurance | v2 unique | LOW |
| **autologin** | Anonymous auth, schema error handling | Missing | v1 unique | KEEP |
| **login** | Auto-redirect to autologin, OTP magic link | Email/password, direct auth | Different | LOW |
| **signup** | Email OTP magic link | Email/password, 8-char min | Different | LOW |
| **onboarding** | OnboardingSteps wrapper | Multi-step: substance/north_star/guidance/sensitivity | v2 | MEDIUM |

---

## V2-Unique Routes to Port

### /drift (HIGH)
Crisis intervention tool. 4-7-8 breathing with visual countdown + 5-4-3-2-1 grounding prompts. Calm messaging ("You're okay. This will pass."). Purple/violet theming. Consolidates v1's settle/breathe + settle/ground into one focused page.

### /stash (HIGH)
Unified batch + dose calendar. Monthly grid with day classification colors (green/yellow/red). Click day to see doses. Batch list with calibration status. Power-user feature for pattern recognition.

### /log/complete (HIGH)
Post-dose check-in. STI sliders (Signal/Texture/Interference 1-10), BodyMap for somatic tracking, threshold feel, mood 1-5, context/timing tags, free-text reflection. Day classification from STI scores. Milestone detection. Critical for the STI data model.

### /workshop (MEDIUM)
Educational drills (breath, grounding, attention) + mental models. JSON-driven content. Expandable cards with "Try This", "Why It Works", step-by-step instructions.

### /offline (LOW)
PWA offline handler. Retry button, reassurance that local data is safe.

---

## Migration Priority Order

### Phase 1: Schema + Data Model
- [x] Schema migration SQL created (`supabase/migrations/20260213_schema_unification.sql`)
- [ ] Run migration against live Supabase project
- [ ] Verify substance_profiles, STI fields, settle_mode_logs tables

### Phase 2: Core Feature Ports (HIGH)
- [ ] Port `/log/complete` (STI sliders, BodyMap, day classification)
- [ ] Port `/drift` (crisis support breathing + grounding)
- [ ] Port `/stash` (calendar view + batch management)
- [ ] Port v2 `/log` form enhancements (food state, intention, context tags, med checks)
- [ ] Port v2 `/settings` features (north_star, guidance_level, notifications, sensitivity)
- [ ] Port v2 `/insights` patterns (ThresholdTerrainMap, confidence scoring)

### Phase 3: UX Improvements (MEDIUM)
- [ ] Port v2 `/history` filtering (all/complete/incomplete/sweetspot)
- [ ] Port v2 `/onboarding` multi-step form
- [ ] Port `/workshop` educational content
- [ ] Evaluate v2 `/compass` SSR pattern for performance
- [ ] Keep v1 settle subroute structure (breathe/ground/guide)

### Phase 4: Framework Upgrade (when ready)
- [ ] Upgrade Next.js 14 → 15 (async APIs, caching changes)
- [ ] Upgrade React 18 → 19 (useActionState, compiler)
- [ ] Run Next.js codemods
- [ ] Eventually Next 15 → 16 (Turbopack, proxy.ts)

---

## Breaking Changes Reference: Next.js 14 → 16

### Next.js 15
- `cookies()`, `headers()`, `params`, `searchParams` → async, must `await`
- `fetch`, GET handlers, client nav → no longer cached by default
- React 19 minimum for App Router
- `next/image` uses `sharp` (not squoosh)
- Min Node.js 18.18.0

### Next.js 16
- All dynamic APIs require `await`
- Turbopack default bundler
- Min Node.js 20.9.0, TypeScript 5.1+
- `middleware.ts` → `proxy.ts`
- `next lint` removed (use ESLint directly)
- Parallel routes need explicit `default.js`

### React 19
- `ReactDOM.render()` / `hydrate()` removed → `createRoot()` / `hydrateRoot()`
- `propTypes`, `defaultProps` (function components), string refs removed
- New JSX transform required
- New hooks: `useActionState`, `useOptimistic`, `useFormStatus`, `use()`
- React Compiler auto-optimizes (less manual `useMemo`/`useCallback`)

---

## StealingFire .env Audit

Both `.env` and `.env.example` contain identical placeholder values. No real keys set.

| Variable | Value | Status |
|----------|-------|--------|
| `GROQ_API_KEY` | `your_groq_api_key_here` | Placeholder |
| `GOOGLE_API_KEY` | `${GEMINI_API_KEY:-your_google_api_key_here}` | Placeholder (env fallback) |
| `OLLAMA_HOST` | `http://localhost:11434` | OK (default) |
| `OPENAI_API_KEY` | `your_openai_api_key_here` | Placeholder |
| `ANTHROPIC_API_KEY` | `your_anthropic_api_key_here` | Placeholder |
| `RECALL_API_KEY` | `your_recall_api_key_here` | Placeholder |
| `KAPTURE_API_KEY` | `your_kapture_api_key_here` | Placeholder |
| `TWEETHUNTER_API_KEY` | `your_tweethunter_api_key_here` | Placeholder |
| `CIRCLE_API_KEY` | `your_circle_api_key_here` | Placeholder |
| `CIRCLE_COMMUNITY_ID` | `your_community_id_here` | Placeholder |
| `TWITTER_API_KEY` | `your_twitter_api_key_here` | Placeholder |
| `TWITTER_API_SECRET` | `your_twitter_api_secret_here` | Placeholder |
| `TWITTER_ACCESS_TOKEN` | `your_access_token_here` | Placeholder |
| `TWITTER_ACCESS_SECRET` | `your_access_secret_here` | Placeholder |
| `TWITTER_BEARER_TOKEN` | `your_bearer_token_here` | Placeholder |
| `VITE_SUPABASE_URL` | `your_supabase_url_here` | Placeholder (.env.example only) |
| `VITE_SUPABASE_ANON_KEY` | `your_supabase_anon_key_here` | Placeholder (.env.example only) |
| `LATITUDE` / `LONGITUDE` | NYC defaults | OK |
| `ARCHIVE_PATH` / `ARCHIVE_DB_PATH` | Local paths | OK |
