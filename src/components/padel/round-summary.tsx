import type { Round, Tournament } from '@/engine'
import { usePlayerNames } from '@/lib/session-store'
import { PHASE_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Read-only list of a round's matches, used for upcoming and completed fixtures. */
export function RoundSummary({ t, round, projected = false }: { t: Tournament; round: Round; projected?: boolean }) {
  const names = usePlayerNames(t)
  const team = (ids: string[]) => ids.map(names).join(' & ')
  return (
    <section className="rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-display text-xl font-bold uppercase">Round {round.index + 1}</h3>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>{PHASE_LABEL[round.phase]}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5',
              projected ? 'bg-muted' : round.status === 'completed' ? 'bg-muted' : 'bg-ball text-ball-foreground',
            )}
          >
            {projected ? 'Planned' : round.status === 'completed' ? 'Done' : round.status === 'scheduled' ? 'Next' : 'Now'}
          </span>
        </div>
      </header>
      <ul className="divide-y">
        {round.matches.map((m) => {
          const done = m.status === 'completed'
          const aWon = done && m.scoreA! > m.scoreB!
          const bWon = done && m.scoreB! > m.scoreA!
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 shrink-0 text-xs font-bold text-muted-foreground">C{m.court}</span>
              <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', done && !aWon && 'text-muted-foreground')}>{team(m.teamA)}</span>
              <span className="tabular shrink-0 font-display text-lg font-bold">
                {done ? `${m.scoreA}–${m.scoreB}` : <span className="text-xs text-muted-foreground">vs</span>}
              </span>
              <span className={cn('min-w-0 flex-1 truncate text-right text-sm font-semibold', done && !bWon && 'text-muted-foreground')}>{team(m.teamB)}</span>
            </li>
          )
        })}
      </ul>
      {round.resting.length > 0 && (
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Resting:</span> {round.resting.map(names).join(', ')}
        </p>
      )}
    </section>
  )
}
