import { useState } from 'react'
import { ArrowLeftRight, Check, Pencil, Undo2 } from 'lucide-react'
import { clearScore, setScore, validateScore } from '@/engine'
import type { Match, Round, Tournament } from '@/engine'
import { Button } from '@/components/ui/button'
import { useSession, usePlayerNames } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { SwapSheet } from './swap-sheet'

function TeamNames({ ids, names, winner }: { ids: string[]; names: (id: string) => string; winner?: boolean }) {
  return (
    <div className={cn('min-w-0 flex-1', winner && 'text-foreground')}>
      {ids.map((id) => (
        <p key={id} className="truncate text-base leading-tight font-semibold sm:text-lg">
          {names(id)}
        </p>
      ))}
    </div>
  )
}

function ScoreInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
      onFocus={(e) => e.target.select()}
      className="tabular h-16 w-16 rounded-xl border-2 border-input bg-background text-center font-display text-4xl font-bold outline-none focus:border-ring"
    />
  )
}

export function CourtCard({ t, round, match, compact = false }: { t: Tournament; round: Round; match: Match; compact?: boolean }) {
  const { isHost, apply } = useSession()
  const names = usePlayerNames(t)
  const [editing, setEditing] = useState(false)
  const [a, setA] = useState(match.scoreA?.toString() ?? '')
  const [b, setB] = useState(match.scoreB?.toString() ?? '')
  const [swapOpen, setSwapOpen] = useState(false)

  const done = match.status === 'completed'
  const showEntry = isHost && t.status !== 'finished' && round.status !== 'scheduled' && (!done || editing)
  const showEntryFinished = isHost && t.status === 'finished' && editing
  const entry = showEntry || showEntryFinished
  const total = t.config.pointsPerMatch
  const isPoints = t.config.matchMode === 'points'

  const numA = a === '' ? NaN : Number(a)
  const numB = b === '' ? NaN : Number(b)
  const error = a !== '' && b !== '' ? validateScore(t.config, numA, numB) : null

  const changeA = (v: string) => {
    setA(v)
    if (isPoints && v !== '' && Number(v) <= total) setB(String(total - Number(v)))
  }
  const changeB = (v: string) => {
    setB(v)
    if (isPoints && v !== '' && Number(v) <= total) setA(String(total - Number(v)))
  }

  const save = () => {
    if (apply((x) => setScore(x, match.id, numA, numB, Date.now()))) setEditing(false)
  }
  const undo = () => {
    if (apply((x) => clearScore(x, match.id), 'Score cleared')) {
      setA('')
      setB('')
    }
  }

  const aWon = done && match.scoreA! > match.scoreB!
  const bWon = done && match.scoreB! > match.scoreA!
  const canSwap = isHost && !done && round.status !== 'completed' && t.status !== 'finished'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-card',
        round.status !== 'scheduled' && !done && 'ring-2 ring-ball/60',
      )}
      aria-label={`Court ${match.court}`}
    >
      <div className="court-lines flex items-center justify-between bg-court px-4 py-2 text-court-foreground">
        <span className="font-display text-lg font-bold tracking-wide uppercase">Court {match.court}</span>
        <span className="text-xs font-semibold tracking-wide uppercase opacity-80">
          {done ? 'Final' : round.status === 'scheduled' ? 'Up next' : round.status === 'paused' ? 'Paused' : 'In play'}
        </span>
      </div>

      <div className={cn('flex items-center gap-3 px-4', compact ? 'py-3' : 'py-4')}>
        <TeamNames ids={match.teamA} names={names} winner={aWon} />
        <div className="flex shrink-0 items-center gap-2">
          {entry ? (
            <>
              <ScoreInput value={a} onChange={changeA} label={`Court ${match.court} team 1 score`} />
              <span className="font-display text-2xl text-muted-foreground">–</span>
              <ScoreInput value={b} onChange={changeB} label={`Court ${match.court} team 2 score`} />
            </>
          ) : done ? (
            <p className="tabular font-display text-4xl font-bold">
              <span className={cn(!aWon && 'text-muted-foreground')}>{match.scoreA}</span>
              <span className="mx-1.5 text-muted-foreground">–</span>
              <span className={cn(!bWon && 'text-muted-foreground')}>{match.scoreB}</span>
            </p>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">vs</span>
          )}
        </div>
        <TeamNames ids={match.teamB} names={names} winner={bWon} />
      </div>

      {entry && (
        <div className="border-t px-4 py-3">
          {error ? (
            <p role="alert" className="mb-2 text-sm font-medium text-destructive">{error}</p>
          ) : isPoints ? (
            <p className="mb-2 text-xs text-muted-foreground">Enter one side — the other fills to {total}.</p>
          ) : null}
          <div className="flex gap-2">
            <Button size="xl" className="flex-1" disabled={!!error || a === '' || b === ''} onClick={save}>
              <Check /> Save score
            </Button>
            {editing && (
              <Button size="xl" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {isHost && !entry && (done || canSwap) && (
        <div className="flex gap-2 border-t px-3 py-2">
          {done && (
            <>
              <Button variant="ghost" size="lg" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
              {t.status !== 'finished' && (
                <Button variant="ghost" size="lg" onClick={undo}>
                  <Undo2 /> Undo
                </Button>
              )}
            </>
          )}
          {canSwap && (
            <Button variant="ghost" size="lg" onClick={() => setSwapOpen(true)}>
              <ArrowLeftRight /> Swap player
            </Button>
          )}
        </div>
      )}
      {canSwap && entry && (
        <div className="border-t px-3 py-1">
          <Button variant="ghost" size="sm" onClick={() => setSwapOpen(true)}>
            <ArrowLeftRight /> Swap player
          </Button>
        </div>
      )}
      {canSwap && <SwapSheet open={swapOpen} onOpenChange={setSwapOpen} t={t} round={round} match={match} />}
    </article>
  )
}
