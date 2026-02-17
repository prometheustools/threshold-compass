import { forwardRef, type SelectHTMLAttributes, useId } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
  hint?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, className = '', ...props }, ref) => {
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
          <select
            ref={ref}
            id={props.id || uniqueId}
            className={`
              w-full appearance-none bg-elevated border text-ivory rounded-button
              px-4 py-3 pr-10 min-h-[44px]
              focus:border-orange focus:ring-1 focus:ring-orange/30 focus:outline-none
              transition-quick cursor-pointer
              ${error ? 'border-status-elevated' : 'border-ember/30'}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={hasHelpText ? (error ? errorId : hintId) : undefined}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              error ? 'text-status-elevated' : 'text-bone'
            }`}
          />
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

Select.displayName = 'Select'

export default Select
