# Padel Friday

Mobile-first live padel tournament manager: fair rotations for any number of players (4+), Regular, Americano, Mexicano and Hybrid (Americano → Mexicano) formats, live score entry and standings.

**Stack:** React 19, TypeScript, TanStack Start (Vite), Tailwind CSS 4, shadcn/ui, Vitest, Netlify.

## Run locally
```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # scheduling & scoring tests
```

## Status
The scheduling engine and all screens work in the browser with demo data. Sessions are not yet saved between page loads, and live sharing to other devices is not connected yet. See `PLAN.md` for the roadmap.
