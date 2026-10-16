import { Activity, CheckCircle2, Circle } from 'lucide-react'
import type { ScraperState } from '@/types/admin'
import { Badge } from '@/components/ui/Feedback'
import { Spinner } from '@/components/ui/Spinner'

export function ScraperStatusSummary({ state }: { state: ScraperState }) {
  const { is_running, current_task, scraped_count, total_queued } = state
  const errorCount = state.error_count ?? state.errors.length
  const pct = total_queued ? Math.min(100, Math.round((scraped_count / total_queued) * 100)) : 0
  const idle = !is_running && (current_task === 'Idle' || !current_task)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {is_running ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
            <Spinner className="h-4 w-4" />
          </span>
        ) : idle ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-fg-subtle">
            <Circle className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-ok">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            {is_running ? 'Running' : idle ? 'Idle' : 'Last run finished'}
            {errorCount ? <Badge tone="danger">{errorCount} errors</Badge> : null}
          </p>
          <p className="truncate text-xs text-fg-subtle" title={current_task}>
            {idle ? 'No scrape has run since the API started.' : current_task}
          </p>
        </div>
      </div>
      {!idle ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Saved {scraped_count} of {total_queued}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Scrape progress">
            <div className="h-1.5 rounded-full bg-sky-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
