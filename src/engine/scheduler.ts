import { buildHistory, pairKey, shareFor, PREFERENCE_WEIGHT } from './history'
import type { History } from './history'
import { unit } from './random'
import { mexicanoRanking } from './standings'
import type { Match, Phase, Round, TeamPair, Tournament } from './types'

/** Players available for a round: active and already arrived. */
export function eligibleFor(t: Tournament, roundIndex: number): string[] {
  return t.players
    .filter((p) => p.status === 'active' && p.joinedRound <= roundIndex)
    .map((p) => p.id)
}

export function phaseFor(t: Tournament, roundIndex: number): Phase {
  switch (t.config.format) {
    case 'regular':
      return 'regular'
    case 'americano':
      return 'americano'
    case 'mexicano':
      return 'mexicano'
    case 'hybrid':
      return t.hybridSwitchRound !== null && roundIndex >= t.hybridSwitchRound
        ? 'mexicano'
        : 'americano'
  }
}

export function courtsForRound(courts: number, eligibleCount: number): number {
  return Math.max(0, Math.min(courts, Math.floor(eligibleCount / 4)))
}

/**
 * Picks who plays. Lower priority value = more deserving of a court slot.
 * Priority = games played minus fair entitlement (weighted by preference),
 * with a bonus for players who have been resting and a small penalty for
 * long playing streaks. Ties are broken deterministically.
 */
export function selectPlayers(
  t: Tournament,
  roundIndex: number,
  eligible: string[],
  slots: number,
  history: History = buildHistory(t, roundIndex),
): { playing: string[]; resting: string[] } {
  const prefs = new Map(t.players.map((p) => [p.id, p.preference]))
  const share = shareFor(eligible, slots, prefs)
  const priority = new Map<string, number>()
  for (const id of eligible) {
    const h = history.players.get(id)
    const w = PREFERENCE_WEIGHT[prefs.get(id) ?? 'balanced']
    const played = h?.played ?? 0
    const owed = (h?.entitlement ?? 0) + (share.get(id) ?? 0)
    const restStreak = h?.restStreak ?? 0
    const playStreak = h?.playStreak ?? 0
    let p = played - owed
    p -= restStreak * 0.75 * w
    // Mild fatigue after 3+ straight rounds; capped below one game so it never
    // outweighs a real difference in games played.
    if (playStreak >= 3) p += Math.min(0.2, (playStreak - 2) * 0.1) / Math.max(1, w)
    priority.set(id, p)
  }
  const order = [...eligible].sort((a, b) => {
    const d = (priority.get(a) ?? 0) - (priority.get(b) ?? 0)
    if (Math.abs(d) > 1e-9) return d
    const j = unit(t.config.seed, 'sel', roundIndex, a) - unit(t.config.seed, 'sel', roundIndex, b)
    return j || a.localeCompare(b)
  })
  const playing = order.slice(0, slots)
  const set = new Set(playing)
  return { playing, resting: eligible.filter((id) => !set.has(id)) }
}

type Group = [string, string, string, string]
type Pairing = { teamA: TeamPair; teamB: TeamPair }

const PAIRINGS: Array<(g: Group) => Pairing> = [
  (g) => ({ teamA: [g[0], g[1]], teamB: [g[2], g[3]] }),
  (g) => ({ teamA: [g[0], g[2]], teamB: [g[1], g[3]] }),
  (g) => ({ teamA: [g[0], g[3]], teamB: [g[1], g[2]] }),
]

function pairingCost(p: Pairing, h: History): number {
  let cost = 0
  for (const team of [p.teamA, p.teamB]) {
    const k = pairKey(team[0], team[1])
    const n = h.partners.get(k) ?? 0
    cost += 10 * n * n
    if (h.lastPartners.has(k)) cost += 25
  }
  for (const a of p.teamA) {
    for (const b of p.teamB) {
      const k = pairKey(a, b)
      const n = h.opponents.get(k) ?? 0
      cost += 2 * n * n
      if (h.lastOpponents.has(k)) cost += 3
    }
  }
  return cost
}

function bestPairing(g: Group, h: History): { pairing: Pairing; cost: number } {
  let best = { pairing: PAIRINGS[0](g), cost: Infinity }
  for (const make of PAIRINGS) {
    const pairing = make(g)
    const cost = pairingCost(pairing, h)
    if (cost < best.cost) best = { pairing, cost }
  }
  return best
}

