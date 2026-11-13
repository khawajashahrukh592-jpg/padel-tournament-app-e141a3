import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Copy, History as HistoryIcon, ImageDown, ListChecks, Plus, Share2, Trophy, Users } from 'lucide-react'
import { computeStandings } from '@/engine'
import type { Tournament } from '@/engine'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState, PageTitle } from '@/components/padel/section'
import { StandingsTable } from '@/components/padel/standings-table'
import { exportStandingsImage } from '@/lib/export-image'
import { FORMAT_LABEL, formatDate, scoringLine } from '@/lib/format'
import { shareOrCopy } from '@/lib/share'
import { newId, useSession } from '@/lib/session-store'
import { toast } from 'sonner'

export const Route = createFileRoute('/history')({
  head: () => ({ meta: [{ title: 'History · Padel Friday' }] }),
  component: HistoryPage,
})

function resultsText(t: Tournament) {
  const rows = computeStandings(t)
  const lines = rows.slice(0, 8).map((r) => `${r.rank}. ${r.name} — ${r.points} pts (${r.played} played)`)
  return `${t.config.name} · ${FORMAT_LABEL[t.config.format]} · ${formatDate(t.createdAt)}\n\n${lines.join('\n')}`
}

function HistoryPage() {
  const { past, setDraft } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Tournament | null>(null)

  const reusePlayers = (t: Tournament) => {
    setDraft((d) => ({
      ...d,
      players: t.players.map((p) => ({ id: newId('p-'), name: p.name, preference: p.preference })),
    }))
    toast.success(`${t.players.length} players added to setup`)
    navigate({ to: '/setup' })
  }
  const duplicate = (t: Tournament) => {
    setDraft((d) => ({ ...d, config: { ...t.config, name: t.config.name } }))
    toast.success('Settings copied — add players and start')
    navigate({ to: '/setup' })
  }
  const exportImage = (t: Tournament) =>
    exportStandingsImage(t.config.name, `${FORMAT_LABEL[t.config.format]} · ${formatDate(t.createdAt)}`, computeStandings(t))

  if (past.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon className="size-6" />}
        title="No past sessions"
        body="Finished sessions land here with their final standings."
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

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={`${past.length} sessions`} title="History" />
      <ul className="grid gap-3">
        {past.map((t) => {
          const rows = computeStandings(t)
          const rounds = t.rounds.filter((r) => r.status === 'completed').length
          return (
            <li key={t.id} className="rounded-2xl border bg-card">
              <button type="button" onClick={() => setOpen(t)} className="block w-full p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{formatDate(t.createdAt)}</p>
                    <h2 className="truncate font-display text-2xl font-bold uppercase">{t.config.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {FORMAT_LABEL[t.config.format]} · {t.players.length} players · {rounds} rounds · {scoringLine(t)}
                    </p>
                  </div>
                  <Trophy className="size-6 shrink-0 text-chart-4" />
                </div>
                <ol className="mt-3 grid grid-cols-3 gap-2">
                  {rows.slice(0, 3).map((r) => (
                    <li key={r.playerId} className="rounded-xl bg-muted px-3 py-2">
                      <p className="text-[11px] font-bold text-muted-foreground">#{r.rank}</p>
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.points} pts</p>
                    </li>
                  ))}
                </ol>
              </button>
              <div className="grid grid-cols-2 gap-1 border-t p-2 sm:grid-cols-4">
                <Button variant="ghost" size="lg" onClick={() => reusePlayers(t)}>
                  <Users /> Reuse players
                </Button>
                <Button variant="ghost" size="lg" onClick={() => duplicate(t)}>
                  <Copy /> Duplicate
                </Button>
                <Button variant="ghost" size="lg" onClick={() => shareOrCopy({ title: t.config.name, text: resultsText(t) })}>
                  <Share2 /> Share
                </Button>
                <Button variant="ghost" size="lg" onClick={() => exportImage(t)}>
                  <ImageDown /> Image
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl uppercase">{open.config.name}</DialogTitle>
                <DialogDescription>
                  {formatDate(open.createdAt)} · {FORMAT_LABEL[open.config.format]} · {open.config.courts} courts · {scoringLine(open)}
                </DialogDescription>
              </DialogHeader>
              <StandingsTable rows={computeStandings(open)} highlightAverage={open.config.rankingRule === 'average'} />
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant="outline" onClick={() => exportImage(open)}>
                  <ImageDown /> Export image
                </Button>
                <Button size="lg" onClick={() => duplicate(open)}>
                  <ListChecks /> Use these settings
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
