/**
 * Demo data for the first milestone. Everything the UI reads at startup comes
 * from here, so a later milestone can swap this module for real persistence.
 * Sessions are produced by the real engine with deterministic scores.
 */
import {
  DEFAULT_CONFIG,
  completeRound,
  createTournament,
  currentRound,
  finishTournament,
  setScore,
} from '@/engine'
import type { Preference, Tournament, TournamentConfig } from '@/engine'
import { hash } from '@/engine/random'

export interface SavedPlayer {
  id: string
  name: string
  preference: Preference
}

export const SAVED_PLAYERS: SavedPlayer[] = [
  { id: 'sp-sara', name: 'Sara', preference: 'balanced' },
  { id: 'sp-omar', name: 'Omar', preference: 'more' },
  { id: 'sp-lena', name: 'Lena', preference: 'balanced' },
  { id: 'sp-jonas', name: 'Jonas', preference: 'balanced' },
  { id: 'sp-aisha', name: 'Aisha', preference: 'balanced' },
  { id: 'sp-marco', name: 'Marco', preference: 'less' },
  { id: 'sp-priya', name: 'Priya', preference: 'balanced' },
  { id: 'sp-tom', name: 'Tom', preference: 'balanced' },
  { id: 'sp-noor', name: 'Noor', preference: 'more' },
  { id: 'sp-diego', name: 'Diego', preference: 'balanced' },
  { id: 'sp-hana', name: 'Hana', preference: 'balanced' },
  { id: 'sp-felix', name: 'Felix', preference: 'balanced' },
  { id: 'sp-zara', name: 'Zara', preference: 'less' },
  { id: 'sp-ali', name: 'Ali', preference: 'balanced' },
]

const DAY = 86_400_000
/** Fixed reference time so server and browser render identical demo data. */
const BASE = Date.UTC(2026, 10, 13, 17, 0)

function players(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const p = SAVED_PLAYERS[(i + offset) % SAVED_PLAYERS.length]
    return { id: p.id, name: p.name, preference: p.preference }
  })
}

function scoreFor(config: TournamentConfig, key: string): [number, number] {
  const h = hash(key)
  if (config.matchMode === 'points') {
    const a = 6 + (h % (config.pointsPerMatch - 11))
    return [a, config.pointsPerMatch - a]
  }
  if (config.matchMode === 'games') {
    const l = h % (config.gamesToWin - 1)
    return h % 2 ? [config.gamesToWin, l] : [l, config.gamesToWin]
  }
  return [h % 12, (h >>> 5) % 12]
}

function simulate(
  id: string,
  config: TournamentConfig,
  roster: ReturnType<typeof players>,
  start: number,
  rounds: number,
  finish: boolean,
): Tournament {
  let t = createTournament(id, config, roster, start)
  const slot = (config.roundMinutes + config.changeoverMinutes) * 60_000
  for (let i = 0; i < rounds; i++) {
    const r = currentRound(t)
    if (!r) break
    const at = start + i * slot
    for (const m of r.matches) {
      const [a, b] = scoreFor(config, `${id}-${m.id}`)
      t = setScore(t, m.id, a, b, at)
    }
    t = completeRound(t, r.index, at + config.roundMinutes * 60_000)
  }
  if (finish) t = finishTournament(t, start + rounds * slot)
  return t
}

export const PAST_SESSIONS: Tournament[] = [
  simulate(
    'fri-06-nov',
    { ...DEFAULT_CONFIG, name: 'Friday Americano', courts: 2, format: 'americano', seed: 6 },
    players(9),
    BASE - 7 * DAY,
    7,
    true,
  ),
  simulate(
    'mex-night',
    {
      ...DEFAULT_CONFIG,
      name: 'Mexicano Night',
      courts: 3,
      format: 'mexicano',
      pointsPerMatch: 32,
      roundMinutes: 18,
      durationMinutes: 180,
      seed: 11,
    },
    players(12, 2),
    BASE - 14 * DAY,
    8,
    true,
  ),
  simulate(
    'club-doubles',
    {
      ...DEFAULT_CONFIG,
      name: 'Club Doubles',
      courts: 2,
      format: 'regular',
      matchMode: 'games',
      roundMinutes: 25,
      durationMinutes: 120,
      seed: 3,
    },
    players(8, 4),
    BASE - 21 * DAY,
    4,
    true,
  ),
]

/** A hybrid session in progress: two Americano rounds played, round 3 ready to start. */
export const DEMO_LIVE: Tournament = simulate(
  'padel-friday-demo',
  {
    ...DEFAULT_CONFIG,
    name: 'Padel Friday',
    courts: 2,
    format: 'hybrid',
    hybridTrigger: 'rounds',
    hybridAfterRounds: 3,
    durationMinutes: 120,
    seed: 42,
  },
  players(10),
  BASE,
  2,
  false,
)
