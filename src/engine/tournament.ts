import { assertValidRound, buildRound, phaseFor } from './scheduler'
import { validateScore } from './scoring'
import type {
  Player,
  PlayerStatus,
  Preference,
  Round,
  Tournament,
  TournamentConfig,
} from './types'

export class TournamentError extends Error {}

export const DEFAULT_CONFIG: TournamentConfig = {
  name: 'Friday Session',
  courts: 2,
  durationMinutes: 120,
  format: 'americano',
  matchMode: 'points',
  pointsPerMatch: 24,
  gamesToWin: 6,
  roundMinutes: 15,
  changeoverMinutes: 2,
  hybridTrigger: 'rounds',
  hybridAfterRounds: 3,
  hybridAfterMinutes: 60,
  mexicanoPairing: 'standard',
  rankingRule: 'total',
  seed: 1,
}

const clone = (t: Tournament): Tournament => structuredClone(t)

function touch(t: Tournament): Tournament {
  t.version++
  return t
}

function findRound(t: Tournament, index: number): Round {
  const r = t.rounds.find((x) => x.index === index)
  if (!r) throw new TournamentError('Round not found.')
  return r
}

export function currentRound(t: Tournament): Round | null {
  return t.rounds.length ? t.rounds[t.rounds.length - 1] : null
}

export interface SetupSummary {
  activeCourts: number
  idleCourts: number
  playersPerRound: number
  resting: number
  slotMinutes: number
  estimatedRounds: number
  gamesPerPlayer: number
  warnings: string[]
}

export function setupSummary(playerCount: number, config: TournamentConfig): SetupSummary {
  const activeCourts = Math.max(0, Math.min(config.courts, Math.floor(playerCount / 4)))
  const playersPerRound = activeCourts * 4
  const slotMinutes = Math.max(1, config.roundMinutes + config.changeoverMinutes)
  const estimatedRounds = Math.max(0, Math.floor(config.durationMinutes / slotMinutes))
  const warnings: string[] = []
  if (playerCount < 4) warnings.push('Add at least 4 players to start.')
  if (playerCount >= 4 && activeCourts < config.courts) {
    warnings.push(
      `${config.courts - activeCourts} court${config.courts - activeCourts > 1 ? 's' : ''} will stay idle — not enough players to fill them.`,
    )
  }
  return {
    activeCourts,
    idleCourts: config.courts - activeCourts,
    playersPerRound,
    resting: Math.max(0, playerCount - playersPerRound),
    slotMinutes,
    estimatedRounds,
    gamesPerPlayer: playerCount ? Math.round(((estimatedRounds * playersPerRound) / playerCount) * 10) / 10 : 0,
    warnings,
  }
}

export function createTournament(
  id: string,
  config: TournamentConfig,
  players: Array<{ id: string; name: string; preference: Preference }>,
  now: number,
): Tournament {
  const names = new Set<string>()
  for (const p of players) {
    const key = p.name.trim().toLowerCase()
    if (!key) throw new TournamentError('Every player needs a name.')
    if (names.has(key)) throw new TournamentError(`“${p.name}” is listed twice.`)
    names.add(key)
  }
  if (players.length < 4) throw new TournamentError('A session needs at least 4 players.')
  if (config.courts < 1 || config.courts > 8) throw new TournamentError('Choose between 1 and 8 courts.')

  const t: Tournament = {
    id,
    config: { ...config },
    players: players.map<Player>((p) => ({
      ...p,
      name: p.name.trim(),
      status: 'active',
      joinedRound: 0,
    })),
    rounds: [],
    status: 'live',
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    hybridSwitchRound: null,
    version: 1,
  }
  const first = buildRound(t, 0)
  if (first) t.rounds.push(first)
  return t
}

/** Generates the next round if the latest one is complete. Idempotent per index. */
export function generateNextRound(t0: Tournament, expectedIndex?: number): Tournament {
  const last = currentRound(t0)
  const nextIndex = last ? last.index + 1 : 0
  if (expectedIndex !== undefined && expectedIndex !== nextIndex) return t0 // already generated
  if (last && last.status !== 'completed') {
    throw new TournamentError('Finish the current round before generating the next one.')
  }
  if (t0.status === 'finished') throw new TournamentError('This session has finished.')
  const t = clone(t0)
  const round = buildRound(t, nextIndex)
  if (!round) throw new TournamentError('Need at least 4 available players for another round.')
  t.rounds.push(round)
  return touch(t)
}

/** Rebuilds the not-yet-started round (if any) after roster or setting changes. */
export function regenerateUnstarted(t0: Tournament): Tournament {
  const t = clone(t0)
  const last = currentRound(t)
  if (!last || last.status !== 'scheduled') return t0
  t.rounds.pop()
  const round = buildRound(t, last.index)
  if (round) t.rounds.push(round)
  return touch(t)
}

