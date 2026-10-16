import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Captions, CheckCircle2, Film, RefreshCw, XCircle } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { queryKeys } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader, Panel } from '@/layouts/AdminLayout'
import { BarList, StatCard } from '@/components/admin/StatBlocks'
import { ScraperStatusSummary } from '@/components/admin/ScraperStatusCard'
import { Artwork } from '@/components/movies/Artwork'
import { Badge, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { categoryLabel, formatNumber, formatRelative, sourceLabel } from '@/lib/format'

const JOB_TONES = { queued: 'neutral', running: 'info', completed: 'ok', failed: 'danger' } as const

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const stats = useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => adminApi.stats(signal),
    // Poll faster while a scrape is running so progress stays current without reloading
    refetchInterval: (q) => (q.state.data?.scraper.is_running ? 4000 : 30000),
  })

  const s = stats.data

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live figures from the movie database."
        actions={
          <Button variant="outline" size="sm" onClick={() => stats.refetch()} loading={stats.isFetching} icon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        }
      />

      {stats.isError ? (
        <ErrorState title="Could not load statistics" error={stats.error} onRetry={() => stats.refetch()} />
      ) : !s ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total movies" value={s.total_movies} icon={<Film className="h-5 w-5" />} />
            <StatCard
              label="Playable"
              value={s.with_stream}
              tone="ok"
              icon={<CheckCircle2 className="h-5 w-5" />}
              hint={s.total_movies ? `${Math.round((s.with_stream / s.total_movies) * 100)}% have a stream` : undefined}
            />
            <StatCard label="Without stream" value={s.without_stream} tone={s.without_stream ? 'warn' : 'default'} icon={<XCircle className="h-5 w-5" />} hint="Geo-restricted or not yet resolved" />
            <StatCard label="Generated subtitles" value={s.generated_subtitles} icon={<Captions className="h-5 w-5" />} hint="Completed AI subtitle files" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Scraper" actions={<Link to="/admin/scraper" className="text-xs text-fg-muted hover:text-fg">Manage</Link>}>
              <ScraperStatusSummary state={s.scraper} />
            </Panel>
            <Panel title="Movies by source">
              <BarList items={s.by_source} label={sourceLabel} total={s.total_movies} />
            </Panel>
            <Panel title="Catalog tags">
              <BarList items={s.by_category} label={categoryLabel} total={s.total_movies} empty="No catalog tags recorded. Tags are added by FlixKiss catalog scrapes." />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Recently added" className="lg:col-span-2" actions={<Link to="/admin/movies" className="text-xs text-fg-muted hover:text-fg">All movies</Link>}>
              {s.recent_movies.length ? (
                <ul className="-my-2 divide-y divide-ink-700">
                  {s.recent_movies.map((m) => (
                    <li key={m.tmdb_id} className="flex items-center gap-3 py-2.5">
                      <Artwork src={m.poster_url} alt="" title={m.title} className="h-12 w-8 shrink-0 rounded" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/movies/${encodeURIComponent(m.tmdb_id)}`} className="block truncate text-sm font-medium text-fg hover:text-white">
                          {m.title}
                        </Link>
                        <p className="text-xs text-fg-subtle">
                          {[m.year, sourceLabel(m.source)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {m.has_stream ? <Badge tone="ok">Stream</Badge> : <Badge tone="warn">No stream</Badge>}
                      <span className="hidden w-28 text-right text-xs text-fg-subtle sm:block">{formatRelative(m.scraped_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">No movies yet.</p>
              )}
            </Panel>
            <div className="space-y-6">
              <Panel title="Subtitle jobs" actions={<Link to="/admin/subtitles" className="text-xs text-fg-muted hover:text-fg">View jobs</Link>}>
                {Object.keys(s.subtitle_jobs).length ? (
                  <ul className="grid grid-cols-2 gap-3">
                    {(['queued', 'running', 'completed', 'failed'] as const).map((k) => (
                      <li key={k} className="rounded-lg bg-ink-850 px-3 py-2">
                        <Badge tone={JOB_TONES[k]}>{k}</Badge>
                        <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(s.subtitle_jobs[k] ?? 0)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-fg-subtle">No subtitle jobs have been queued.</p>
                )}
              </Panel>
              <Panel title="Top genres">
                <BarList items={s.top_genres.slice(0, 6)} />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
