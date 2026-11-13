import { cn } from '@/lib/utils'

interface Option<T extends string | number> {
  value: T
  label: string
  hint?: string
}

/** Large-target radio group styled as a segmented control. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-1 rounded-xl bg-muted p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg px-2 font-semibold transition-colors motion-reduce:transition-none',
              size === 'md' ? 'min-h-12 text-sm' : 'min-h-9 text-xs',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.hint && <span className="text-[11px] font-medium text-muted-foreground">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
