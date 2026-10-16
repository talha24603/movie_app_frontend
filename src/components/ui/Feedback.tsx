import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'
import { errorMessage } from '@/lib/errors'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />
}

interface StateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ title, description, action, className, compact }: StateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-ink-600 text-center',
        compact ? 'gap-2 p-6' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <Inbox className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
      <p className="font-medium text-fg">{title}</p>
      {description ? <p className="max-w-md text-sm text-fg-muted">{description}</p> : null}
      {action}
    </div>
  )
}

interface ErrorStateProps extends Omit<StateProps, 'title'> {
  title?: string
  error?: unknown
  onRetry?: () => void
}

export function ErrorState({ title = 'Could not load this', error, onRetry, description, className, compact }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-red-500/20 bg-red-500/5 text-center',
        compact ? 'gap-2 p-6' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
      <p className="font-medium text-fg">{title}</p>
      <p className="max-w-md text-sm text-fg-muted">{description ?? errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-white/8 text-fg-muted ring-white/10',
  brand: 'bg-brand-500/15 text-brand-400 ring-brand-500/25',
  ok: 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/25',
  warn: 'bg-amber-500/12 text-amber-300 ring-amber-500/25',
  danger: 'bg-red-500/12 text-red-300 ring-red-500/25',
  info: 'bg-sky-500/12 text-sky-300 ring-sky-500/25',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  )
}
