import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BarChart3, CalendarClock, History, Home, Moon, Radio, Settings, Sun, SunMoon } from 'lucide-react'
import { useSession } from '@/lib/session-store'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { StatusPill } from './status-pill'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/live', label: 'Live', icon: Radio },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/matches', label: 'Matches', icon: CalendarClock },
  { to: '/history', label: 'History', icon: History },
] as const

export function BallMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-block size-7 shrink-0 rounded-full bg-ball shadow-[inset_-3px_-3px_0_oklch(0_0_0/0.12)]',
        className,
      )}
    >
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-l-white/70 border-r-white/70 [transform:scaleX(0.55)]" />
    </span>
  )
}

function ThemeButton() {
  const { theme, setTheme } = useTheme()
  const next = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system'
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
    >
      <Icon className="size-5" />
    </button>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { tournament, isHost } = useSession()
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg py-1 pr-2" aria-label="Padel Friday home">
            <BallMark />
            <span className="font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
              Padel <span className="text-primary dark:text-ball">Friday</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {tournament && (
              <Link to="/live" className="hidden sm:block">
                <StatusPill status={tournament.status} viewer={!isHost} />
              </Link>
            )}
            <ThemeButton />
            <Link
              to="/settings"
              className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none"
              activeProps={{ className: 'bg-muted text-foreground' }}
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5 pb-32">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md pb-safe"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="group flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors motion-reduce:transition-none"
                activeProps={{ className: 'text-foreground' }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'grid h-8 w-14 place-items-center rounded-full transition-colors motion-reduce:transition-none',
                        isActive && 'bg-ball text-ball-foreground',
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    {label}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