function hybridShouldSwitch(t: Tournament, now: number): boolean {
  if (t.config.format !== 'hybrid' || t.hybridSwitchRound !== null) return false
  const completed = t.rounds.filter((r) => r.status === 'completed').length
  if (t.config.hybridTrigger === 'rounds') return completed >= t.config.hybridAfterRounds
  if (t.config.hybridTrigger === 'time' && t.startedAt) {
    return (now - t.startedAt) / 60000 >= t.config.hybridAfterMinutes
  }
  return false
}

export function switchToMexicano(t0: Tournament): Tournament {
  if (t0.config.format !== 'hybrid') throw new TournamentError('Only hybrid sessions can switch format.')
  if (t0.hybridSwitchRound !== null) return t0
  const t = clone(t0)
  const last = currentRound(t)
  t.hybridSwitchRound = last && last.status === 'scheduled' ? last.index : (last?.index ?? -1) + 1
  return regenerateUnstarted(touch(t))
}

export function startRound(t0: Tournament, index: number, now: number): Tournament {
  const t = clone(t0)
  const round = findRound(t, index)
  if (round.status !== 'scheduled') return t0
  round.status = 'live'
  round.startedAt = now
  for (const m of round.matches) if (m.status === 'scheduled') m.status = 'live'
  if (!t.startedAt) t.startedAt = now
  t.status = 'live'
  return touch(t)
}

export function pauseSession(t0: Tournament, now: number): Tournament {
  if (t0.status !== 'live') return t0
  const t = clone(t0)
  t.status = 'paused'
  const r = currentRound(t)
  if (r && r.status === 'live') {
    r.status = 'paused'
    r.pausedAt = now
  }
  return touch(t)
}

export function resumeSession(t0: Tournament, now: number): Tournament {
  if (t0.status !== 'paused') return t0
  const t = clone(t0)
  t.status = 'live'
  const r = currentRound(t)
  if (r && r.status === 'paused') {
    r.status = 'live'
    if (r.pausedAt) r.pausedMs += now - r.pausedAt
    r.pausedAt = null
  }
  return touch(t)
}

export function setScore(
  t0: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number,
  now: number,
): Tournament {
  const error = validateScore(t0.config, scoreA, scoreB)
  if (error) throw new TournamentError(error)
  let t = clone(t0)
  const round = t.rounds.find((r) => r.matches.some((m) => m.id === matchId))
  if (!round) throw new TournamentError('Match not found.')
  if (round.status === 'scheduled') {
    t = startRound(t, round.index, now)
    return setScore(t, matchId, scoreA, scoreB, now)
  }
  const match = round.matches.find((m) => m.id === matchId)!
  match.scoreA = scoreA
  match.scoreB = scoreB
  match.status = 'completed'
  touch(t)
  // Editing an older completed round can change Mexicano rankings: refresh the unstarted round.
  const last = currentRound(t)
  if (round.status === 'completed' && last && last.status === 'scheduled') {
    t = regenerateUnstarted(t)
  }
  return t
}

/** Undo a score. Reopens the latest completed round if the next one hasn't started. */
export function clearScore(t0: Tournament, matchId: string): Tournament {
  const t = clone(t0)
  const round = t.rounds.find((r) => r.matches.some((m) => m.id === matchId))
  if (!round) throw new TournamentError('Match not found.')
  const last = currentRound(t)!
  if (t.status === 'finished') throw new TournamentError('This session has finished — edit the score instead.')
  if (round.status === 'completed') {
    const isLatestCompleted =
      round === last || (last.index === round.index + 1 && last.status === 'scheduled')
    if (!isLatestCompleted) {
      throw new TournamentError('A later round has started — edit this score instead of clearing it.')
    }
    if (last !== round) t.rounds.pop()
    if (t.hybridSwitchRound !== null && t.hybridSwitchRound > round.index && t.config.hybridTrigger !== 'manual') {
      t.hybridSwitchRound = null
    }
    round.status = t.status === 'paused' ? 'paused' : 'live'
    round.completedAt = null
  }
  const match = round.matches.find((m) => m.id === matchId)!
  match.scoreA = null
  match.scoreB = null
  match.status = round.status === 'scheduled' ? 'scheduled' : 'live'
  return touch(t)
}

/** Completes a round and generates the next one (unless the session is over). */
export function completeRound(t0: Tournament, index: number, now: number): Tournament {
  if (t0.rounds.find((r) => r.index === index)?.status === 'completed') return t0 // duplicate request — no-op
  const last = currentRound(t0)
  if (!last || last.index !== index) throw new TournamentError('Only the current round can be completed.')
  const missing = last.matches.filter((m) => m.status !== 'completed').length
  if (missing) throw new TournamentError(`Enter ${missing === 1 ? 'the last score' : `${missing} more scores`} first.`)
  const t = clone(t0)
  const round = currentRound(t)!
  if (round.pausedAt) round.pausedMs += now - round.pausedAt
  round.pausedAt = null
  round.status = 'completed'
  round.completedAt = now
  if (!round.startedAt) round.startedAt = now
  if (t.status === 'paused') t.status = 'live'
  if (hybridShouldSwitch(t, now)) t.hybridSwitchRound = index + 1
  touch(t)
  const next = buildRound(t, index + 1)
  if (next) t.rounds.push(next)
  return t
}

