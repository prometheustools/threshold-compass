import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block font-mono text-xs tracking-widest uppercase text-bone mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-elevated border text-ivory rounded-button
            px-4 py-3 min-h-[44px]
            focus:border-orange focus:ring-1 focus:ring-orange/30 focus:outline-none
            placeholder:text-ash transition-quick
            ${error ? 'border-status-elevated' : 'border-ember/30'}
            ${className}
          `}
          aria-label={label || props.placeholder}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-status-elevated">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-ash">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
