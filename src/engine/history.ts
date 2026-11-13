import type { Preference, Round, Tournament } from './types'

export const PREFERENCE_WEIGHT: Record<Preference, number> = {
  less: 0.6,
  balanced: 1,
  more: 1.4,
}

export interface PlayerHistory {
  played: number
  rested: number
  /** Court slots this player is "owed" given availability and preference. */
  entitlement: number
  /** Consecutive rounds rested, counting back from the most recent round. */
  restStreak: number
  /** Consecutive rounds played, counting back from the most recent round. */
  playStreak: number
}

export interface History {
  players: Map<string, PlayerHistory>
  partners: Map<string, number>
  opponents: Map<string, number>
  lastPartners: Set<string>
  lastOpponents: Set<string>
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`)

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

export function playersInRound(round: Round): string[] {
  return round.matches.flatMap((m) => [...m.teamA, ...m.teamB])
}

/** Share of court slots for `ids` in a round with `slots` places. */
export function shareFor(
  ids: string[],
  slots: number,
  prefs: Map<string, Preference>,
): Map<string, number> {
  const total = ids.reduce(
    (s, id) => s + PREFERENCE_WEIGHT[prefs.get(id) ?? 'balanced'],
    0,
  )
  const out = new Map<string, number>()
  for (const id of ids) {
    const w = PREFERENCE_WEIGHT[prefs.get(id) ?? 'balanced']
    out.set(id, total > 0 ? Math.min(1, (slots * w) / total) : 0)
  }
  return out
}

/** Builds participation and pairing history from all rounds before `uptoIndex`. */
export function buildHistory(t: Tournament, uptoIndex: number): History {
  const prefs = new Map(t.players.map((p) => [p.id, p.preference]))
  const players = new Map<string, PlayerHistory>()
  const get = (id: string) => {
    let h = players.get(id)
    if (!h) {
      h = { played: 0, rested: 0, entitlement: 0, restStreak: 0, playStreak: 0 }
      players.set(id, h)
    }
    return h
  }
  for (const p of t.players) get(p.id)

  const partners = new Map<string, number>()
  const opponents = new Map<string, number>()
  let lastPartners = new Set<string>()
  let lastOpponents = new Set<string>()

  const rounds = t.rounds.filter((r) => r.index < uptoIndex)
  for (const round of rounds) {
    const playing = new Set(playersInRound(round))
    const share = shareFor(round.eligible, playing.size, prefs)
    for (const id of round.eligible) {
      const h = get(id)
      h.entitlement += share.get(id) ?? 0
      if (playing.has(id)) {
        h.played++
        h.playStreak++
        h.restStreak = 0
      } else {
        h.rested++
        h.restStreak++
        h.playStreak = 0
      }
    }
    // players who were unavailable this round break their streaks
    for (const [id, h] of players) {
      if (!round.eligible.includes(id)) {
        h.restStreak = 0
        h.playStreak = 0
      }
    }
    lastPartners = new Set()
    lastOpponents = new Set()
    for (const m of round.matches) {
      const pa = pairKey(m.teamA[0], m.teamA[1])
      const pb = pairKey(m.teamB[0], m.teamB[1])
      bump(partners, pa)
      bump(partners, pb)
      lastPartners.add(pa)
      lastPartners.add(pb)
      for (const a of m.teamA) {
        for (const b of m.teamB) {
          const k = pairKey(a, b)
          bump(opponents, k)
          lastOpponents.add(k)
        }
      }
    }
  }
  return { players, partners, opponents, lastPartners, lastOpponents }
}
