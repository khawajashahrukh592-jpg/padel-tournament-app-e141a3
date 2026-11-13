import { pointsAwarded } from './scoring'
import { unit } from './random'
import type { Round, StandingRow, Tournament } from './types'

export function roundMinutes(t: Tournament, round: Round): number {
  if (round.startedAt && round.completedAt) {
    const ms = round.completedAt - round.startedAt - round.pausedMs
    if (ms > 0) return Math.round(ms / 60000)
  }
  return t.config.roundMinutes
}

/** Leaderboard computed from completed matches only. Deterministic ordering. */
export function computeStandings(t: Tournament): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  for (const p of t.players) {
    rows.set(p.id, {
      rank: 0,
      playerId: p.id,
      name: p.name,
      points: 0,
      played: 0,
      average: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      rested: 0,
      courtMinutes: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      status: p.status,
    })
  }

  for (const round of t.rounds) {
    if (round.status === 'scheduled') continue
    const playing = new Set<string>()
    const minutes = roundMinutes(t, round)
    for (const m of round.matches) {
      for (const id of [...m.teamA, ...m.teamB]) playing.add(id)
      if (m.status !== 'completed' || m.scoreA === null || m.scoreB === null) continue
      const sides: Array<[string[], number, number]> = [
        [m.teamA, m.scoreA, m.scoreB],
        [m.teamB, m.scoreB, m.scoreA],
      ]
      for (const [team, forS, againstS] of sides) {
        for (const id of team) {
          const r = rows.get(id)
          if (!r) continue
          r.played++
          r.points += pointsAwarded(round.phase, forS, againstS)
          r.pointsFor += forS
          r.pointsAgainst += againstS
          r.courtMinutes += minutes
          if (forS > againstS) r.wins++
          else if (forS < againstS) r.losses++
          else r.draws++
        }
      }
    }
    for (const id of round.eligible) {
      if (!playing.has(id)) {
        const r = rows.get(id)
        if (r) r.rested++
      }
    }
  }

  const list = [...rows.values()]
  for (const r of list) {
    r.average = r.played ? Math.round((r.points / r.played) * 100) / 100 : 0
    r.diff = r.pointsFor - r.pointsAgainst
  }

  const byAverage = t.config.rankingRule === 'average'
  list.sort((a, b) => {
    const primary = byAverage ? b.average - a.average : b.points - a.points
    if (primary) return primary
    const secondary = byAverage ? b.points - a.points : b.average - a.average
    if (secondary) return secondary
    if (b.diff !== a.diff) return b.diff - a.diff
    if (b.wins !== a.wins) return b.wins - a.wins
    const n = a.name.localeCompare(b.name)
    return n || a.playerId.localeCompare(b.playerId)
  })

  // Shared rank for exact ties on the ranking metrics.
  list.forEach((r, i) => {
    const prev = list[i - 1]
    const tied =
      prev &&
      prev.points === r.points &&
      prev.average === r.average &&
      prev.diff === r.diff &&
      prev.wins === r.wins
    r.rank = tied ? prev.rank : i + 1
  })
  return list
}

/**
 * Ranking used for Mexicano pairing. Uses average points per match so players
 * who rested more are not penalised; players without games get the field median.
 */
export function mexicanoRanking(t: Tournament, ids: string[], roundIndex: number): string[] {
  const rows = new Map(computeStandings(t).map((r) => [r.playerId, r]))
  const avgs = ids
    .map((id) => rows.get(id))
    .filter((r): r is StandingRow => !!r && r.played > 0)
    .map((r) => r.points / r.played)
    .sort((a, b) => a - b)
  const median = avgs.length ? avgs[Math.floor(avgs.length / 2)] : 0
  const score = (id: string) => {
    const r = rows.get(id)
    return r && r.played > 0 ? r.points / r.played : median
  }
  return [...ids].sort((a, b) => {
    const d = score(b) - score(a)
    if (Math.abs(d) > 1e-9) return d
    const ra = rows.get(a)
    const rb = rows.get(b)
    const dd = (rb?.diff ?? 0) - (ra?.diff ?? 0)
    if (dd) return dd
    return unit(t.config.seed, roundIndex, a) - unit(t.config.seed, roundIndex, b)
  })
}
