import type { TournamentStatus } from '@/engine'
import { cn } from '@/lib/utils'

const LABEL: Record<TournamentStatus, string> = { live: 'Live', paused: 'Paused', finished: 'Finished' }

export function StatusPill({ status, viewer = false, className }: { status: TournamentStatus; viewer?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold tracking-wide uppercase',
        status === 'live' && 'border-success/40 bg-success/10 text-success',
        status === 'paused' && 'border-chart-4/40 bg-chart-4/10 text-chart-4',
        status === 'finished' && 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full bg-current',
          status === 'live' && 'animate-pulse motion-reduce:animate-none',
        )}
      />
      {LABEL[status]}
      {viewer && <span className="font-medium normal-case opacity-80">· viewing</span>}
    </span>
  )
}
