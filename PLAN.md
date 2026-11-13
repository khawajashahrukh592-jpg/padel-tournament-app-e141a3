# Padel Friday — Plan

1. **Done — Engine & tests.** Deterministic scheduler (fair rests, preferences, partner/opponent history), Regular/Americano/Mexicano/Hybrid, score validation, standings with tiebreakers, roster changes, swaps, undo, finish. Tests in `src/engine/engine.test.ts` cover all required scenarios.
2. **Done — UI (demo data).** Home, Setup, Live, Standings, Matches, History, Settings; dark mode; share link; standings image export. State lives in `src/lib/session-store.tsx`, seeded from `src/lib/fixtures.ts`.
3. **Next — Persistence.** Store sessions (tournament JSON + version), saved players and history in a database; refresh recovery; optimistic concurrency on `version` to block duplicate round generation.
4. **Next — Host auth & live viewers.** Host sign-in, server-side permission checks on every mutation, public read-only session URLs, real-time updates to viewers, sync-error messages.
5. **Next — Polish.** History analytics, advanced customization, deployment/env docs for the chosen backend.
