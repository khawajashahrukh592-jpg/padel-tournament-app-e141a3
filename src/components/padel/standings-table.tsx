import type { StandingRow } from '@/engine'
import { cn } from '@/lib/utils'

const MEDAL = ['bg-ball text-ball-foreground', 'bg-secondary text-secondary-foreground ring-1 ring-border', 'bg-chart-4/25 text-foreground']

export function StandingsTable({ rows, highlightAverage = false, compact = false }: { rows: StandingRow[]; highlightAverage?: boolean; compact?: boolean }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            <th scope="col" className="w-10 pl-3">#</th>
            <th scope="col">Player</th>
            <th scope="col" className={cn('text-right', !highlightAverage && 'text-foreground')}>Pts</th>
            <th scope="col" className="text-right">P</th>
            <th scope="col" className={cn('text-right', highlightAverage && 'text-foreground')}>Avg</th>
            <th scope="col" className="text-right">W-D-L</th>
            {!compact && <th scope="col" className="text-right">Rest</th>}
            {!compact && <th scope="col" className="pr-3 text-right">Mins</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.playerId} className={cn('bg-card', r.status !== 'active' && 'opacity-60')}>
              <td className="rounded-l-xl border-y border-l py-3 pl-3">
                <span
                  className={cn(
                    'tabular grid size-8 place-items-center rounded-full font-display text-lg font-bold',
                    r.rank <= 3 ? MEDAL[r.rank - 1] : 'text-muted-foreground',
                  )}
                >
                  {r.rank}
                </span>
              </td>
              <td className="border-y py-3 pr-2">
                <span className="text-base font-semibold">{r.name}</span>
                {r.status === 'left' && <span className="ml-2 text-xs text-muted-foreground">left</span>}
                {r.status === 'unavailable' && <span className="ml-2 text-xs text-muted-foreground">away</span>}
              </td>
              <td className={cn('tabular border-y py-3 text-right font-display text-xl font-bold', highlightAverage && 'text-muted-foreground')}>{r.points}</td>
              <td className="tabular border-y py-3 text-right">{r.played}</td>
              <td className={cn('tabular border-y py-3 text-right', highlightAverage && 'font-display text-xl font-bold')}>{r.average.toFixed(1)}</td>
              <td className={cn('tabular border-y py-3 text-right text-muted-foreground', compact && 'rounded-r-xl border-r pr-3')}>
                {r.wins}-{r.draws}-{r.losses}
              </td>
              {!compact && <td className="tabular border-y py-3 text-right text-muted-foreground">{r.rested}</td>}
              {!compact && <td className="tabular rounded-r-xl border-y border-r py-3 pr-3 text-right text-muted-foreground">{r.courtMinutes}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
