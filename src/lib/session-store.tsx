import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { DEFAULT_CONFIG, TournamentError, finishTournament } from '@/engine'
import type { Preference, Tournament, TournamentConfig } from '@/engine'
import { DEMO_LIVE, PAST_SESSIONS, SAVED_PLAYERS } from './fixtures'
import type { SavedPlayer } from './fixtures'

export interface DraftPlayer {
  id: string
  name: string
  preference: Preference
}

export interface SetupDraft {
  config: TournamentConfig
  players: DraftPlayer[]
}

interface SessionStore {
  tournament: Tournament | null
  past: Tournament[]
  savedPlayers: SavedPlayer[]
  draft: SetupDraft
  /** True on the host's device. Viewers get a read-only dashboard. */
  isHost: boolean
  setViewerPreview: (viewer: boolean) => void
  /** Runs an engine action on the live session; shows a toast on rule errors. */
  apply: (action: (t: Tournament) => Tournament, success?: string) => boolean
  startSession: (t: Tournament) => void
  /** Ends the live session and stores it in History. */
  finishSession: () => void
  setDraft: (update: (d: SetupDraft) => SetupDraft) => void
  savePlayer: (p: Omit<SavedPlayer, 'id'>) => void
  removeSavedPlayer: (id: string) => void
}

const Ctx = createContext<SessionStore | null>(null)

export const newId = (prefix = '') =>
  prefix +
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10))

export const EMPTY_DRAFT: SetupDraft = {
  config: { ...DEFAULT_CONFIG },
  players: [],
}

/**
 * Milestone-1 store: holds the session in React state, seeded from fixtures.
 * The public surface (apply/startSession/...) is what the persistence layer
 * will implement later, so screens won't need to change.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(DEMO_LIVE)
  const [past, setPast] = useState<Tournament[]>(PAST_SESSIONS)
  const [savedPlayers, setSaved] = useState<SavedPlayer[]>(SAVED_PLAYERS)
  const [draft, setDraftState] = useState<SetupDraft>(EMPTY_DRAFT)
  const [isHost, setIsHost] = useState(true)

  const apply = useCallback(
    (action: (t: Tournament) => Tournament, success?: string) => {
      if (!tournament) return false
      try {
        const next = action(tournament)
        if (next !== tournament) {
          setTournament(next)
          // Keep the History copy of a finished session in step with score edits.
          if (next.status === 'finished') {
            setPast((p) => p.map((x) => (x.id === next.id ? next : x)))
          }
        }
        if (success) toast.success(success)
        return true
      } catch (e) {
        const message =
          e instanceof TournamentError ? e.message : 'Something went wrong. Your scores are unchanged.'
        toast.error(message)
        if (!(e instanceof TournamentError)) console.error(e)
        return false
      }
    },
    [tournament],
  )

  const finishSession = useCallback(() => {
    if (!tournament) return
    const next = finishTournament(tournament, Date.now())
    setTournament(next)
    setPast((p) => [next, ...p.filter((x) => x.id !== next.id)])
    toast.success('Session finished — final standings saved to History.')
  }, [tournament])

  const startSession = useCallback((t: Tournament) => setTournament(t), [])

  const value = useMemo<SessionStore>(
    () => ({
      tournament,
      past,
      savedPlayers,
      draft,
      isHost,
      setViewerPreview: (viewer) => setIsHost(!viewer),
      apply,
      startSession,
      finishSession,
      setDraft: (update) => setDraftState((d) => update(d)),
      savePlayer: (p) =>
        setSaved((list) =>
          list.some((x) => x.name.toLowerCase() === p.name.toLowerCase())
            ? list
            : [...list, { ...p, id: newId('sp-') }],
        ),
      removeSavedPlayer: (id) => setSaved((list) => list.filter((x) => x.id !== id)),
    }),
    [tournament, past, savedPlayers, draft, isHost, apply, startSession, finishSession],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

/** Name lookup for a tournament's players. */
export function usePlayerNames(t: Tournament | null): (id: string) => string {
  return useMemo(() => {
    const map = new Map(t?.players.map((p) => [p.id, p.name]) ?? [])
    return (id: string) => map.get(id) ?? 'Unknown'
  }, [t])
}
