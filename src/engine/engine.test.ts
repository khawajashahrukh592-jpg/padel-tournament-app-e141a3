// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  addPlayer,
  assertValidRound,
  buildRound,
  clearScore,
  completeRound,
  computeStandings,
  createTournament,
  currentRound,
  finishTournament,
  generateNextRound,
  mexicanoRanking,
  projectUpcoming,
  setPlayerStatus,
  setScore,
  swapPlayers,
  switchToMexicano,
  validateScore,
} from './index'
import type { Format, Preference, Tournament, TournamentConfig } from './index'
import { hash } from './random'
import { pairKey } from './history'

const NOW = 1_700_000_000_000

function makePlayers(n: number, prefs: Record<number, Preference> = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    preference: prefs[i] ?? ('balanced' as Preference),
  }))
}

function config(patch: Partial<TournamentConfig> = {}): TournamentConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}

/** A valid score for the configured rules, deterministic per match. */
function sampleScore(c: TournamentConfig, key: string): [number, number] {
  const h = hash(key)
  if (c.matchMode === 'points') {
    const a = h % (c.pointsPerMatch + 1)
    return [a, c.pointsPerMatch - a]
  }
  if (c.matchMode === 'games') {
    const l = h % (c.gamesToWin - 1)
    return h % 2 ? [c.gamesToWin, l] : [l, c.gamesToWin]
  }
  return [h % 15, (h >>> 4) % 15]
}

function playRound(t: Tournament, n = 0): Tournament {
  const r = currentRound(t)!
  let next = t
  for (const m of r.matches) {
    const [a, b] = sampleScore(t.config, `${m.id}-${n}`)
    next = setScore(next, m.id, a, b, NOW + r.index * 1000)
  }
  return completeRound(next, r.index, NOW + r.index * 1000 + 900)
}

function checkRound(t: Tournament, index: number) {
  const r = t.rounds[index]
  assertValidRound(r)
  const eligible = new Set(r.eligible)
  const expectedCourts = Math.min(t.config.courts, Math.floor(r.eligible.length / 4))
  expect(r.matches.length).toBe(expectedCourts)
  expect(r.resting.length).toBe(r.eligible.length - expectedCourts * 4)
  const seen = new Set<string>()
  for (const m of r.matches) {
    for (const id of [...m.teamA, ...m.teamB]) {
      expect(eligible.has(id)).toBe(true)
      expect(seen.has(id)).toBe(false)
      seen.add(id)
    }
  }
  for (const id of r.resting) expect(seen.has(id)).toBe(false)
}

function run(players: number, courts: number, format: Format, rounds: number, patch: Partial<TournamentConfig> = {}) {
  let t = createTournament('t', config({ courts, format, ...patch }), makePlayers(players), NOW)
  for (let i = 0; i < rounds; i++) {
    checkRound(t, i)
    t = playRound(t)
  }
  return t
}

function playedCounts(t: Tournament): Map<string, number> {
  const counts = new Map(t.players.map((p) => [p.id, 0]))
  for (const r of t.rounds.filter((x) => x.status === 'completed')) {
    for (const m of r.matches) for (const id of [...m.teamA, ...m.teamB]) counts.set(id, counts.get(id)! + 1)
  }
  return counts
}

const SCENARIOS: Array<[number, number]> = [
  [5, 1],
  [7, 1],
  [10, 2],
  [12, 3],
  [14, 2],
  [20, 4],
]
const FORMATS: Format[] = ['regular', 'americano', 'mexicano', 'hybrid']

