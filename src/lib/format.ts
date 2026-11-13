import type { Format, MatchMode, Phase, Preference, Tournament } from '@/engine'

export const FORMAT_LABEL: Record<Format, string> = {
  regular: 'Regular',
  americano: 'Americano',
  mexicano: 'Mexicano',
  hybrid: 'Hybrid',
}

export const FORMAT_BLURB: Record<Format, string> = {
  regular: 'Rotating doubles with set or timed scoring.',
  americano: 'New partners every round. Everyone keeps their own points.',
  mexicano: 'Pairings follow the live rankings after each round.',
  hybrid: 'Start Americano, switch to Mexicano once rankings settle.',
}

export const PHASE_LABEL: Record<Phase, string> = {
  regular: 'Regular',
  americano: 'Americano',
  mexicano: 'Mexicano',
}

export const PREFERENCE_LABEL: Record<Preference, string> = {
  less: 'Play less',
  balanced: 'Balanced',
  more: 'Play more',
}

export const MATCH_MODE_LABEL: Record<MatchMode, string> = {
  points: 'Points',
  timed: 'Timed',
  games: 'Games',
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function sessionLink(t: Tournament): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/live?session=${encodeURIComponent(t.id)}`
}

export function scoringLine(t: Tournament): string {
  const c = t.config
  if (c.matchMode === 'points') return `${c.pointsPerMatch} pts`
  if (c.matchMode === 'games') return `first to ${c.gamesToWin}`
  return `${c.roundMinutes} min rounds`
}
