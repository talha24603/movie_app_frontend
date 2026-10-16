import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/format'
import { pageWindow } from '@/lib/pagination'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null
  const item =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      <button type="button" className={cn(item, 'text-fg-muted hover:bg-white/5 hover:text-fg')} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-fg-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(item, p === page ? 'bg-brand-600 font-semibold text-white' : 'text-fg-muted hover:bg-white/5 hover:text-fg')}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(item, 'text-fg-muted hover:bg-white/5 hover:text-fg')} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