describe('scheduling scenarios', () => {
  for (const [players, courts] of SCENARIOS) {
    for (const format of FORMATS) {
      it(`${players} players, ${courts} court(s), ${format}: valid rounds and fair rotation`, () => {
        const patch: Partial<TournamentConfig> =
          format === 'regular' ? { matchMode: 'games' } : {}
        const t = run(players, courts, format, 10, patch)
        const counts = [...playedCounts(t).values()]
        // Everyone balanced: games played never differ by more than one.
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
        // Total slots used is exactly courts * 4 per round.
        const used = Math.min(courts, Math.floor(players / 4)) * 4
        expect(counts.reduce((a, b) => a + b, 0)).toBe(used * 10)
      })
    }
  }

  it('leaves extra courts idle when they cannot be filled', () => {
    const t = createTournament('t', config({ courts: 4 }), makePlayers(9), NOW)
    expect(t.rounds[0].matches).toHaveLength(2)
    expect(t.rounds[0].resting).toHaveLength(1)
  })

  it('rests different players in consecutive rounds when possible', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(5), NOW)
    for (let i = 0; i < 6; i++) {
      const before = new Set(currentRound(t)!.resting)
      t = playRound(t)
      for (const id of currentRound(t)!.resting) expect(before.has(id)).toBe(false)
    }
  })

  it('avoids repeated partnerships in early Americano rounds', () => {
    let t = createTournament('t', config({ courts: 2 }), makePlayers(8), NOW)
    const partners = new Set<string>()
    for (let i = 0; i < 3; i++) {
      for (const m of currentRound(t)!.matches) {
        for (const team of [m.teamA, m.teamB]) {
          const k = pairKey(team[0], team[1])
          expect(partners.has(k)).toBe(false)
          partners.add(k)
        }
      }
      t = playRound(t)
    }
  })

  it('is deterministic: the same inputs give identical schedules (every viewer sees the same)', () => {
    const a = run(14, 2, 'mexicano', 6)
    const b = run(14, 2, 'mexicano', 6)
    expect(JSON.stringify(a.rounds)).toBe(JSON.stringify(b.rounds))
    expect(computeStandings(a)).toEqual(computeStandings(b))
  })
})

describe('preferences', () => {
  it('Play More players get more games, Play Less players fewer', () => {
    let t = createTournament(
      't',
      config({ courts: 1 }),
      makePlayers(6, { 0: 'more', 1: 'less' }),
      NOW,
    )
    for (let i = 0; i < 12; i++) {
      checkRound(t, i)
      t = playRound(t)
    }
    const counts = playedCounts(t)
    const balanced = [2, 3, 4, 5].map((i) => counts.get(`p${i + 1}`)!)
    expect(counts.get('p1')!).toBeGreaterThanOrEqual(Math.max(...balanced))
    expect(counts.get('p2')!).toBeLessThanOrEqual(Math.min(...balanced))
    expect(counts.get('p1')!).toBeGreaterThan(counts.get('p2')!)
  })
})

describe('roster changes mid-session', () => {
  it('handles late arrivals and withdrawals without touching completed rounds', () => {
    let t = createTournament('t', config({ courts: 2 }), makePlayers(8), NOW)
    t = playRound(t)
    const snapshot = JSON.stringify(t.rounds[0])

    t = addPlayer(t, { id: 'late', name: 'Late Arrival', preference: 'balanced' })
    expect(currentRound(t)!.eligible).toContain('late')
    checkRound(t, 1)

    t = setPlayerStatus(t, 'p3', 'left')
    expect(currentRound(t)!.eligible).not.toContain('p3')
    checkRound(t, 1)
    expect(JSON.stringify(t.rounds[0])).toBe(snapshot)

    for (let i = 0; i < 4; i++) {
      t = playRound(t)
      const r = currentRound(t)!
      checkRound(t, r.index)
      expect(r.matches.flatMap((m) => [...m.teamA, ...m.teamB])).not.toContain('p3')
    }
    expect(JSON.stringify(t.rounds[0])).toBe(snapshot)
  })

  it('a late arrival does not jump the queue to catch up', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(5), NOW)
    for (let i = 0; i < 4; i++) t = playRound(t)
    t = addPlayer(t, { id: 'late', name: 'Late', preference: 'balanced' })
    for (let i = 0; i < 6; i++) t = playRound(t)
    const counts = playedCounts(t)
    // 6 rounds × 4 slots / 6 players ≈ 4 games for the late arrival.
    expect(counts.get('late')!).toBeGreaterThanOrEqual(3)
    expect(counts.get('late')!).toBeLessThanOrEqual(5)
  })

  it('temporarily unavailable players return to the rotation', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(6), NOW)
    t = setPlayerStatus(t, 'p1', 'unavailable')
    expect(currentRound(t)!.eligible).not.toContain('p1')
    t = playRound(t)
    t = setPlayerStatus(t, 'p1', 'active')
    expect(currentRound(t)!.eligible).toContain('p1')
    checkRound(t, 1)
  })

  it('swaps players without creating duplicates', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(5), NOW)
    const r = currentRound(t)!
    const resting = r.resting[0]
    const playing = r.matches[0].teamA[0]
    t = swapPlayers(t, 0, playing, resting)
    const after = currentRound(t)!
    expect(after.resting).toEqual([playing])
    expect(after.matches[0].teamA[0]).toBe(resting)
    assertValidRound(after)
  })
})

