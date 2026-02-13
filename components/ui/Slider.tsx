'use client'

interface SliderProps {
  label?: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
}

export default function Slider({ label, min, max, step = 1, value, onChange }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-xs tracking-widest uppercase text-bone">
            {label}
          </label>
          <span className="font-mono text-sm text-ivory">{value}</span>
        </div>
      )}
      <div className="relative h-8 flex items-center">
        <div className="absolute w-full h-1 bg-elevated rounded-full">
          <div
            className="absolute h-full bg-orange rounded-full transition-quick"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-8 opacity-0 cursor-pointer"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        <div
          className="absolute w-5 h-5 bg-orange rounded-full shadow-md pointer-events-none transition-quick"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  )
}
