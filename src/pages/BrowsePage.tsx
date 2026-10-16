import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useFacets, useMovies } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { MovieGrid, MovieGridSkeleton } from '@/components/movies/MovieGrid'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { categoryLabel, formatNumber, sourceLabel } from '@/lib/format'
import type { MovieSortField, SortOrder } from '@/types/movie'

const PAGE_SIZE = 30

const SORTS: Array<{ value: string; label: string; sort: MovieSortField; order: SortOrder }> = [
  { value: 'scraped_at', label: 'Recently added', sort: 'scraped_at', order: 'desc' },
  { value: 'rating', label: 'Highest rated', sort: 'rating', order: 'desc' },
  { value: 'year', label: 'Newest release', sort: 'year', order: 'desc' },
  { value: 'year_asc', label: 'Oldest release', sort: 'year', order: 'asc' },
  { value: 'title', label: 'Title A–Z', sort: 'title', order: 'asc' },
]

export function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const genre = params.get('genre') ?? ''
  const category = params.get('category') ?? ''
  const source = params.get('source') ?? ''
  const sortKey = params.get('sort') ?? 'scraped_at'
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const sort = SORTS.find((s) => s.value === sortKey) ?? SORTS[0]

  const facets = useFacets()
  const movies = useMovies({
    search: q || undefined,
    genre: genre || undefined,
    category: category || undefined,
    source: source || undefined,
    sort: sort.sort,
    order: sort.order,
    page,
    limit: PAGE_SIZE,
  })

  const heading = q ? `Results for “${q}”` : genre || (category ? categoryLabel(category) : source ? sourceLabel(source) : 'All movies')
  useDocumentTitle(q ? `Search: ${q}` : heading)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const activeFilters = [
    q && { key: 'q', label: `“${q}”` },
    genre && { key: 'genre', label: genre },
    category && { key: 'category', label: categoryLabel(category) },
    source && { key: 'source', label: sourceLabel(source) },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  const data = movies.data

  return (
    <div className="px-4 pb-8 pt-24 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="flex items-center gap-2 text-sm text-fg-muted" aria-live="polite">
          {data ? `${formatNumber(data.total)} ${data.total === 1 ? 'movie' : 'movies'}` : ' '}
          {movies.isFetching && !movies.isPending ? <Spinner className="h-3.5 w-3.5" label="Updating results" /> : null}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Select aria-label="Genre" value={genre} onChange={(e) => update({ genre: e.target.value })} className="w-auto min-w-36" disabled={!facets.data}>
          <option value="">All genres</option>
          {facets.data?.genres.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name} ({g.count})
            </option>
          ))}
        </Select>
        {facets.data && facets.data.categories.length > 0 ? (
          <Select aria-label="Category" value={category} onChange={(e) => update({ category: e.target.value })} className="w-auto min-w-36">
            <option value="">All categories</option>
            {facets.data.categories.map((c) => (
              <option key={c.name} value={c.name}>
                {categoryLabel(c.name)} ({c.count})
              </option>
            ))}
          </Select>
        ) : null}
        {facets.data && facets.data.sources.length > 1 ? (
          <Select aria-label="Source" value={source} onChange={(e) => update({ source: e.target.value })} className="w-auto min-w-36">
            <option value="">All sources</option>
            {facets.data.sources.map((s) => (
              <option key={s.name} value={s.name}>
                {sourceLabel(s.name)} ({s.count})
              </option>
            ))}
          </Select>
        ) : null}
        <Select aria-label="Sort by" value={sort.value} onChange={(e) => update({ sort: e.target.value === 'scraped_at' ? '' : e.target.value })} className="w-auto min-w-40 sm:ml-auto">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {activeFilters.length ? (
        <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => update({ [f.key]: '' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-sm text-fg hover:bg-white/12"
              aria-label={`Remove filter ${f.label}`}
            >
              {f.label}
              <X className="h-3.5 w-3.5 text-fg-muted" />
            </button>
          ))}
          {activeFilters.length > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams())}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      {movies.isError ? (
        <ErrorState title="Could not load movies" error={movies.error} onRetry={() => movies.refetch()} />
      ) : movies.isPending || !data ? (
        <MovieGridSkeleton count={18} />
      ) : data.movies.length === 0 ? (
        <EmptyState
          title={q ? 'No movies match your search' : 'No movies here yet'}
          description={q ? 'Check the spelling or try a shorter title.' : 'Try removing a filter.'}
          action={
            activeFilters.length ? (
              <Button variant="secondary" size="sm" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={movies.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <MovieGrid movies={data.movies} />
          <Pagination className="mt-12" page={data.page} totalPages={data.total_pages} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
        </div>
      )}
    </div>
  )
}
