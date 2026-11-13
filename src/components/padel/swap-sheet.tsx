import { useState } from 'react'
import { swapPlayers } from '@/engine'
import type { Match, Round, Tournament } from '@/engine'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSession, usePlayerNames } from '@/lib/session-store'
import { cn } from '@/lib/utils'

export function SwapSheet({
  open,
  onOpenChange,
  t,
  round,
  match,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  t: Tournament
  round: Round
  match: Match
}) {
  const { apply } = useSession()
  const names = usePlayerNames(t)
  const [out, setOut] = useState<string | null>(null)
  const inMatch = [...match.teamA, ...match.teamB]

  const where = (id: string) => {
    const m = round.matches.find((x) => [...x.teamA, ...x.teamB].includes(id))
    if (m) return m.status === 'completed' ? null : `Court ${m.court}`
    if (round.resting.includes(id)) return 'Resting'
    return 'Not in this round'
  }
  const candidates = t.players
    .filter((p) => p.status === 'active' && !inMatch.includes(p.id))
    .map((p) => ({ id: p.id, place: where(p.id) }))
    .filter((c): c is { id: string; place: string } => c.place !== null)

  const pick = (inId: string) => {
    if (!out) return
    if (apply((x) => swapPlayers(x, round.index, out, inId), `${names(inId)} in for ${names(out)}`)) {
      setOut(null)
      onOpenChange(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setOut(null)
        onOpenChange(o)
      }}
    >
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl pb-safe">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl uppercase">Swap on court {match.court}</SheetTitle>
          <SheetDescription>
            {out ? `Who replaces ${names(out)}?` : 'Pick the player to take off.'} Only this round changes — completed results stay as they are.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {!out ? (
            <div className="grid grid-cols-2 gap-2">
              {inMatch.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOut(id)}
                  className="min-h-14 rounded-xl border bg-card px-3 text-left font-semibold hover:bg-muted"
                >
                  {names(id)}
                </button>
              ))}
            </div>
          ) : (
            <ul className="grid gap-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    className="flex min-h-14 w-full items-center justify-between rounded-xl border bg-card px-4 text-left font-semibold hover:bg-muted"
                  >
                    {names(c.id)}
                    <span
                      className={cn(
                        'text-xs font-semibold text-muted-foreground',
                        c.place === 'Resting' && 'text-success',
                      )}
                    >
                      {c.place}
                    </span>
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="text-sm text-muted-foreground">No one else is available to swap in.</li>
              )}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
