import type { ReactNode } from 'react'
import { cn, formatNumber } from '@/lib/format'
import type { CountByKey } from '@/types/admin'

export function StatCard({ label, value, hint, icon, tone = 'default' }: { label: string; value: number | string; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'ok' | 'warn' }) {
  return (
    <div className="rounded-card border border-ink-700 bg-ink-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{label}</p>
        {icon ? <span className={cn('text-fg-subtle', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn')}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  )
}

/** Labelled horizontal bars; every bar shows its exact count. */
export function BarList({ items, label = (k: string) => k, total, empty = 'No data yet.' }: { items: CountByKey[]; label?: (key: string) => string; total?: number; empty?: string }) {
  if (!items.length) return <p className="text-sm text-fg-subtle">{empty}</p>
  const max = total ?? Math.max(...items.map((i) => i.count))
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg">{label(i.key)}</span>
            <span className="tabular-nums text-fg-muted">{formatNumber(i.count)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-700" aria-hidden="true">
            <div className="h-1.5 rounded-full bg-brand-500/80" style={{ width: `${max ? Math.max(2, (i.count / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
