import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { BarChart3, ImageDown, Plus } from 'lucide-react'
import { computeStandings, updateConfig } from '@/engine'
import type { RankingRule } from '@/engine'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/padel/segmented'
import { EmptyState, PageTitle } from '@/components/padel/section'
import { StandingsTable } from '@/components/padel/standings-table'
import { exportStandingsImage } from '@/lib/export-image'
import { FORMAT_LABEL } from '@/lib/format'
import { useSession } from '@/lib/session-store'

export const Route = createFileRoute('/standings')({
  head: () => ({ meta: [{ title: 'Standings · Padel Friday' }] }),
  component: Standings,
})

function Standings() {
  const { tournament: t, isHost, apply } = useSession()
  const rows = useMemo(() => (t ? computeStandings(t) : []), [t])

  if (!t) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-6" />}
        title="No standings yet"
        body="Standings appear as soon as the first scores are in."
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

  const completed = t.rounds.filter((r) => r.status === 'completed').length
  const unequal = new Set(rows.filter((r) => r.status === 'active').map((r) => r.played)).size > 1
  const byAverage = t.config.rankingRule === 'average'

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={`${FORMAT_LABEL[t.config.format]} · after ${completed} round${completed === 1 ? '' : 's'}`} title="Standings">
        <Button
          variant="outline"
          size="lg"
          className="h-11"
          onClick={() =>
            exportStandingsImage(t.config.name, `${FORMAT_LABEL[t.config.format]} · ${completed} rounds · ${t.players.length} players`, rows)
          }
        >
          <ImageDown /> Export image
        </Button>
      </PageTitle>

      {isHost && t.status !== 'finished' ? (
        <div>
          <p className="mb-2 text-sm font-semibold">Rank by</p>
          <Segmented<RankingRule>
            label="Ranking rule"
            value={t.config.rankingRule}
            onChange={(rankingRule) => apply((x) => updateConfig(x, { rankingRule }))}
            options={[
              { value: 'total', label: 'Total points' },
              { value: 'average', label: 'Avg per match' },
            ]}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Ranked by {byAverage ? 'average points per match' : 'total points'}.</p>
      )}

      {unequal && !byAverage && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Players have played different numbers of matches. Switch to <strong className="text-foreground">Avg per match</strong> for a ranking that doesn’t reward extra games.
        </p>
      )}

      <StandingsTable rows={rows} highlightAverage={byAverage} />

      <p className="text-xs text-muted-foreground">
        Ties are broken by {byAverage ? 'total points' : 'average per match'}, then point difference, then wins, then name. Players on the same numbers share a rank.
      </p>
    </div>
  )
}
