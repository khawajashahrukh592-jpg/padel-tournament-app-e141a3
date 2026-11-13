import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CalendarClock, Pencil, Plus } from 'lucide-react'
import { currentRound, projectUpcoming } from '@/engine'
import type { Round, Tournament } from '@/engine'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CourtCard } from '@/components/padel/court-card'
import { RoundSummary } from '@/components/padel/round-summary'
import { EmptyState, PageTitle } from '@/components/padel/section'
import { useSession } from '@/lib/session-store'

export const Route = createFileRoute('/matches')({
  head: () => ({ meta: [{ title: 'Matches · Padel Friday' }] }),
  component: Matches,
})

function Matches() {
  const { tournament: t } = useSession()
  const upcoming = useMemo(() => (t ? projectUpcoming(t, 3, Date.now()) : []), [t])

  if (!t) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-6" />}
        title="No fixtures"
        body="Fixtures are generated round by round once a session starts."
        action={
          <Button asChild size="xl">
            <Link to="/setup">
              <Plus /> New tournament
            </Link>
          </Button>
        }
      />
    )
  }

  const round = currentRound(t)
  const current = round && round.status !== 'completed' ? round : null
  const completed = t.rounds.filter((r) => r.status === 'completed').reverse()

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={t.config.name} title="Matches" />
      <Tabs defaultValue={current ? 'upcoming' : 'completed'}>
        <TabsList className="grid h-12 w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="h-10 text-sm font-semibold">Current & upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="h-10 text-sm font-semibold">Completed · {completed.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {current && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold uppercase">
                Round {current.index + 1} · {current.status === 'scheduled' ? 'ready' : 'in play'}
              </h2>
              {current.matches.map((m) => (
                <CourtCard key={`${m.id}:${m.teamA.join()}:${m.teamB.join()}:${m.status}`} t={t} round={current} match={m} compact />
              ))}
            </div>
          )}
          {t.status !== 'finished' &&
            (upcoming.length > 0 ? (
              <div className="space-y-3">
                <h2 className="font-display text-2xl font-bold uppercase">Planned</h2>
                <p className="text-sm text-muted-foreground">
                  Planned rounds update automatically when players arrive, leave or change preference.
                </p>
                {upcoming.map((r) => (
                  <RoundSummary key={r.index} t={t} round={r} projected />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Awaiting results</p>
                Mexicano rounds are drawn from the standings after each round, so later fixtures aren’t fixed yet.
              </div>
            ))}
          {t.status === 'finished' && <p className="text-sm text-muted-foreground">This session has finished.</p>}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No completed rounds yet.</p>
          ) : (
            completed.map((r) => <CompletedRound key={r.index} t={t} round={r} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CompletedRound({ t, round }: { t: Tournament; round: Round }) {
  const { isHost } = useSession()
  const [editing, setEditing] = useState(false)
  if (!editing) {
    return (
      <div>
        <RoundSummary t={t} round={round} />
        {isHost && (
          <Button variant="ghost" size="sm" className="mt-1" onClick={() => setEditing(true)}>
            <Pencil /> Edit round {round.index + 1} scores
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-2 rounded-2xl bg-muted/50 p-2">
      <div className="flex items-center justify-between px-2 pt-1">
        <h3 className="font-display text-xl font-bold uppercase">Editing round {round.index + 1}</h3>
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
          Done
        </Button>
      </div>
      {round.matches.map((m) => (
        <CourtCard key={`${m.id}:${m.scoreA}:${m.scoreB}`} t={t} round={round} match={m} compact />
      ))}
    </div>
  )
}
