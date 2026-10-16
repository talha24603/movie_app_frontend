import { useMemo } from 'react'
import { useFacets, useMovies } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { HeroBanner, HeroFallback, HeroSkeleton } from '@/components/movies/HeroBanner'
import { QueryMovieRow } from '@/components/movies/MovieRow'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { categoryLabel } from '@/lib/format'
import type { MovieQuery } from '@/types/movie'

const GENRE_ROWS = 8
const MIN_GENRE_SIZE = 3

interface RowSpec {
  key: string
  title: string
  query: MovieQuery
  href: string
}

export function HomePage() {
  useDocumentTitle('Home')
  const facets = useFacets()
  const data = facets.data

  // Featured: streamable titles from the "popular" catalog tag when the data has one, else the newest.
  const featuredQuery: MovieQuery | null = data
    ? data.categories.some((c) => c.name === 'popular')
      ? { category: 'popular', has_stream: true, limit: 12 }
      : { has_stream: true, limit: 12 }
    : null
  const featured = useMovies(featuredQuery ?? {}, { enabled: Boolean(featuredQuery) })
  const heroMovies = useMemo(
    () => (featured.data?.movies ?? []).filter((m) => m.backdrop_url).slice(0, 5),
    [featured.data],
  )

  const rows = useMemo<RowSpec[]>(() => {
    if (!data) return []
    const out: RowSpec[] = [{ key: 'recent', title: 'Recently Added', query: { sort: 'scraped_at', order: 'desc' }, href: '/browse?sort=scraped_at' }]
    for (const c of data.categories) {
      out.push({ key: `cat-${c.name}`, title: categoryLabel(c.name), query: { category: c.name }, href: `/browse?category=${encodeURIComponent(c.name)}` })
    }
    // Ratings are only comparable within one source (FlixKiss carries TMDB scores; other sources use their own scales)
    if (data.sources.some((s) => s.name === 'flixkiss')) {
      out.push({ key: 'top', title: 'Top Rated', query: { source: 'flixkiss', sort: 'rating', order: 'desc' }, href: '/browse?source=flixkiss&sort=rating' })
    }
    for (const g of data.genres.filter((g) => g.count >= MIN_GENRE_SIZE).slice(0, GENRE_ROWS)) {
      out.push({ key: `genre-${g.name}`, title: g.name, query: { genre: g.name }, href: `/browse?genre=${encodeURIComponent(g.name)}` })
    }
    return out
  }, [data])

  if (facets.isError) {
    return (
      <div className="px-4 pt-28 sm:px-8 lg:px-12">
        <ErrorState title="The catalog is unavailable" error={facets.error} onRetry={() => facets.refetch()} />
      </div>
    )
  }

  if (data && data.total === 0) {
    return (
      <div className="px-4 pt-28 sm:px-8 lg:px-12">
        <EmptyState title="No movies yet" description="The catalog is empty. Movies appear here once they have been scraped from a source." />
      </div>
    )
  }

  return (
    <>
      {facets.isPending || featured.isPending ? <HeroSkeleton /> : heroMovies.length ? <HeroBanner movies={heroMovies} /> : <HeroFallback />}
      <div className="relative z-10 -mt-10 space-y-10 sm:-mt-14 sm:space-y-12">
        {rows.map((r) => (
          <QueryMovieRow key={r.key} title={r.title} query={r.query} seeAllHref={r.href} />
        ))}
      </div>
    </>
  )
}
