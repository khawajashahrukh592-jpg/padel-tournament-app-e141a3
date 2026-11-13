import type { TournamentConfig, Phase } from './types'

/** Returns an error message, or null when the score is valid for the rules. */
export function validateScore(
  config: TournamentConfig,
  a: number,
  b: number,
): string | null {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    return 'Scores must be whole numbers.'
  }
  if (a < 0 || b < 0) return 'Scores can’t be negative.'

  switch (config.matchMode) {
    case 'points':
      if (a + b !== config.pointsPerMatch) {
        return `Scores must add up to ${config.pointsPerMatch} (currently ${a + b}).`
      }
      return null
    case 'timed':
      if (a > 99 || b > 99) return 'That score looks too high for one round.'
      return null
    case 'games': {
      const g = config.gamesToWin
      const w = Math.max(a, b)
      const l = Math.min(a, b)
      if (w === l) return 'A games match needs a winner.'
      if (w === g && l <= g - 2) return null
      if (w === g + 1 && (l === g - 1 || l === g)) return null
      return `Not a valid set score: first to ${g} games (e.g. ${g}-${g - 2}, ${g + 1}-${g - 1} or ${g + 1}-${g}).`
    }
  }
}

/** Individual points a player earns from one match. */
export function pointsAwarded(
  phase: Phase,
  scoreFor: number,
  scoreAgainst: number,
): number {
  if (phase === 'regular') {
    if (scoreFor > scoreAgainst) return 3
    if (scoreFor === scoreAgainst) return 1
    return 0
  }
  return scoreFor
}

export function scoringSummary(config: TournamentConfig): string {
  switch (config.matchMode) {
    case 'points':
      return `${config.pointsPerMatch} points per match`
    case 'timed':
      return `${config.roundMinutes}-minute timed rounds`
    case 'games':
      return `First to ${config.gamesToWin} games`
  }
}
