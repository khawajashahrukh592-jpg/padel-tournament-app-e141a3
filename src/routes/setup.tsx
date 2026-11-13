import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, Play, Plus, Star, UserPlus, X } from 'lucide-react'
import { TournamentError, createTournament, setupSummary } from '@/engine'
import type { Format, MatchMode, Preference, TournamentConfig } from '@/engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/padel/segmented'
import { Stepper } from '@/components/padel/stepper'
import { PageTitle, Panel } from '@/components/padel/section'
import { FORMAT_BLURB, FORMAT_LABEL, PREFERENCE_LABEL } from '@/lib/format'
import { EMPTY_DRAFT, newId, useSession } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/setup')({
  head: () => ({ meta: [{ title: 'New tournament · Padel Friday' }] }),
  component: Setup,
})

const DURATIONS = [90, 120, 180]
const POINTS = [16, 21, 24, 32]
const FORMATS: Format[] = ['americano', 'mexicano', 'hybrid', 'regular']

function Setup() {
  const { draft, setDraft, savedPlayers, savePlayer, startSession } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [customDuration, setCustomDuration] = useState(!DURATIONS.includes(draft.config.durationMinutes))
  const { config, players } = draft
  const summary = setupSummary(players.length, config)

  const patch = (p: Partial<TournamentConfig>) => setDraft((d) => ({ ...d, config: { ...d.config, ...p } }))

  const addPlayer = (raw: string, preference: Preference = 'balanced') => {
    const n = raw.trim()
    if (!n) return
    if (players.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      toast.error(`${n} is already on the list.`)
      return
    }
    setDraft((d) => ({ ...d, players: [...d.players, { id: newId('p-'), name: n, preference }] }))
  }
  const setPref = (id: string, preference: Preference) =>
    setDraft((d) => ({ ...d, players: d.players.map((p) => (p.id === id ? { ...p, preference } : p)) }))
  const remove = (id: string) => setDraft((d) => ({ ...d, players: d.players.filter((p) => p.id !== id) }))

  const availableSaved = savedPlayers.filter((s) => !players.some((p) => p.name.toLowerCase() === s.name.toLowerCase()))
  const isSaved = (n: string) => savedPlayers.some((s) => s.name.toLowerCase() === n.toLowerCase())

  const changeFormat = (format: Format) => {
    const p: Partial<TournamentConfig> = { format }
    if (format !== 'regular' && config.matchMode === 'games') p.matchMode = 'points'
    if (format === 'regular' && config.matchMode === 'points') p.matchMode = 'games'
    patch(p)
  }

  const start = () => {
    try {
      const t = createTournament(newId('pf-'), { ...config, seed: Math.floor(Math.random() * 1e6) }, players, Date.now())
      startSession(t)
      setDraft(() => ({ ...EMPTY_DRAFT, players: [] }))
      toast.success('Session created — round 1 is ready.')
      navigate({ to: '/live' })
    } catch (e) {
      toast.error(e instanceof TournamentError ? e.message : 'Couldn’t create the session.')
    }
  }

  const modeOptions: Array<{ value: MatchMode; label: string }> =
    config.format === 'regular'
      ? [
          { value: 'games', label: 'Games' },
          { value: 'timed', label: 'Timed' },
        ]
      : [
          { value: 'points', label: 'Points' },
          { value: 'timed', label: 'Timed' },
        ]

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Setup" title="New tournament" />

      <Panel>
        <Label htmlFor="session-name" className="mb-2 text-sm font-semibold">Session name</Label>
        <Input
          id="session-name"
          value={config.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-12 text-base"
          placeholder="Friday Session"
        />
      </Panel>

      <Panel title={`Players · ${players.length}`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addPlayer(name)
            setName('')
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a player name"
            aria-label="Player name"
            className="h-12 flex-1 text-base"
            autoComplete="off"
            enterKeyHint="done"
          />
          <Button type="submit" size="xl" className="h-12" disabled={!name.trim()}>
            <UserPlus /> Add
          </Button>
        </form>

        {availableSaved.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Frequent players</p>
              <button
                type="button"
                className="text-sm font-semibold text-primary dark:text-ball"
                onClick={() => availableSaved.forEach((s) => addPlayer(s.name, s.preference))}
              >
                Add all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSaved.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addPlayer(s.name, s.preference)}
                  className="inline-flex h-10 items-center gap-1 rounded-full border bg-background px-3.5 text-sm font-semibold hover:bg-muted"
                >
                  <Plus className="size-4" /> {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {players.length > 0 ? (
          <ul className="mt-4 divide-y rounded-xl border">
            {players.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <span className="tabular w-6 text-sm font-bold text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <button
                  type="button"
                  onClick={() => savePlayer({ name: p.name, preference: p.preference })}
                  disabled={isSaved(p.name)}
                  aria-label={isSaved(p.name) ? `${p.name} is a frequent player` : `Save ${p.name} as a frequent player`}
                  className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:text-chart-4"
                >
                  <Star className={cn('size-5', isSaved(p.name) && 'fill-current')} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <X className="size-5" />
                </button>
                <Segmented
                  className="w-full"
                  size="sm"
                  label={`${p.name} playing preference`}
                  value={p.preference}
                  onChange={(v) => setPref(p.id, v)}
                  options={(['less', 'balanced', 'more'] as Preference[]).map((v) => ({ value: v, label: PREFERENCE_LABEL[v] }))}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Add at least 4 players. Odd numbers are fine — the scheduler rotates rests fairly.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Courts">
          <Stepper label="courts" value={config.courts} min={1} max={8} onChange={(courts) => patch({ courts })} />
        </Panel>
        <Panel title="Duration">
          <Segmented
            label="Session duration"
            value={customDuration ? 0 : config.durationMinutes}
            onChange={(v) => {
              if (v === 0) setCustomDuration(true)
              else {
                setCustomDuration(false)
                patch({ durationMinutes: v })
              }
            }}
            options={[...DURATIONS.map((d) => ({ value: d, label: `${d}m` })), { value: 0, label: 'Custom' }]}
          />
          {customDuration && (
            <Stepper
              className="mt-3"
              label="duration in minutes"
              suffix="min"
              value={config.durationMinutes}
              min={20}
              max={480}
              step={10}
              onChange={(durationMinutes) => patch({ durationMinutes })}
            />
          )}
        </Panel>
      </div>

      <Panel title="Format">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tournament format">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={config.format === f}
              onClick={() => changeFormat(f)}
              className={cn(
                'rounded-xl border-2 p-3 text-left transition-colors motion-reduce:transition-none',
                config.format === f ? 'border-primary bg-primary/5 dark:border-ball dark:bg-ball/10' : 'border-border hover:bg-muted/60',
              )}
            >
              <p className="font-display text-xl font-bold uppercase">{FORMAT_LABEL[f]}</p>
              <p className="text-xs text-muted-foreground">{FORMAT_BLURB[f]}</p>
            </button>
          ))}
        </div>

        {config.format === 'hybrid' && (
          <div className="mt-4 space-y-3 rounded-xl bg-muted/60 p-3">
            <p className="text-sm font-semibold">Switch to Mexicano</p>
            <Segmented
              label="Hybrid switch trigger"
              value={config.hybridTrigger}
              onChange={(hybridTrigger) => patch({ hybridTrigger })}
              options={[
                { value: 'rounds', label: 'After rounds' },
                { value: 'time', label: 'After time' },
                { value: 'manual', label: 'Manually' },
              ]}
            />
            {config.hybridTrigger === 'rounds' && (
              <Stepper label="Americano rounds before switching" suffix="rounds" value={config.hybridAfterRounds} min={1} max={20} onChange={(hybridAfterRounds) => patch({ hybridAfterRounds })} />
            )}
            {config.hybridTrigger === 'time' && (
              <Stepper label="minutes before switching" suffix="min" value={config.hybridAfterMinutes} min={10} max={240} step={5} onChange={(hybridAfterMinutes) => patch({ hybridAfterMinutes })} />
            )}
            {config.hybridTrigger === 'manual' && (
              <p className="text-xs text-muted-foreground">Use “Switch to Mexicano” on the Live screen whenever you’re ready.</p>
            )}
          </div>
        )}

        {(config.format === 'mexicano' || config.format === 'hybrid') && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Mexicano pairing</p>
            <Segmented
              label="Mexicano pairing"
              value={config.mexicanoPairing}
              onChange={(mexicanoPairing) => patch({ mexicanoPairing })}
              options={[
                { value: 'standard', label: 'Standard', hint: 'similar ranks' },
                { value: 'balanced', label: 'Balanced', hint: 'top with bottom' },
              ]}
            />
          </div>
        )}
      </Panel>

      <Panel title="Scoring">
        <Segmented label="Match type" value={config.matchMode} onChange={(matchMode) => patch({ matchMode })} options={modeOptions} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {config.matchMode === 'points' && (
            <div>
              <p className="mb-2 text-sm font-semibold">Points per match</p>
              <Segmented
                label="Points per match"
                value={config.pointsPerMatch}
                onChange={(pointsPerMatch) => patch({ pointsPerMatch })}
                options={POINTS.map((p) => ({ value: p, label: String(p) }))}
              />
            </div>
          )}
          {config.matchMode === 'games' && (
            <div>
              <p className="mb-2 text-sm font-semibold">Games to win</p>
              <Stepper label="games to win" value={config.gamesToWin} min={2} max={9} onChange={(gamesToWin) => patch({ gamesToWin })} />
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">{config.matchMode === 'timed' ? 'Round length' : 'Estimated match length'}</p>
            <Stepper label="round minutes" suffix="min" value={config.roundMinutes} min={5} max={60} onChange={(roundMinutes) => patch({ roundMinutes })} />
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-20 z-30 rounded-2xl border bg-court p-4 text-court-foreground shadow-xl">
        <dl className="grid grid-cols-4 gap-2 text-center">
          <Summary label="Courts" value={summary.activeCourts} />
          <Summary label="Playing" value={summary.playersPerRound} />
          <Summary label="Resting" value={summary.resting} />
          <Summary label="Rounds" value={`~${summary.estimatedRounds}`} />
        </dl>
        {summary.warnings.map((w) => (
          <p key={w} className="mt-2 flex items-center gap-2 text-xs font-medium text-white/80">
            <AlertTriangle className="size-4 shrink-0 text-ball" /> {w}
          </p>
        ))}
        {players.length >= 4 && (
          <p className="mt-2 text-center text-xs text-white/70">About {summary.gamesPerPlayer} games each · {summary.slotMinutes} min per round incl. changeover</p>
        )}
        <Button size="xl" className="mt-3 w-full bg-ball text-ball-foreground hover:bg-ball/90" disabled={players.length < 4} onClick={start}>
          <Play /> Start session
        </Button>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-wider text-white/60 uppercase">{label}</dt>
      <dd className="tabular font-display text-3xl leading-tight font-bold">{value}</dd>
    </div>
  )
}
