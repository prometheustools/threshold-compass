# CODEX CONTEXT — Threshold Compass Code Generation

You are generating code scaffolds for **Threshold Compass**, a precision microdosing tracker.

---

## YOUR ROLE

You handle code generation tasks delegated from Claude Code:
- UI component scaffolds
- Form component scaffolds
- Test file generation
- API route skeletons
- Utility function boilerplate

---

## TECH STACK

```
Framework: Next.js 14 (App Router)
Language: TypeScript (strict mode)
Styling: Tailwind CSS
Database: Supabase
State: Zustand
Animation: Framer Motion (optional)
Icons: Lucide React
```

---

## DESIGN TOKENS

```typescript
// Colors (use these exact values)
const colors = {
  // Backgrounds
  bgPrimary: '#000000',      // Main background
  bgElevated: '#2D2D2D',     // Cards, modals
  bgSubtle: '#1A1A1A',       // Hover states
  
  // Text
  textPrimary: '#F5F2E9',    // Ivory - main text
  textSecondary: '#999999',  // Muted text
  
  // Accents
  accentPrimary: '#E07A3E',  // Orange - primary actions
  accentSecondary: '#6B4E8D', // Violet - secondary
  
  // Borders
  borderDefault: '#333333',
  borderFocus: '#E07A3E',
  
  // Semantic
  success: '#4CAF50',
  warning: '#FFD54F',
  caution: '#FF9800',
  danger: '#F44336',
};

// Typography
// Headers: JetBrains Mono, uppercase, tracking-wide
// Body: Inter

// Spacing
// Border radius: 2px (sharp, not rounded)
// Touch targets: min 44px
```

---

## COMPONENT PATTERNS

### Base Component Structure

```typescript
// components/ui/Button.tsx
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-mono uppercase tracking-wide',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px]', // Touch target
          
          // Variants
          variant === 'primary' && 'bg-orange-500 text-black hover:bg-orange-400',
          variant === 'secondary' && 'border border-gray-600 text-ivory hover:bg-gray-800',
          variant === 'ghost' && 'text-gray-400 hover:text-ivory hover:bg-gray-800',
          
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

### cn() Utility

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## FILE STRUCTURE

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Slider.tsx
│   ├── Input.tsx
│   └── index.ts
├── forms/
│   ├── DoseForm.tsx
│   ├── CheckInForm.tsx
│   ├── BatchForm.tsx
│   └── index.ts
├── compass/
│   ├── Compass.tsx
│   ├── StatusRing.tsx
│   ├── ThresholdMeter.tsx
│   └── index.ts
└── layout/
    ├── Navigation.tsx
    ├── Header.tsx
    └── Container.tsx
```

---

## COMPONENT REQUIREMENTS

### All Components Must:
- Be TypeScript with proper interfaces
- Export from index.ts barrel files
- Use `cn()` for conditional classes
- Have `min-h-[44px]` touch targets for interactive elements
- Support `className` prop for composition
- Use forwardRef for DOM elements

### Mobile-First:
- Default styles for mobile
- Use `md:` and `lg:` for larger screens
- No horizontal scroll
- 100dvh for full-height layouts

### Dark Mode:
- `#000000` background is default
- Never use pure white text
- Use `#F5F2E9` (ivory) for primary text
- Borders are `#333333`

---

## TEST FILE PATTERNS

### Unit Test Structure

```typescript
// lib/algorithms/__tests__/carryover.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCarryover } from '../carryover';

describe('calculateCarryover', () => {
  it('returns 0 for no prior doses', () => {
    const result = calculateCarryover([], new Date());
    expect(result.score).toBe(0);
    expect(result.tier).toBe('clear');
  });

  it('handles same-day dosing correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const doses = [{ timestamp: twoHoursAgo.toISOString(), amount: 0.1 }];
    const result = calculateCarryover(doses, new Date());
    expect(result.tier).toBe('mild');
  });

  it('decays by half-life', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const doses = [{ timestamp: threeDaysAgo.toISOString(), amount: 0.1 }];
    const result = calculateCarryover(doses, new Date());
    expect(result.score).toBeLessThan(25);
  });
});
```

### Component Test Structure

```typescript
// components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('applies variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });
});
```

---

## API ROUTE PATTERNS

```typescript
// app/api/doses/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const DoseInput = z.object({
  batch_id: z.string().uuid(),
  amount: z.number().positive().max(1),
  food_state: z.enum(['empty', 'light', 'full']),
  intention: z.string().max(500),
});

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = DoseInput.parse(body);
    
    // Calculate carryover before insert
    // ... implementation
    
    const { data, error } = await supabase
      .from('dose_logs')
      .insert({ ...validated, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

---

## COMMON TASKS

### "Generate Button component with variants"

Create `components/ui/Button.tsx` with:
- primary (orange fill)
- secondary (outline)
- ghost (text only)
- Size variants (sm, md, lg)
- Loading state
- Disabled state

### "Generate test file for [algorithm]"

Create `lib/algorithms/__tests__/[name].test.ts` with:
- Edge cases (empty input, null values)
- Normal operation
- Boundary conditions
- Error cases

### "Generate form component for [type]"

Create `components/forms/[Type]Form.tsx` with:
- TypeScript interface for form data
- Controlled inputs
- Validation
- Submit handler
- Loading/error states

---

## SAVE OUTPUTS

Save generated files to the correct location:
- Components → `components/[category]/[Name].tsx`
- Tests → `[original-path]/__tests__/[name].test.ts`
- API routes → `app/api/[route]/route.ts`

Or save to:
`~/GitHub/threshold-compass/AI/outputs/codex-[type]-[timestamp].tsx`
