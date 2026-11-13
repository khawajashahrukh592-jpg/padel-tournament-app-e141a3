import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { RefreshCw, Shield, Shuffle, Trash2, UserPlus } from 'lucide-react'
import {
  addPlayer,
  currentRound,
  regenerateUnstarted,
  setPlayerStatus,
  setPreference,
  switchToMexicano,
  updateConfig,
} from '@/engine'
import type { PlayerStatus, Preference } from '@/engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Segmented } from '@/components/padel/segmented'
import { Stepper } from '@/components/padel/stepper'
import { PageTitle, Panel } from '@/components/padel/section'
import { PREFERENCE_LABEL } from '@/lib/format'
import { newId, useSession } from '@/lib/session-store'
import { useTheme } from '@/lib/theme'
import type { ThemeChoice } from '@/lib/theme'

export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: 'Settings · Padel Friday' }] }),
  component: Settings,
})

const POINTS = [16, 21, 24, 32]

function Settings() {
  const { tournament: t, isHost, setViewerPreview, apply, savedPlayers, removeSavedPlayer } = useSession()
  const { theme, setTheme } = useTheme()
  const [late, setLate] = useState('')
  const editable = !!t && isHost && t.status !== 'finished'
  const round = t ? currentRound(t) : null

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Host controls & preferences" title="Settings" />

      <Panel title="Access">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-ball/20 text-primary dark:text-ball">
            <Shield className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{isHost ? 'You’re the host on this device' : 'Viewer mode'}</p>
            <p className="text-sm text-muted-foreground">
              Hosts enter scores, swap players and manage rounds. Everyone with the live link gets a read-only dashboard.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-4 py-3">
          <Label htmlFor="viewer-preview" className="text-sm font-semibold">Preview as a viewer</Label>
          <Switch id="viewer-preview" checked={!isHost} onCheckedChange={setViewerPreview} />
        </div>
      </Panel>

      {editable && t && (
        <>
          <Panel title={`Players · ${t.players.filter((p) => p.status === 'active').length} active`}>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (apply((x) => addPlayer(x, { id: newId('p-'), name: late, preference: 'balanced' }), `${late.trim()} joins from the next round`)) setLate('')
              }}
            >
              <Input value={late} onChange={(e) => setLate(e.target.value)} placeholder="Late arrival name" aria-label="Late arrival name" className="h-12 flex-1 text-base" />
              <Button type="submit" size="xl" className="h-12" disabled={!late.trim()}>
                <UserPlus /> Add
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Changes apply to the next unstarted round. Completed results never change.
            </p>
            <ul className="mt-3 divide-y rounded-xl border">
              {t.players.map((p) => (
                <li key={p.id} className="space-y-2 px-3 py-3">
                  <p className="font-semibold">{p.name}</p>
                  <Segmented<PlayerStatus>
                    size="sm"
                    label={`${p.name} availability`}
                    value={p.status}
                    onChange={(status) =>
                      apply(
                        (x) => setPlayerStatus(x, p.id, status),
                        status === 'active' ? `${p.name} is back in` : status === 'left' ? `${p.name} has left` : `${p.name} is sitting out`,
                      )
                    }
                    options={[
                      { value: 'active', label: 'Playing' },
                      { value: 'unavailable', label: 'Away' },
                      { value: 'left', label: 'Left' },
                    ]}
                  />
                  {p.status === 'active' && (
                    <Segmented<Preference>
                      size="sm"
                      label={`${p.name} preference`}
                      value={p.preference}
                      onChange={(pref) => apply((x) => setPreference(x, p.id, pref))}
                      options={(['less', 'balanced', 'more'] as Preference[]).map((v) => ({ value: v, label: PREFERENCE_LABEL[v] }))}
                    />
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Session rules">
            <div className="space-y-5">
              {t.config.matchMode === 'points' && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Points per match</p>
                  <Segmented
                    label="Points per match"
                    value={t.config.pointsPerMatch}
                    onChange={(pointsPerMatch) => apply((x) => updateConfig(x, { pointsPerMatch }), `Now playing to ${pointsPerMatch}`)}
                    options={POINTS.map((p) => ({ value: p, label: String(p) }))}
                  />
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-semibold">Round length</p>
                <Stepper label="round minutes" suffix="min" value={t.config.roundMinutes} min={5} max={60} onChange={(roundMinutes) => apply((x) => updateConfig(x, { roundMinutes }))} />
              </div>
              {(t.config.format === 'mexicano' || t.config.format === 'hybrid') && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Mexicano pairing</p>
                  <Segmented
                    label="Mexicano pairing"
                    value={t.config.mexicanoPairing}
                    onChange={(mexicanoPairing) => apply((x) => updateConfig(x, { mexicanoPairing }))}
                    options={[
                      { value: 'standard', label: 'Standard', hint: 'similar ranks' },
                      { value: 'balanced', label: 'Balanced', hint: 'top with bottom' },
                    ]}
                  />
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  size="xl"
                  variant="outline"
                  disabled={round?.status !== 'scheduled'}
                  onClick={() => apply(regenerateUnstarted, `Round ${round!.index + 1} regenerated`)}
                >
                  <RefreshCw /> Regenerate next round
                </Button>
                {t.config.format === 'hybrid' && t.hybridSwitchRound === null && (
                  <Button size="xl" variant="outline" onClick={() => apply(switchToMexicano, 'Switched to Mexicano')}>
                    <Shuffle /> Switch to Mexicano now
                  </Button>
                )}
              </div>
              {round?.status !== 'scheduled' && (
                <p className="text-xs text-muted-foreground">Regenerating is available before a round starts. Use Swap on a court for in-play changes.</p>
              )}
            </div>
          </Panel>
        </>
      )}

      <Panel title="Appearance">
        <Segmented<ThemeChoice>
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Panel>

      <Panel title={`Frequent players · ${savedPlayers.length}`}>
        {savedPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Star a player during setup to save them here.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {savedPlayers.map((p) => (
              <li key={p.id} className="inline-flex h-10 items-center gap-1 rounded-full border bg-background pr-1 pl-4 text-sm font-semibold">
                {p.name}
                <button
                  type="button"
                  onClick={() => removeSavedPlayer(p.id)}
                  aria-label={`Remove ${p.name} from frequent players`}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
