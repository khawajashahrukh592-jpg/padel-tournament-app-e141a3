import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Clock, Plus, Radio, Shuffle, Trophy, Users } from 'lucide-react'
import { computeStandings, currentRound, setupSummary } from '@/engine'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/padel/status-pill'
import { FORMAT_LABEL, PHASE_LABEL, formatDate } from '@/lib/format'
import { useSession } from '@/lib/session-store'

export const Route = createFileRoute('/')({
  component: Home,
})

const HERO = '/.netlify/images?url=/img/hero-court.png&w=1200&fm=webp&q=70'

function Home() {
  const { tournament: t, past } = useSession()
  const round = t ? currentRound(t) : null
  const leader = t ? computeStandings(t)[0] : null
  const est = t ? setupSummary(t.players.filter((p) => p.status === 'active').length, t.config).estimatedRounds : 0
  const completedRounds = t ? t.rounds.filter((r) => r.status === 'completed').length : 0

  return (
    <div className="space-y-6">
      <section className="relative -mx-4 -mt-5 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl">
        <img
          src={HERO}
          alt=""
          className="absolute inset-0 size-full object-cover object-bottom"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1230] via-[#0b1230]/70 to-[#0b1230]/20" />
        <div className="relative px-5 pt-24 pb-7 text-white sm:px-8 sm:pt-32">
          <p className="mb-2 text-xs font-bold tracking-[0.22em] text-ball uppercase">Live padel sessions</p>
          <h1 className="font-display text-6xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-7xl">
            Padel <span className="text-ball">Friday</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-white/80">
            Fair rotations for any group size, Americano and Mexicano scoring, and live standings your
            players can follow from the bench.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="xl" className="bg-ball text-ball-foreground hover:bg-ball/90">
              <Link to="/setup">
                <Plus /> New tournament
              </Link>
            </Button>
            {t && t.status !== 'finished' && (
              <Button asChild size="xl" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:bg-white/10">
                <Link to="/live">
                  <Radio /> Resume live session
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {t && (
        <Link
          to="/live"
          className="block rounded-2xl border bg-card p-5 transition-colors hover:border-ring/60 motion-reduce:transition-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                {t.status === 'finished' ? 'Last session' : 'Current session'}
              </p>
              <h2 className="font-display text-3xl font-extrabold uppercase">{t.config.name}</h2>
              <p className="text-sm text-muted-foreground">
                {FORMAT_LABEL[t.config.format]}
                {round && t.config.format === 'hybrid' && ` · ${PHASE_LABEL[round.phase]} phase`} · {t.players.filter((p) => p.status === 'active').length} players ·{' '}
                {t.config.courts} courts
              </p>
            </div>
            <StatusPill status={t.status} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Round" value={round ? `${round.index + 1}` : '–'} sub={`of ~${est}`} />
            <Stat label="Played" value={`${completedRounds}`} sub="rounds" />
            <Stat label="Leader" value={leader && leader.played ? leader.name : '–'} sub={leader && leader.played ? `${leader.points} pts` : 'no scores yet'} />
          </div>
          <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary dark:text-ball">
            Open {t.status === 'finished' ? 'results' : 'live dashboard'} <ArrowRight className="size-4" />
          </p>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Feature icon={<Users />} title="Any group size" body="4 to 32+ players, odd numbers welcome." />
        <Feature icon={<Shuffle />} title="Fair rotations" body="Rests, partners and opponents spread evenly." />
        <Feature icon={<Trophy />} title="4 formats" body="Regular, Americano, Mexicano, Hybrid." />
        <Feature icon={<Clock />} title="Timed or points" body="Rounds by clock or points per match." />
      </section>

      {past.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold uppercase">Recent sessions</h2>
            <Link to="/history" className="text-sm font-semibold text-primary dark:text-ball">
              All history
            </Link>
          </div>
          <ul className="grid gap-2">
            {past.slice(0, 3).map((p) => {
              const winner = computeStandings(p)[0]
              return (
                <li key={p.id}>
                  <Link to="/history" className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/50">
                    <Trophy className="size-5 shrink-0 text-chart-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.config.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)} · {FORMAT_LABEL[p.config.format]} · {p.players.length} players
                      </p>
                    </div>
                    <span className="text-right text-sm">
                      <span className="block font-semibold">{winner?.name}</span>
                      <span className="text-xs text-muted-foreground">{winner?.points} pts</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2.5">
      <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="truncate font-display text-2xl leading-tight font-bold">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 grid size-10 place-items-center rounded-full bg-ball/20 text-primary dark:text-ball [&_svg]:size-5">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
