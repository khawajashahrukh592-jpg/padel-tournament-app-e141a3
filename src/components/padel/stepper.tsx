import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label: string
  suffix?: string
  className?: string
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className={cn('flex items-center gap-2', className)} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className="grid size-12 place-items-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 motion-reduce:transition-none"
      >
        <Minus className="size-5" />
      </button>
      <output className="tabular min-w-16 text-center font-display text-3xl font-bold" aria-live="polite">
        {value}
        {suffix && <span className="ml-1 font-sans text-sm font-semibold text-muted-foreground">{suffix}</span>}
      </output>
      <button
        type="button"
        onClick={() => set(value + step)}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className="grid size-12 place-items-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 motion-reduce:transition-none"
      >
        <Plus className="size-5" />
      </button>
    </div>
  )
}
