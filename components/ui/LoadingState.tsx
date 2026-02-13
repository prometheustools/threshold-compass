'use client'

interface LoadingStateProps {
  message?: 'calibrating' | 'loading' | 'saving' | string
  size?: 'sm' | 'md' | 'lg'
}

const defaultMessages = {
  calibrating: 'Calibrating...',
  loading: 'Loading data...',
  saving: 'Saving...',
}

const sizeClasses = {
  sm: 'text-sm py-4',
  md: 'text-base py-8',
  lg: 'text-lg py-12',
}

// PRD: No spinners. Use "calibrating" text with pulsing opacity.
// Style: Pulsing opacity, monospace text

export default function LoadingState({
  message = 'loading',
  size = 'md',
}: LoadingStateProps) {
  const displayMessage =
    message in defaultMessages
      ? defaultMessages[message as keyof typeof defaultMessages]
      : message

  return (
    <div className={`text-center ${sizeClasses[size]}`}>
      <p className="font-mono tracking-widest uppercase text-bone animate-pulse">
        {displayMessage}
      </p>
    </div>
  )
}

// Inline loading for use within cards/buttons
export function LoadingInline({ message = 'Loading...' }: { message?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-bone">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange" />
      {message}
    </span>
  )
}

// Card-based loading state
export function LoadingCard({
  message = 'loading',
}: {
  message?: LoadingStateProps['message']
}) {
  return (
    <div className="rounded-card border border-ember/20 bg-surface p-8">
      <LoadingState message={message} size="md" />
    </div>
  )
}

// Full page loading state
export function LoadingPage({ message = 'calibrating' }: { message?: LoadingStateProps['message'] }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingState message={message} size="lg" />
    </div>
  )
}