export function swapPlayers(t0: Tournament, roundIndex: number, a: string, b: string): Tournament {
  if (a === b) return t0
  const t = clone(t0)
  const round = findRound(t, roundIndex)
  if (round.status === 'completed') throw new TournamentError('Completed rounds can’t be changed.')
  const locate = (id: string) => {
    for (const m of round.matches) {
      for (const side of ['teamA', 'teamB'] as const) {
        const i = m[side].indexOf(id)
        if (i >= 0) {
          if (m.status === 'completed') throw new TournamentError('That match already has a score.')
          return { set: (v: string) => (m[side][i] = v) }
        }
      }
    }
    const i = round.resting.indexOf(id)
    if (i >= 0) return { set: (v: string) => (round.resting[i] = v) }
    return null
  }
  const la = locate(a)
  const lb = locate(b)
  if (!la) throw new TournamentError('Player isn’t in this round.')
  if (lb) {
    la.set(b)
    lb.set(a)
  } else {
    // b is not in the round yet (e.g. late arrival) — bring them in, a sits out.
    const pb = t.players.find((p) => p.id === b)
    if (!pb || pb.status !== 'active') throw new TournamentError('That player isn’t available.')
    la.set(b)
    round.resting.push(a)
    if (!round.eligible.includes(b)) round.eligible.push(b)
  }
  assertValidRound(round)
  return touch(t)
}

function nextRoundIndex(t: Tournament): number {
  const last = currentRound(t)
  if (!last) return 0
  return last.status === 'scheduled' ? last.index : last.index + 1
}

export function addPlayer(
  t0: Tournament,
  player: { id: string; name: string; preference: Preference },
): Tournament {
  const name = player.name.trim()
  if (!name) throw new TournamentError('Enter a name.')
  if (t0.players.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.status !== 'left')) {
    throw new TournamentError(`${name} is already in this session.`)
  }
  const t = clone(t0)
  t.players.push({ ...player, name, status: 'active', joinedRound: nextRoundIndex(t) })
  touch(t)
  if (!currentRound(t) || currentRound(t)!.status === 'completed') {
    const r = buildRound(t, nextRoundIndex(t))
    if (r && t.status !== 'finished') t.rounds.push(r)
    return t
  }
  return regenerateUnstarted(t)
}

export function setPlayerStatus(t0: Tournament, id: string, status: PlayerStatus): Tournament {
  const t = clone(t0)
  const p = t.players.find((x) => x.id === id)
  if (!p) throw new TournamentError('Player not found.')
  if (p.status === status) return t0
  p.status = status
  touch(t)
  return regenerateUnstarted(t)
}

export function setPreference(t0: Tournament, id: string, preference: Preference): Tournament {
  const t = clone(t0)
  const p = t.players.find((x) => x.id === id)
  if (!p) throw new TournamentError('Player not found.')
  p.preference = preference
  return regenerateUnstarted(touch(t))
}

export function updateConfig(t0: Tournament, patch: Partial<TournamentConfig>): Tournament {
  const t = clone(t0)
  t.config = { ...t.config, ...patch }
  return regenerateUnstarted(touch(t))
}

/** Ends the session. Unstarted rounds are dropped; unscored matches of a live round are discarded. */
export function finishTournament(t0: Tournament, now: number): Tournament {
  if (t0.status === 'finished') return t0
  const t = clone(t0)
  const last = currentRound(t)
  if (last && last.status === 'scheduled') t.rounds.pop()
  const live = currentRound(t)
  if (live && live.status !== 'completed') {
    live.matches = live.matches.filter((m) => m.status === 'completed')
    if (live.matches.length) {
      const inMatches = new Set(live.matches.flatMap((m) => [...m.teamA, ...m.teamB]))
      live.resting = live.eligible.filter((id) => !inMatches.has(id))
      live.status = 'completed'
      live.completedAt = now
    } else {
      t.rounds.pop()
    }
  }
  t.status = 'finished'
  t.finishedAt = now
  return touch(t)
}

/**
 * Projects upcoming rounds for rotation phases (which don't depend on results).
 * Returns an empty list when the next round depends on results (Mexicano).
 */
export function projectUpcoming(t0: Tournament, count: number, now: number): Round[] {
  if (t0.status === 'finished') return []
  const t = clone(t0)
  const out: Round[] = []
  for (const r of t.rounds) {
    if (r.status !== 'completed') r.status = 'completed'
  }
  let index = (currentRound(t)?.index ?? -1) + 1
  while (out.length < count) {
    if (hybridShouldSwitch(t, now)) t.hybridSwitchRound = index
    if (phaseFor(t, index) === 'mexicano') break
    const r = buildRound(t, index)
    if (!r) break
    r.status = 'completed'
    t.rounds.push(r)
    out.push({ ...r, status: 'scheduled' })
    index++
  }
  return out
}

export function elapsedRoundMs(r: Round, now: number): number {
  if (!r.startedAt) return 0
  const end = r.completedAt ?? r.pausedAt ?? now
  return Math.max(0, end - r.startedAt - r.pausedMs)
}
