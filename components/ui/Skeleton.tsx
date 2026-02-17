'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
}

export default function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height 
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-elevated'
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-card',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

// Pre-built skeleton patterns for common UI elements
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-ember/20 bg-surface p-4 space-y-3">
      <Skeleton variant="text" width="60%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '80%' : '100%'} height={12} />
      ))}
    </div>
  )
}

export function CompassSkeleton() {
  return (
    <div className="space-y-4">
      <CardSkeleton lines={2} />
      <div className="rounded-card border border-ember/20 bg-surface p-6">
        <Skeleton variant="text" width="40%" height={14} className="mb-4" />
        <div className="flex items-center justify-center py-8">
          <Skeleton variant="circular" width={120} height={120} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width="30%" height={14} />
          <Skeleton variant="rounded" height={48} />
        </div>
      ))}
      <Skeleton variant="rounded" height={56} className="mt-6" />
    </div>
  )
}
