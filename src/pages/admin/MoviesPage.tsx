import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Pencil, Search, Trash2 } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { useFacets, useMovies } from '@/hooks/queries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/layouts/AdminLayout'
import { Artwork } from '@/components/movies/Artwork'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/errors'
import { Spinner } from '@/components/ui/Spinner'
import { categoryLabel, cn, formatDate, formatNumber, formatRating, hasStream, sourceLabel } from '@/lib/format'
import type { Movie, MovieSortField, SortOrder } from '@/types/movie'

const SORTABLE: MovieSortField[] = ['title', 'year', 'rating', 'scraped_at', 'updated_at']

function SortHeader({ field, label, sort, order, onSort, className }: { field: MovieSortField; label: string; sort: MovieSortField; order: SortOrder; onSort: (f: MovieSortField) => void; className?: string }) {
  const active = sort === field
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" className={cn('px-3 py-3 font-medium', className)} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(field)} className={cn('inline-flex items-center gap-1.5 hover:text-fg', active ? 'text-fg' : '')}>
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  )
}

export function MoviesPage() {
  useDocumentTitle('Movies')
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const qc = useQueryClient()
  const facets = useFacets()

  const sortParam = params.get('sort') as MovieSortField | null
  const sort: MovieSortField = sortParam && SORTABLE.includes(sortParam) ? sortParam : 'scraped_at'
  const order: SortOrder = params.get('order') === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const limit = [10, 25, 50, 100].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 25
  const source = params.get('source') ?? ''
  const category = params.get('category') ?? ''
  const stream = params.get('stream') ?? ''

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '')
  const search = useDebouncedValue(searchInput.trim(), 350)

  const update = (patch: Record<string, string>, resetPage = true) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        if (resetPage) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (search !== (params.get('search') ?? '')) update({ search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const movies = useMovies({
    page,
    limit,
    sort,
    order,
    search: params.get('search') || undefined,
    source: source || undefined,
    category: category || undefined,
    has_stream: stream === 'yes' ? true : stream === 'no' ? false : undefined,
  })

  const [toDelete, setToDelete] = useState<Movie | null>(null)
  const del = useMutation({
    mutationFn: (m: Movie) => adminApi.deleteMovie(m.tmdb_id),
    onSuccess: (_d, m) => {
      toast.success(`“${m.title}” was deleted.`)
      setToDelete(null)
      qc.invalidateQueries({ queryKey: ['movies'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })

  const onSort = (f: MovieSortField) => {
    if (f === sort) update({ order: order === 'asc' ? 'desc' : 'asc' })
    else update({ sort: f, order: f === 'title' ? 'asc' : 'desc' })
  }

  const data = movies.data

  return (
    <>
      <PageHeader title="Movies" description={data ? `${formatNumber(data.total)} matching movies` : 'Search, edit and remove catalog entries.'} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by title" aria-label="Search movies by title" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select aria-label="Filter by source" value={source} onChange={(e) => update({ source: e.target.value })} className="w-auto">
            <option value="">All sources</option>
            {facets.data?.sources.map((s) => (
              <option key={s.name} value={s.name}>
                {sourceLabel(s.name)}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by catalog tag" value={category} onChange={(e) => update({ category: e.target.value })} className="w-auto">
            <option value="">All tags</option>
            {facets.data?.categories.map((c) => (
              <option key={c.name} value={c.name}>
                {categoryLabel(c.name)}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by stream availability" value={stream} onChange={(e) => update({ stream: e.target.value })} className="w-auto">
            <option value="">Any stream status</option>
            <option value="yes">Has stream</option>
            <option value="no">No stream</option>
          </Select>
        </div>
        {movies.isFetching && !movies.isPending ? <Spinner className="h-4 w-4 text-fg-muted" label="Updating" /> : null}
      </div>

      {movies.isError ? (
        <ErrorState title="Could not load movies" error={movies.error} onRetry={() => movies.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-700 bg-ink-900">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-ink-700 bg-ink-850 text-xs uppercase tracking-wider text-fg-subtle">
                <tr>
                  <SortHeader field="title" label="Title" sort={sort} order={order} onSort={onSort} className="pl-4" />
                  <th scope="col" className="px-3 py-3 font-medium">Source</th>
                  <SortHeader field="year" label="Year" sort={sort} order={order} onSort={onSort} />
                  <SortHeader field="rating" label="Rating" sort={sort} order={order} onSort={onSort} />
                  <th scope="col" className="px-3 py-3 font-medium">Stream</th>
                  <SortHeader field="scraped_at" label="Added" sort={sort} order={order} onSort={onSort} />
                  <SortHeader field="updated_at" label="Updated" sort={sort} order={order} onSort={onSort} />
                  <th scope="col" className="px-3 py-3 pr-4 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className={cn('divide-y divide-ink-700', movies.isPlaceholderData && 'opacity-60')}>
                {movies.isPending || !data
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="px-4 py-3">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  : data.movies.map((m) => (
                      <tr key={m.tmdb_id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <Artwork src={m.poster_url} alt="" title={m.title} className="h-14 w-10 shrink-0 rounded" />
                            <div className="min-w-0">
                              <Link to={`/admin/movies/${encodeURIComponent(m.tmdb_id)}`} className="block max-w-[22rem] truncate font-medium text-fg hover:text-white" title={m.title}>
                                {m.title}
                              </Link>
                              <p className="font-mono text-xs text-fg-subtle">ID {m.tmdb_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge>{sourceLabel(m.source)}</Badge>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-fg-muted">{m.year || '—'}</td>
                        <td className="px-3 py-2.5 tabular-nums text-fg-muted">{formatRating(m.rating) ?? '—'}</td>
                        <td className="px-3 py-2.5">{hasStream(m) ? <Badge tone="ok">Ready</Badge> : <Badge tone="warn">None</Badge>}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{formatDate(m.scraped_at)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{formatDate(m.updated_at)}</td>
                        <td className="px-3 py-2.5 pr-4">
                          <div className="flex justify-end gap-1">
                            <a href={`/movie/${encodeURIComponent(m.tmdb_id)}`} target="_blank" rel="noreferrer" className="rounded-md p-2 text-fg-muted hover:bg-white/5 hover:text-fg" aria-label={`Open ${m.title} on the site`} title="View on site">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <Link to={`/admin/movies/${encodeURIComponent(m.tmdb_id)}`} className="rounded-md p-2 text-fg-muted hover:bg-white/5 hover:text-fg" aria-label={`Edit ${m.title}`} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button type="button" onClick={() => { del.reset(); setToDelete(m) }} className="rounded-md p-2 text-fg-muted hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${m.title}`} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {data && data.movies.length === 0 ? (
            <div className="p-6">
              <EmptyState compact title="No movies match these filters" />
            </div>
          ) : null}
          {data && data.total > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-700 px-4 py-3 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-fg-muted">
                <span>
                  {formatNumber((data.page - 1) * data.limit + 1)}–{formatNumber(Math.min(data.page * data.limit, data.total))} of {formatNumber(data.total)}
                </span>
                <Select aria-label="Rows per page" value={String(limit)} onChange={(e) => update({ limit: e.target.value })} className="h-8 w-auto text-xs">
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </Select>
              </div>
              <Pagination page={data.page} totalPages={data.total_pages} onChange={(p) => update({ page: String(p) }, false)} />
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete movie?"
        description={
          <>
            <strong className="text-fg">{toDelete?.title}</strong> will be removed from the catalog together with its stored subtitles and queued subtitle
            jobs. This cannot be undone, though a later scrape may add the movie again.
          </>
        }
        confirmLabel="Delete movie"
        loading={del.isPending}
        error={del.isError ? errorMessage(del.error) : null}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete)}
      />
    </>
  )
}
