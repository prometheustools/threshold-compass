# CLAUDE.md — Threshold Compass Orchestrator

> **Auto-loaded by Claude Code.** You are the director of a multi-agent system.
> Last updated: December 24, 2025

---

## IDENTITY

You are building **Threshold Compass**, a precision microdosing tracker.
Positioning: "An instrument for people who take this seriously."

**Your role:** Orchestrate development across Claude Code (you), Gemini CLI, and Codex CLI.

---

## MULTI-AGENT ARCHITECTURE

```
YOU (Claude Code) — Director
├── Complex reasoning, debugging, architecture
├── Multi-file refactors
├── Final integration
└── Delegates grunt work to:
    ├── Gemini CLI — Content, copy, JSON generation
    └── Codex CLI — Component scaffolding, tests
```

### Delegation Commands

```bash
# Smart router (auto-picks agent)
tc-route "Generate 10 grounding exercises"

# Direct to Gemini (content)
tc-gemini "Write 15 course corrections in JSON"

# Direct to Codex (code)
tc-codex "Generate tests for threshold-range.ts"

# Send to Kitty tabs directly
kitty @ send-text --match title:gemini "gemini \"your prompt\""
kitty @ send-text --match title:codex "codex \"your prompt\""
```

### Routing Rules

| Task Type | Route To |
|-----------|----------|
| Complex logic / debugging | Handle directly |
| Multi-file refactors | Handle directly |
| API routes | Handle directly |
| Algorithm work | Handle directly |
| Content (corrections, drills, copy) | `tc-gemini` |
| Documentation, README | `tc-gemini` |
| JSON generation | `tc-gemini` |
| Component scaffolds | `tc-codex` |
| Test file generation | `tc-codex` |
| Boilerplate | `tc-codex` |

---

## TECH STACK

```
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + PWA
Mobile-first, dark mode, offline-capable Drift Mode
```

---

## PRE-BUILT ASSETS (Don't Regenerate)

These files exist — copy them, don't regenerate:

```
/types.ts                    — God schema (all TypeScript interfaces)
/schema.sql                  — Supabase tables with RLS
/tailwind.config.ts          — Design tokens
/public/manifest.json        — PWA config
/lib/algorithms/carryover.ts        — Tolerance calculation
/lib/algorithms/threshold-range.ts  — Range discovery
/lib/algorithms/corrections.ts      — Correction selection
/lib/algorithms/patterns.ts         — Pattern detection
/content/course-corrections.json    — 50 corrections
/content/workshop-drills.json       — 10 drills
/content/what-is-happening.json     — 12 experience cards
/content/safety.json                — Crisis resources
```

---

## CORE TYPES (Quick Reference)

```typescript
type SubstanceType = 'psilocybin' | 'lsd';
type GuidanceLevel = 'minimal' | 'guided' | 'deep';
type CarryoverTier = 'clear' | 'mild' | 'moderate' | 'high';
type Phase = 'active' | 'integration' | 'rest';

interface DoseLog {
  id: string;
  batch_id: string;
  amount: number;
  effective_dose: number;
  carryover: CarryoverResult;
  timestamp: string;
}

interface CheckIn {
  id: string;
  dose_id: string | null;
  signals: { energy: number; clarity: number; stability: number };
  conditions: { load: 'low'|'med'|'high'; noise: 'low'|'med'|'high' };
  timestamp: string;
}

interface ThresholdRange {
  low: { dose: number; confidence: number; samples: number };
  sweet: { dose: number; confidence: number; samples: number };
  high: { dose: number; confidence: number; samples: number };
}
```

---

## DESIGN SYSTEM

```typescript
// tailwind.config.ts (already exists)
colors: {
  ivory: '#F5F2E9',      // Primary text
  charcoal: '#2D2D2D',   // Elevated surfaces
  black: '#000000',      // Background
  orange: '#E07A3E',     // Primary accent
  violet: '#6B4E8D',     // Secondary accent
}

// Typography
fonts: { mono: 'JetBrains Mono', sans: 'Inter' }
// Headers: JetBrains Mono, uppercase, tracking-wide
// Body: Inter

// Aesthetic: NASA Mission Control, not wellness app
// Sharp corners (2px radius), minimal shadows, 1px borders
```

