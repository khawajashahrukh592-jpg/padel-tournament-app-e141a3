import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase">{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border bg-card p-4 text-card-foreground sm:p-5', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-xl font-bold tracking-tight uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
