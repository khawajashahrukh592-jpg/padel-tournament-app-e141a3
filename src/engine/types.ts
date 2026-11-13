// Core domain types for Padel Friday. Pure data — no React, no I/O.

export type Preference = 'balanced' | 'more' | 'less'
export type PlayerStatus = 'active' | 'unavailable' | 'left'

export interface Player {
  id: string
  name: string
  preference: Preference
  status: PlayerStatus
  /** Round index (0-based) from which the player was available. */
  joinedRound: number
}

export type Format = 'regular' | 'americano' | 'mexicano' | 'hybrid'
export type Phase = 'regular' | 'americano' | 'mexicano'
export type MexicanoPairing = 'standard' | 'balanced'

/**
 * points  — Americano/Mexicano style: both scores must add up to `pointsPerMatch`.
 * timed   — play until the round timer ends; any non-negative score, draws allowed.
 * games   — Regular padel game scoring: first to `gamesToWin` (7-5 / 7-6 allowed).
 */
export type MatchMode = 'points' | 'timed' | 'games'

export type HybridTrigger = 'rounds' | 'time' | 'manual'
export type RankingRule = 'total' | 'average'

export interface TournamentConfig {
  name: string
  courts: number
  durationMinutes: number
  format: Format
  matchMode: MatchMode
  pointsPerMatch: number
  gamesToWin: number
  /** Planned length of one round (timer length when timed, estimate otherwise). */
  roundMinutes: number
  changeoverMinutes: number
  hybridTrigger: HybridTrigger
  hybridAfterRounds: number
  hybridAfterMinutes: number
  mexicanoPairing: MexicanoPairing
  rankingRule: RankingRule
  /** Seed for deterministic tie-breaking in the scheduler. */
  seed: number
}

export type TeamPair = [string, string]

export type MatchStatus = 'scheduled' | 'live' | 'completed'

export interface Match {
  id: string
  round: number
  court: number
  teamA: TeamPair
  teamB: TeamPair
  scoreA: number | null
  scoreB: number | null
  status: MatchStatus
}

export type RoundStatus = 'scheduled' | 'live' | 'paused' | 'completed'

export interface Round {
  index: number
  phase: Phase
  status: RoundStatus
  matches: Match[]
  resting: string[]
  /** Everyone who was available for this round (playing + resting). */
  eligible: string[]
  startedAt: number | null
  pausedAt: number | null
  pausedMs: number
  completedAt: number | null
}

export type TournamentStatus = 'live' | 'paused' | 'finished'

export interface Tournament {
  id: string
  config: TournamentConfig
  players: Player[]
  rounds: Round[]
  status: TournamentStatus
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  /** Round index at which the hybrid switched to Mexicano (null = not yet). */
  hybridSwitchRound: number | null
  /** Incremented on every change; used later for optimistic concurrency. */
  version: number
}

export interface StandingRow {
  rank: number
  playerId: string
  name: string
  points: number
  played: number
  average: number
  wins: number
  losses: number
  draws: number
  rested: number
  courtMinutes: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  status: PlayerStatus
}