/** Rotation pairing: minimise repeated partners and opponents via local search. */
export function rotationGroups(
  t: Tournament,
  roundIndex: number,
  playing: string[],
  history: History,
): Pairing[] {
  const courts = playing.length / 4
  let bestGroups: Group[] = []
  let bestCost = Infinity
  const restarts = 6
  for (let s = 0; s < restarts; s++) {
    const order = [...playing].sort(
      (a, b) =>
        unit(t.config.seed, 'rot', roundIndex, s, a) -
          unit(t.config.seed, 'rot', roundIndex, s, b) || a.localeCompare(b),
    )
    const groups: Group[] = []
    for (let c = 0; c < courts; c++) groups.push(order.slice(c * 4, c * 4 + 4) as Group)
    const costs = groups.map((g) => bestPairing(g, history).cost)

    let improved = true
    let passes = 0
    while (improved && passes < 40) {
      improved = false
      passes++
      for (let g1 = 0; g1 < courts; g1++) {
        for (let g2 = g1 + 1; g2 < courts; g2++) {
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
              const a = [...groups[g1]] as Group
              const b = [...groups[g2]] as Group
              ;[a[i], b[j]] = [b[j], a[i]]
              const ca = bestPairing(a, history).cost
              const cb = bestPairing(b, history).cost
              if (ca + cb < costs[g1] + costs[g2] - 1e-9) {
                groups[g1] = a
                groups[g2] = b
                costs[g1] = ca
                costs[g2] = cb
                improved = true
              }
            }
          }
        }
      }
    }
    const total = costs.reduce((x, y) => x + y, 0)
    if (total < bestCost) {
      bestCost = total
      bestGroups = groups.map((g) => [...g] as Group)
    }
    if (bestCost === 0) break
  }
  return bestGroups.map((g) => bestPairing(g, history).pairing)
}

/** Mexicano pairing based on current rankings. */
export function mexicanoGroups(
  t: Tournament,
  roundIndex: number,
  playing: string[],
  history: History,
): Pairing[] {
  const ranked = mexicanoRanking(t, playing, roundIndex)
  const partnered = (a: string, b: string) => history.partners.get(pairKey(a, b)) ?? 0

  if (t.config.mexicanoPairing === 'standard') {
    // Groups of similar rank; inside a group 1+4 vs 2+3 unless that repeats a partnership.
    const out: Pairing[] = []
    for (let c = 0; c < ranked.length / 4; c++) {
      const g = ranked.slice(c * 4, c * 4 + 4) as Group
      const options: Array<[Pairing, number]> = [
        [{ teamA: [g[0], g[3]], teamB: [g[1], g[2]] }, 0],
        [{ teamA: [g[0], g[2]], teamB: [g[1], g[3]] }, 1],
        [{ teamA: [g[0], g[1]], teamB: [g[2], g[3]] }, 6],
      ]
      let best = options[0][0]
      let bestCost = Infinity
      for (const [p, bias] of options) {
        const repeat =
          partnered(p.teamA[0], p.teamA[1]) + partnered(p.teamB[0], p.teamB[1])
        const cost = bias + repeat * 8
        if (cost < bestCost) {
          bestCost = cost
          best = p
        }
      }
      out.push(best)
    }
    return out
  }

  // Balanced: highest with lowest across the field, then adjacent teams meet.
  const n = ranked.length
  const teams: TeamPair[] = []
  for (let k = 0; k < n / 2; k++) teams.push([ranked[k], ranked[n - 1 - k]])
  // Avoid repeated partnerships by swapping low partners between neighbouring teams.
  for (let k = 0; k < teams.length; k++) {
    if (partnered(teams[k][0], teams[k][1]) === 0) continue
    const neighbours = [k + 1, k - 1].filter((x) => x >= 0 && x < teams.length)
    for (const o of neighbours) {
      const before = partnered(teams[k][0], teams[k][1]) + partnered(teams[o][0], teams[o][1])
      const after = partnered(teams[k][0], teams[o][1]) + partnered(teams[o][0], teams[k][1])
      if (after < before) {
        const tmp = teams[k][1]
        teams[k][1] = teams[o][1]
        teams[o][1] = tmp
        break
      }
    }
  }
  const out: Pairing[] = []
  for (let c = 0; c < teams.length; c += 2) out.push({ teamA: teams[c], teamB: teams[c + 1] })
  return out
}

/**
 * Builds round `roundIndex` from the tournament's history. Returns null when
 * fewer than four players are available.
 */
export function buildRound(t: Tournament, roundIndex: number): Round | null {
  const eligible = eligibleFor(t, roundIndex)
  const courts = courtsForRound(t.config.courts, eligible.length)
  if (courts === 0) return null
  const history = buildHistory(t, roundIndex)
  const { playing, resting } = selectPlayers(t, roundIndex, eligible, courts * 4, history)
  const phase = phaseFor(t, roundIndex)
  const pairings =
    phase === 'mexicano'
      ? mexicanoGroups(t, roundIndex, playing, history)
      : rotationGroups(t, roundIndex, playing, history)
  const matches: Match[] = pairings.map((p, i) => ({
    id: `r${roundIndex + 1}-c${i + 1}`,
    round: roundIndex,
    court: i + 1,
    teamA: p.teamA,
    teamB: p.teamB,
    scoreA: null,
    scoreB: null,
    status: 'scheduled',
  }))
  const round: Round = {
    index: roundIndex,
    phase,
    status: 'scheduled',
    matches,
    resting,
    eligible,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    completedAt: null,
  }
  assertValidRound(round)
  return round
}

/** Throws when a player appears twice in a round (courts or bench). */
export function assertValidRound(round: Round): void {
  const seen = new Set<string>()
  const all = [...round.matches.flatMap((m) => [...m.teamA, ...m.teamB]), ...round.resting]
  for (const id of all) {
    if (seen.has(id)) throw new Error(`Player scheduled twice in round ${round.index + 1}`)
    seen.add(id)
  }
}
