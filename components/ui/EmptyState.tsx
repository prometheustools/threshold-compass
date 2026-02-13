'use client'

import { Compass, FlaskConical, Layers, Pill } from 'lucide-react'
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
}

export function EmptyState({ icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  const content = (
    <div className={`text-center ${variant === 'subtle' ? 'py-6' : 'py-12'}`}>
      <div className={`mx-auto mb-4 flex items-center justify-center rounded-full bg-elevated ${variant === 'subtle' ? 'h-12 w-12' : 'h-16 w-16'}`}>
        <div className="text-ash">{icon}</div>
      </div>
      <h3 className={`font-sans text-ivory ${variant === 'subtle' ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>
      <p className={`mt-2 text-bone ${variant === 'subtle' ? 'text-xs' : 'text-sm'}`}>
        {description}
      </p>
      {action && (
        <div className="mt-6">
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