describe('formats', () => {
  it('Americano transitions into Mexicano and keeps standings', () => {
    let t = createTournament(
      't',
      config({ courts: 2, format: 'hybrid', hybridTrigger: 'rounds', hybridAfterRounds: 3 }),
      makePlayers(10),
      NOW,
    )
    for (let i = 0; i < 3; i++) {
      expect(currentRound(t)!.phase).toBe('americano')
      t = playRound(t)
    }
    const before = computeStandings(t)
    expect(currentRound(t)!.phase).toBe('mexicano')
    expect(t.hybridSwitchRound).toBe(3)
    expect(computeStandings(t)).toEqual(before)
    // Mexicano round uses current rankings: court 1 holds the top-ranked players.
    const r = currentRound(t)!
    const playing = r.matches.flatMap((m) => [...m.teamA, ...m.teamB])
    const ranked = mexicanoRanking(t, playing, r.index)
    const court1 = new Set([...r.matches[0].teamA, ...r.matches[0].teamB])
    expect(ranked.slice(0, 4).every((id) => court1.has(id))).toBe(true)
    // Results keep accumulating after the switch.
    t = playRound(t)
    const totalBefore = before.reduce((s, x) => s + x.points, 0)
    const totalAfter = computeStandings(t).reduce((s, x) => s + x.points, 0)
    expect(totalAfter).toBe(totalBefore + 2 * 2 * 24)
    expect(currentRound(t)!.phase).toBe('mexicano')
  })

  it('manual hybrid switch only affects unstarted rounds', () => {
    let t = createTournament('t', config({ courts: 1, format: 'hybrid', hybridTrigger: 'manual' }), makePlayers(6), NOW)
    t = playRound(t)
    t = switchToMexicano(t)
    expect(t.rounds[0].phase).toBe('americano')
    expect(currentRound(t)!.phase).toBe('mexicano')
  })

  it('does not project Mexicano rounds before results exist', () => {
    const t = createTournament('t', config({ courts: 2, format: 'mexicano' }), makePlayers(8), NOW)
    expect(projectUpcoming(t, 3, NOW)).toEqual([])
    const a = createTournament('t', config({ courts: 2, format: 'americano' }), makePlayers(9), NOW)
    const upcoming = projectUpcoming(a, 3, NOW)
    expect(upcoming).toHaveLength(3)
    upcoming.forEach(assertValidRound)
  })

  it('Balanced Mexicano with odd player counts pairs high with low', () => {
    let t = createTournament(
      't',
      config({ courts: 2, format: 'mexicano', mexicanoPairing: 'balanced' }),
      makePlayers(9),
      NOW,
    )
    for (let i = 0; i < 6; i++) {
      checkRound(t, i)
      if (i > 0) {
        const r = currentRound(t)!
        const playing = r.matches.flatMap((m) => [...m.teamA, ...m.teamB])
        const ranked = mexicanoRanking(t, playing, r.index)
        const top = ranked[0]
        const team = r.matches.flatMap((m) => [m.teamA, m.teamB]).find((x) => x.includes(top))!
        const partner = team[0] === top ? team[1] : team[0]
        expect(ranked.indexOf(partner)).toBeGreaterThanOrEqual(ranked.length / 2)
      }
      t = playRound(t)
    }
  })
})

