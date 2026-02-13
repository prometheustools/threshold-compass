import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block font-mono text-xs tracking-widest uppercase text-bone mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full appearance-none bg-elevated border text-ivory rounded-button
              px-4 py-3 pr-10 min-h-[44px]
              focus:border-orange focus:ring-1 focus:ring-orange/30 focus:outline-none
              transition-quick
              ${error ? 'border-status-elevated' : 'border-ember/30'}
              ${className}
            `}
            aria-label={label}
            aria-invalid={!!error}
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bone pointer-events-none"
          />
        </div>
        {error && <p className="mt-1 text-sm text-status-elevated">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
