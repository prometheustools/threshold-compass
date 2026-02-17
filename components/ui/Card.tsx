import { type ReactNode } from 'react'

type CardVariant = 'surface' | 'elevated' | 'raised'
type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children: ReactNode
  hover?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface',
  elevated: 'bg-elevated',
  raised: 'bg-raised',
}

const paddingStyles: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export default function Card({ 
  variant = 'surface', 
  padding = 'md', 
  className = '', 
  children,
  hover = false
}: CardProps) {
  return (
    <div className={`
      rounded-card border border-ember/20 
      ${variantStyles[variant]} 
      ${paddingStyles[padding]} 
      ${hover ? 'transition-all duration-300 hover:border-ember/40 hover:shadow-lg hover:shadow-black/20' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}