describe('scoring and standings', () => {
  it('validates scores for each rule', () => {
    expect(validateScore(config({ matchMode: 'points', pointsPerMatch: 24 }), 13, 11)).toBeNull()
    expect(validateScore(config({ matchMode: 'points', pointsPerMatch: 24 }), 13, 12)).not.toBeNull()
    expect(validateScore(config({ matchMode: 'games', gamesToWin: 6 }), 6, 4)).toBeNull()
    expect(validateScore(config({ matchMode: 'games', gamesToWin: 6 }), 7, 6)).toBeNull()
    expect(validateScore(config({ matchMode: 'games', gamesToWin: 6 }), 6, 5)).not.toBeNull()
    expect(validateScore(config({ matchMode: 'timed' }), 9, 9)).toBeNull()
    expect(validateScore(config({ matchMode: 'timed' }), -1, 3)).not.toBeNull()
  })

  it('handles ties with shared ranks and deterministic order', () => {
    let t = createTournament('t', config({ courts: 1, matchMode: 'timed' }), makePlayers(4), NOW)
    const m = currentRound(t)!.matches[0]
    t = setScore(t, m.id, 5, 5, NOW)
    t = completeRound(t, 0, NOW + 1)
    const s = computeStandings(t)
    expect(s.every((r) => r.rank === 1)).toBe(true)
    expect(s.every((r) => r.draws === 1)).toBe(true)
  })

  it('awards Americano points from the team score', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(4), NOW)
    const m = currentRound(t)!.matches[0]
    t = setScore(t, m.id, 15, 9, NOW)
    t = completeRound(t, 0, NOW + 1)
    const s = computeStandings(t)
    expect(s.find((r) => r.playerId === m.teamA[0])!.points).toBe(15)
    expect(s.find((r) => r.playerId === m.teamB[0])!.points).toBe(9)
  })

  it('undo reopens the round and removes the unstarted next round', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(5), NOW)
    const m = currentRound(t)!.matches[0]
    t = playRound(t)
    expect(t.rounds).toHaveLength(2)
    t = clearScore(t, m.id)
    expect(t.rounds).toHaveLength(1)
    expect(t.rounds[0].status).toBe('live')
  })
})

describe('reliability', () => {
  it('completing a round twice does not generate duplicate rounds', () => {
    let t = createTournament('t', config({ courts: 1 }), makePlayers(4), NOW)
    const m = currentRound(t)!.matches[0]
    t = setScore(t, m.id, 12, 12, NOW)
    t = completeRound(t, 0, NOW)
    const again = completeRound(t, 0, NOW)
    expect(again.rounds).toHaveLength(2)
    // stale "generate next" requests are ignored
    expect(generateNextRound(t, 1)).toBe(t)
  })

  it('recovers after a refresh: serialised state continues identically', () => {
    let t = run(10, 2, 'hybrid', 4)
    const restored = JSON.parse(JSON.stringify(t)) as Tournament
    t = playRound(t)
    const r2 = playRound(restored)
    expect(JSON.stringify(r2.rounds)).toBe(JSON.stringify(t.rounds))
    expect(buildRound(restored, 4)).toEqual(buildRound(JSON.parse(JSON.stringify(restored)), 4))
  })

  it('finishing keeps completed results and drops unscored matches', () => {
    let t = run(8, 2, 'americano', 2)
    const r = currentRound(t)!
    t = setScore(t, r.matches[0].id, 20, 4, NOW)
    t = finishTournament(t, NOW + 10)
    expect(t.status).toBe('finished')
    expect(t.rounds).toHaveLength(3)
    expect(t.rounds[2].matches).toHaveLength(1)
    expect(t.rounds.every((x) => x.status === 'completed')).toBe(true)
  })
})
