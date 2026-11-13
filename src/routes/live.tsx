import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { CheckCheck, Coffee, Eye, Flag, Pause, Play, Plus, Radio, Share2, Shuffle, Trophy } from 'lucide-react'
import {
  completeRound,
  computeStandings,
  currentRound,
  elapsedRoundMs,
  pauseSession,
  projectUpcoming,
  resumeSession,
  scoringSummary,
  setupSummary,
  startRound,
  switchToMexicano,
} from '@/engine'
import type { Round, Tournament } from '@/engine'
import { Button } from '@/components/ui/button'
import { CourtCard } from '@/components/padel/court-card'
import { RoundSummary } from '@/components/padel/round-summary'
import { EmptyState, Panel } from '@/components/padel/section'
import { StatusPill } from '@/components/padel/status-pill'
import { StandingsTable } from '@/components/padel/standings-table'
import { FORMAT_LABEL, PHASE_LABEL, formatClock, sessionLink } from '@/lib/format'
import { shareOrCopy } from '@/lib/share'
import { usePlayerNames, useSession } from '@/lib/session-store'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/live')({
  head: () => ({ meta: [{ title: 'Live · Padel Friday' }] }),
  validateSearch: (s: Record<string, unknown>): { session?: string } =>
    typeof s.session === 'string' ? { session: s.session } : {},
  component: Live,
})

