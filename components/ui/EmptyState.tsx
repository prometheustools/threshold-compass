'use client'

import { Compass, FlaskConical, Layers, Pill, Sparkles, BookOpen } from 'lucide-react'
import Button from './Button'
import Card from './Card'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  variant?: 'default' | 'subtle'
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  tip?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  variant = 'default',
  secondaryAction,
  tip
}: EmptyStateProps) {
  const content = (
    <div className={`text-center ${variant === 'subtle' ? 'py-6' : 'py-12'}`}>
      <div className={`mx-auto mb-4 flex items-center justify-center rounded-2xl bg-elevated border border-ember/20 ${variant === 'subtle' ? 'h-12 w-12' : 'h-16 w-16'}`}>
        <div className="text-orange">{icon}</div>
      </div>
      <h3 className={`font-sans font-semibold text-ivory ${variant === 'subtle' ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>
      <p className={`mt-2 text-bone ${variant === 'subtle' ? 'text-xs' : 'text-sm'} max-w-xs mx-auto`}>
        {description}
      </p>
      
      {/* Pro Tip */}
      {tip && (
        <div className="mt-4 p-3 rounded-button bg-orange/5 border border-orange/20 mx-auto max-w-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
            <p className="text-xs text-bone text-left">{tip}</p>
          </div>
        </div>
      )}
      
      {action && (
        <div className="mt-6 space-y-3">
          {action.href ? (
            <a href={action.href}>
              <Button size={variant === 'subtle' ? 'md' : 'lg'} className="w-full">
                {action.label}
              </Button>
            </a>
          ) : (
            <Button size={variant === 'subtle' ? 'md' : 'lg'} className="w-full" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            secondaryAction.href ? (
              <a 
                href={secondaryAction.href}
                className="inline-flex items-center justify-center gap-2 text-sm text-bone hover:text-ivory transition-colors min-h-[44px]"
              >
                <BookOpen className="w-4 h-4" />
                {secondaryAction.label}
              </a>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center justify-center gap-2 text-sm text-bone hover:text-ivory transition-colors min-h-[44px]"
              >
                <BookOpen className="w-4 h-4" />
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )

  if (variant === 'subtle') {
    return content
  }

  return <Card padding="lg">{content}</Card>
}

// Pre-configured empty states for common scenarios
export function EmptyStateNoBatch() {
  return (
    <EmptyState
      icon={<Layers size={24} />}
      title="No Active Batch"
      description="Create a batch to start tracking your doses. Each batch represents a specific substance source."
      tip="Batches help you track potency variations between different sources over time."
      action={{
        label: 'Create Batch',
        href: '/batch',
      }}
    />
  )
}

export function EmptyStateNoDoses() {
  return (
    <EmptyState
      icon={<Pill size={24} />}
      title="No Doses Logged"
      description="Start logging your doses to build your personal threshold profile and track carryover."
      tip="Log immediately after dosing while context is fresh. You can always add details later."
      action={{
        label: 'Log First Dose',
        href: '/log',
      }}
    />
  )
}

export function EmptyStateNoCalibration() {
  return (
    <EmptyState
      icon={<Compass size={24} />}
      title="Calibration Not Started"
      description="Complete the 10-dose discovery protocol to find your personal threshold range."
      action={{
        label: 'Start Discovery',
        href: '/discovery',
      }}
    />
  )
}

export function EmptyStateNoData({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={<FlaskConical size={24} />}
      title="No Data Available"
      description="Your compass data couldn't be loaded. This may be a temporary issue."
      action={{
        label: 'Try Again',
        onClick: onReset || (() => window.location.reload()),
      }}
    />
  )
}

export function EmptyStatePlaceholder({ message = 'No data' }: { message?: string }) {
  return (
    <div className="rounded-button bg-elevated/30 py-8 text-center">
      <p className="font-mono text-xs tracking-widest uppercase text-ash">{message}</p>
    </div>
  )
}