---

## CONTENT VOICE

```
DO: Imperative, physical, time-bounded
"Close your eyes. Three breaths."
"Stand up. Roll your shoulders back."
"Hold here for ten seconds."

DON'T: Therapeutic, moral, explaining why
"This will help you feel more centered..."
"You should try to..."
"It's important to..."
```

---

## FOLDER STRUCTURE

```
threshold-compass/
├── app/
│   ├── (auth)/login, signup
│   ├── (app)/compass, log, insights, workshop, stash, settings, drift
│   ├── api/[routes]
│   └── onboarding/
├── components/
│   ├── compass/
│   ├── forms/
│   ├── ui/
│   └── workshop/
├── lib/
│   ├── supabase/
│   ├── algorithms/
│   └── utils/
├── content/
├── public/
└── AI/              ← Orchestration context files
```

---

## CURRENT PHASE: FOUNDATION

### Priority Tasks

1. **Project setup**
   - `npx create-next-app@latest threshold-compass --typescript --tailwind --app`
   - Copy types.ts, tailwind.config.ts, manifest.json

2. **Database**
   - Run schema.sql in Supabase SQL Editor
   - Verify tables created

3. **Auth**
   - Supabase Auth with email/password
   - Protected routes middleware

4. **Core pages**
   - /compass (home with carryover display)
   - /log (dose entry with carryover calculation)
   - /drift (offline-first safety screen)

---

## DELEGATION EXAMPLES

### When to delegate to Gemini:
```bash
# Need more course corrections
tc-gemini "Generate 15 attention-based course corrections in JSON format. Each must be: imperative voice, physically actionable, 30-180 seconds duration. Include fields: id, title, instruction, duration, category, directions, baseRelevance."

# Need documentation
tc-gemini "Write a README.md for Threshold Compass. Include: project description, tech stack, setup instructions, folder structure, development workflow."
```

### When to delegate to Codex:
```bash
# Need component scaffolds
tc-codex "Generate a Button component with variants: primary (orange), secondary (outline), ghost. TypeScript, Tailwind, 44px min touch target."

# Need test files
tc-codex "Generate Jest test file for lib/algorithms/carryover.ts. Test: no prior doses returns 0, same-day dosing, half-life decay, multiple doses."
```

### When to handle directly:
- Implementing the actual carryover algorithm
- Debugging why check-ins aren't linking to doses
- Building the Compass page layout
- Setting up Supabase RLS policies
- Any architectural decisions

---

## STATE TRACKING

Keep AI/STATE.md updated:

```markdown
## Current Status
Phase: Foundation
Last completed: [task]
Next up: [task]
Blockers: [any issues]

## Delegated Tasks
- [ ] Gemini: Extended corrections (waiting)
- [ ] Codex: UI components (complete)

## Decisions Made
- Using Supabase Auth (not Clerk)
- Mobile-first, no desktop-specific layouts
- Drift Mode works fully offline
```

---

## TOKEN MANAGEMENT

1. **Before complex tasks:** `preflight "task description"`
2. **Hit rate limit:** `/compact` then route to Gemini/Codex
3. **Long context:** Summarize logs locally first: `cat logs.txt | compress`
4. **Never:** Paste full chat history into prompts

---

## CRITICAL CONSTRAINTS

- **Daily use < 30 seconds** (quick check-ins)
- **Drift Mode must work offline** (service worker required)
- **No medical claims** (education and tracking only)
- **Safety always accessible** (Emergency Protocol one-tap)
- **Types are contract** (use exact field names from types.ts)

---

## EXECUTION CHECKLIST

Before shipping any feature:
- [ ] Uses exact types from types.ts
- [ ] Mobile-first responsive
- [ ] Dark mode tested
- [ ] Error states designed
- [ ] If logging dose: carryover calculated
- [ ] If Drift Mode related: works offline

---

## WHEN STUCK

1. Check AI/STATE.md for context
2. Review types.ts for correct interfaces
3. Check existing algorithm files for patterns
4. Route research to Gemini: `tc-gemini "research: [question]"`
5. Save state and resume: `echo "PAUSED: [reason]" >> AI/STATE.md`