function Live() {
  const { tournament: t } = useSession()
  const { session } = Route.useSearch()

  if (session && (!t || t.id !== session)) {
    return (
      <EmptyState
        icon={<Radio className="size-6" />}
        title="Session not on this device"
        body="This live link points to a session that isn’t loaded here. Ask the host to share the link again, or start your own."
        action={
          <Button asChild size="xl">
            <Link to="/setup">New tournament</Link>
          </Button>
        }
      />
    )
  }
  if (!t) {
    return (
      <EmptyState
        icon={<Radio className="size-6" />}
        title="No live session"
        body="Create a tournament to get courts, scores and rotations here."
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
  return <LiveDashboard t={t} />
}

function RoundClock({ t, round }: { t: Tournament; round: Round }) {
  const now = useNow()
  if (!round.startedAt || now === null) {
    return <span className="tabular font-display text-5xl font-bold">{t.config.matchMode === 'timed' ? formatClock(t.config.roundMinutes * 60000) : '0:00'}</span>
  }
  const elapsed = elapsedRoundMs(round, now)
  const timed = t.config.matchMode === 'timed'
  const remaining = t.config.roundMinutes * 60000 - elapsed
  return (
    <span className={cn('tabular font-display text-5xl font-bold', timed && remaining <= 0 && 'text-destructive')} aria-live="off">
      {timed ? (remaining > 0 ? formatClock(remaining) : `+${formatClock(-remaining)}`) : formatClock(elapsed)}
    </span>
  )
}

function LiveDashboard({ t }: { t: Tournament }) {
  const { isHost, apply, finishSession } = useSession()
  const names = usePlayerNames(t)
  const round = currentRound(t)
  const standings = useMemo(() => computeStandings(t), [t])
  const upcoming = useMemo(() => projectUpcoming(t, 1, Date.now()), [t])
  const active = t.players.filter((p) => p.status === 'active').length
  const est = setupSummary(active, t.config).estimatedRounds
  const allScored = round ? round.matches.every((m) => m.status === 'completed') : false

  const share = () =>
    shareOrCopy({ title: `${t.config.name} · Padel Friday`, text: 'Follow the live scores and standings', url: sessionLink(t) })

  if (t.status === 'finished') {
    const podium = standings.slice(0, 3)
    return (
      <div className="space-y-4">
        <section className="court-lines rounded-3xl bg-court p-6 text-center text-court-foreground">
          <Trophy className="mx-auto size-10 text-ball" />
          <p className="mt-2 text-xs font-bold tracking-[0.2em] uppercase opacity-70">Final results</p>
          <h1 className="font-display text-4xl font-extrabold uppercase">{t.config.name}</h1>
          <div className="mt-5 grid grid-cols-3 items-end gap-2">
            {[podium[1], podium[0], podium[2]].map((r, i) =>
              r ? (
                <div key={r.playerId} className={cn('rounded-2xl bg-white/10 p-3', i === 1 && 'bg-ball text-ball-foreground pb-6')}>
                  <p className="font-display text-3xl font-extrabold">{r.rank}</p>
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs opacity-80">{r.points} pts</p>
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <Button size="xl" variant="outline" onClick={share}>
            <Share2 /> Share
          </Button>
          <Button asChild size="xl">
            <Link to="/setup">
              <Plus /> New session
            </Link>
          </Button>
        </div>
        <Panel title="Final standings">
          <StandingsTable rows={standings} compact highlightAverage={t.config.rankingRule === 'average'} />
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!isHost && (
        <div className="flex items-center gap-2 rounded-xl border border-ball/40 bg-ball/10 px-4 py-3 text-sm font-medium">
          <Eye className="size-4" /> Viewing only — the host enters scores and manages rounds.
        </div>
      )}

      <section className="court-lines overflow-hidden rounded-3xl bg-court p-5 text-court-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-70">
              {FORMAT_LABEL[t.config.format]} · {scoringSummary(t.config)}
            </p>
            <h1 className="truncate font-display text-4xl leading-tight font-extrabold uppercase">{t.config.name}</h1>
          </div>
          <StatusPill status={t.status} viewer={!isHost} className="shrink-0 border-white/20 bg-white/10" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase opacity-70">
              Round {round ? round.index + 1 : '–'} <span className="opacity-70">of ~{Math.max(est, round ? round.index + 1 : 0)}</span>
            </p>
            {round ? <RoundClock t={t} round={round} /> : <span className="font-display text-5xl font-bold">–</span>}
          </div>
          {round && (
            <span className="rounded-full bg-ball px-3 py-1.5 text-sm font-bold text-ball-foreground">
              {PHASE_LABEL[round.phase]} phase
            </span>
          )}
        </div>

        {t.config.format === 'hybrid' && (
          <p className="mt-3 text-sm opacity-80">
            {t.hybridSwitchRound !== null
              ? `Mexicano since round ${t.hybridSwitchRound + 1} — pairings follow the standings.`
              : t.config.hybridTrigger === 'rounds'
                ? `Switches to Mexicano after round ${t.config.hybridAfterRounds}.`
                : t.config.hybridTrigger === 'time'
                  ? `Switches to Mexicano after ${t.config.hybridAfterMinutes} minutes.`
                  : 'Switch to Mexicano whenever you’re ready.'}
          </p>
        )}

        {isHost && round && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {round.status === 'scheduled' ? (
              <Button size="xl" className="col-span-2 bg-ball text-ball-foreground hover:bg-ball/90" onClick={() => apply((x) => startRound(x, round.index, Date.now()), `Round ${round.index + 1} started`)}>
                <Play /> Start round {round.index + 1}
              </Button>
            ) : allScored ? (
              <Button
                size="xl"
                className="col-span-2 bg-ball text-ball-foreground hover:bg-ball/90"
                onClick={() => apply((x) => completeRound(x, round.index, Date.now()), `Round ${round.index + 1} complete`)}
              >
                <CheckCheck /> Complete round {round.index + 1}
              </Button>
            ) : t.status === 'paused' ? (
              <Button size="xl" className="col-span-2 bg-ball text-ball-foreground hover:bg-ball/90" onClick={() => apply((x) => resumeSession(x, Date.now()))}>
                <Play /> Resume
              </Button>
            ) : (
              <Button size="xl" variant="outline" className="col-span-2 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:bg-white/10" onClick={() => apply((x) => pauseSession(x, Date.now()))}>
                <Pause /> Pause
              </Button>
            )}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Button size="lg" variant="outline" className="h-12 flex-1" onClick={share}>
          <Share2 /> Share live link
        </Button>
        {isHost && t.config.format === 'hybrid' && t.hybridSwitchRound === null && (
          <Button size="lg" variant="outline" className="h-12 flex-1" onClick={() => apply(switchToMexicano, 'Switched to Mexicano from the next unstarted round')}>
            <Shuffle /> Switch to Mexicano
          </Button>
        )}
      </div>

      {!round || round.matches.length === 0 ? (
        <EmptyState
          icon={<Coffee className="size-6" />}
          title="Not enough players"
          body="At least 4 available players are needed for a round. Add a late arrival or bring someone back in Settings."
          action={
            isHost ? (
              <Button asChild size="xl">
                <Link to="/settings">Manage players</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {round.matches.map((m) => (
            <CourtCard key={`${m.id}:${m.teamA.join()}:${m.teamB.join()}:${m.status}`} t={t} round={round} match={m} />
          ))}
          {t.config.courts > round.matches.length && (
            <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
              {t.config.courts - round.matches.length} court{t.config.courts - round.matches.length > 1 ? 's' : ''} idle this round
            </div>
          )}
        </div>
      )}

      {round && round.resting.length > 0 && (
        <Panel title={`Resting · ${round.resting.length}`}>
          <div className="flex flex-wrap gap-2">
            {round.resting.map((id) => (
              <span key={id} className="inline-flex h-10 items-center gap-2 rounded-full bg-muted px-4 font-semibold">
                <Coffee className="size-4 text-muted-foreground" /> {names(id)}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <div>
        <h2 className="mb-2 font-display text-2xl font-bold uppercase">Next up</h2>
        {upcoming[0] ? (
          <RoundSummary t={t} round={upcoming[0]} projected />
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Awaiting results</p>
            Mexicano pairings are set from the standings once this round’s scores are in.
          </div>
        )}
      </div>

      <Panel
        title="Top of the table"
        action={
          <Link to="/standings" className="text-sm font-semibold text-primary dark:text-ball">
            Full standings
          </Link>
        }
      >
        <StandingsTable rows={standings.slice(0, 5)} compact highlightAverage={t.config.rankingRule === 'average'} />
      </Panel>

      {isHost && (
        <Button
          size="xl"
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            if (window.confirm('Finish the session? Unplayed matches are dropped; all scores are kept.')) finishSession()
          }}
        >
          <Flag /> Finish session
        </Button>
      )}
    </div>
  )
}
