import { Link } from 'react-router-dom'
import { cn } from '@/lib/format'

export function Brand({ to = '/', className, suffix }: { to?: string; className?: string; suffix?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 rounded-md', className)} aria-label={suffix ? `Cinewave ${suffix}` : 'Cinewave home'}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-[0_0_24px_-6px] shadow-brand-500/70" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white">
          <path d="M7 4.5v15l12-7.5z" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-white">
        Cine<span className="text-brand-500">wave</span>
      </span>
      {suffix ? <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{suffix}</span> : null}
    </Link>
  )
}
