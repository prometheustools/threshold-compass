import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { AlertCircle, Check } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  success?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, className = '', ...props }, ref) => {
    const uniqueId = useId()
    const errorId = `${uniqueId}-error`
    const hintId = `${uniqueId}-hint`
    const hasHelpText = error || hint

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={props.id || uniqueId}
            className="block font-mono text-xs tracking-widest uppercase text-bone mb-2"
          >
            {label}
            {props.required && <span className="text-status-elevated ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={props.id || uniqueId}
            className={`
              w-full bg-elevated border text-ivory rounded-button
              px-4 py-3 min-h-[44px]
              focus:border-orange focus:ring-1 focus:ring-orange/30 focus:outline-none
              placeholder:text-ash transition-quick
              ${error ? 'border-status-elevated pr-10' : success ? 'border-status-clear pr-10' : 'border-ember/30'}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={hasHelpText ? (error ? errorId : hintId) : undefined}
            {...props}
          />
          {/* Validation Icon */}
          {(error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {error ? (
                <AlertCircle className="w-5 h-5 text-status-elevated" />
              ) : (
                <Check className="w-5 h-5 text-status-clear" />
              )}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-status-elevated flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-ash">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
