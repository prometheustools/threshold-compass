'use client'

import Card from '@/components/ui/Card'

interface DoseGuidanceProps {
  doseNumber: number // 1-10
}

// PRD Table from FLOW-006
interface GuidanceInfo {
  phase: 'baseline' | 'mapping' | 'refinement'
  guidance: string
  details: string
}

const guidanceByDose: Record<number, GuidanceInfo> = {
  1: {
    phase: 'baseline',
    guidance: 'Start low. Establish your floor.',
    details: 'Begin with a conservative dose to understand your baseline sensitivity. Note any subtle effects without actively seeking threshold.',
  },
  2: {
    phase: 'baseline',
    guidance: 'Same range. Confirm or adjust.',
    details: 'Repeat your initial dose to confirm consistency. If no perceptible effects, consider a slight increase.',
  },
  3: {
    phase: 'baseline',
    guidance: 'Same range. Confirm or adjust.',
    details: 'Continue establishing baseline. Look for patterns in your responses across similar conditions.',
  },
  4: {
    phase: 'baseline',
    guidance: 'Same range. Confirm or adjust.',
    details: 'Final baseline dose. You should have a clear sense of your minimum perceptible threshold by now.',
  },
  5: {
    phase: 'mapping',
    guidance: 'Step up slightly. Finding the middle.',
    details: 'Increase dose by 10-20%. You are now exploring the middle ground between sub-perceptual and noticeable effects.',
  },
  6: {
    phase: 'mapping',
    guidance: 'Step up slightly. Finding the middle.',
    details: 'Continue mapping your dose-response curve. Pay attention to where functionality meets enhancement.',
  },
  7: {
    phase: 'mapping',
    guidance: 'One more step. Approaching your ceiling.',
    details: 'Push closer to your upper threshold. This helps define where "too much" begins for you.',
  },
  8: {
    phase: 'refinement',
    guidance: 'Return to where it felt right. Confirm sweet spot.',
    details: 'Go back to the dose that felt optimal. Consistency is key—confirm this is truly your sweet spot.',
  },
  9: {
    phase: 'refinement',
    guidance: 'Return to where it felt right. Confirm sweet spot.',
    details: 'Second confirmation dose. Your threshold range should be becoming clear and reproducible.',
  },
  10: {
    phase: 'refinement',
    guidance: 'Final calibration dose. Trust the data.',
    details: 'Last dose of the protocol. Log carefully—this completes your personal calibration dataset.',
  },
}

const phaseColors = {
  baseline: {
    text: 'text-bone',
    bg: 'bg-bone/10',
    border: 'border-bone/30',
  },
  mapping: {
    text: 'text-status-mild',
    bg: 'bg-status-mild/10',
    border: 'border-status-mild/30',
  },
  refinement: {
    text: 'text-violet',
    bg: 'bg-violet/10',
    border: 'border-violet/30',
  },
}

export default function DoseGuidance({ doseNumber }: DoseGuidanceProps) {
  const guidance = guidanceByDose[doseNumber]

  if (!guidance) return null

  const colors = phaseColors[guidance.phase]

  return (
    <Card padding="lg" className={`${colors.bg} ${colors.border} border`}>
      <div className="space-y-4">
        {/* Phase Badge */}
        <div className="flex items-center justify-between">
          <p className={`font-mono text-xs tracking-widest uppercase ${colors.text}`}>
            {guidance.phase} Phase
          </p>
          <p className="font-mono text-xs text-ash">
            Dose {doseNumber} of 10
          </p>
        </div>

        {/* Main Guidance */}
        <div>
          <h3 className="font-sans text-xl text-ivory leading-tight">
            {guidance.guidance}
          </h3>
        </div>

        {/* Details */}
        <p className="text-sm text-bone leading-relaxed">
          {guidance.details}
        </p>

        {/* Action Items */}
        <div className="rounded-button bg-elevated/50 p-4 space-y-2">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">
            This Dose
          </p>
          <ul className="space-y-2 text-sm text-ivory">
            <li className="flex items-start gap-2">
              <span className="text-orange mt-1">•</span>
              <span>Log your dose amount precisely</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange mt-1">•</span>
              <span>Note context (sleep, meals, stress)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange mt-1">•</span>
              <span>Complete check-in at +90 minutes</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
