# Threshold Compass — Build Agent Rules

## Stack
- Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS 3.4 + Supabase + Zustand
- Forms: react-hook-form + zod
- Icons: lucide-react
- NO Framer Motion, NO Chart.js, NO Redux, NO external analytics

## Design System (INVIOLABLE)
- Background: #0A0A0A (base), #121212 (surface), #1E1E1E (elevated), #2A2A2A (raised)
- Text: #F5F2E9 (ivory, primary), #C4C0B6 (bone, secondary), #8A8A8A (ash, disabled)
- Accent: #E07A3E (orange, CTAs), #8B4D2C (ember, borders at rest)
- Status: #4A9B6B (clear/green), #C9A227 (mild/amber), #D4682A (moderate/orange), #B54A4A (elevated/red)
- Fonts: JetBrains Mono for data/headers, Inter for body
- Border radius: 2px (instrument), 8px (card), 6px (button)
- Animations: 800ms ease-out ONLY. NO bounce. NO spring. NO confetti.
- Touch targets: minimum 44px
- NEVER use pure white (#FFFFFF)

## File Boundaries
Each agent ONLY modifies its assigned files. Never touch files owned by another agent.

## Code Style
- TypeScript strict mode — no `any`
- Import types from `@/types`
- Use Tailwind classes, no inline styles
- Server components by default, 'use client' only when needed
- All interactive elements need aria labels

## Forbidden Patterns
- Streak counters, badges, achievements
- AI coaching chatbot
- Spring/bounce animations
- Generic wellness copy ("You got this!")
- Social comparison features
- Push notification optimization
- Pure white backgrounds
