import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Movie, MovieQuery } from '@/types/movie'
import { useMovies } from '@/hooks/queries'
import { useInViewOnce } from '@/hooks/useInView'
import { ErrorState } from '@/components/ui/Feedback'
import { MovieCard, MovieCardSkeleton } from './MovieCard'

const cardWidth = 'w-[36vw] min-w-[128px] max-w-[176px] sm:w-[24vw] md:w-[18vw] lg:w-[13vw] xl:w-[11vw]'

interface RowShellProps {
  title: string
  seeAllHref?: string
  children: React.ReactNode
}

function RowShell({ title, seeAllHref, children }: RowShellProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = scroller.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const arrow =
    'absolute top-0 z-10 hidden h-[calc(100%-3.25rem)] w-12 items-center justify-center text-white opacity-0 transition-opacity ' +
    'group-hover/row:opacity-100 focus-visible:opacity-100 disabled:!opacity-0 md:flex'

  return (
    <section className="group/row relative" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{title}</h2>
        {seeAllHref ? (
          <Link to={seeAllHref} className="shrink-0 text-sm text-fg-muted hover:text-fg">
            See all
          </Link>
        ) : null}
      </div>
      <div className="relative">
        <button type="button" aria-label={`Scroll ${title} left`} onClick={() => scrollBy(-1)} disabled={edges.start} className={`${arrow} left-0 bg-gradient-to-r from-ink-950 to-transparent`}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <div ref={scroller} onScroll={update} className="scrollbar-none flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-12 lg:px-12">
          {children}
        </div>
        <button type="button" aria-label={`Scroll ${title} right`} onClick={() => scrollBy(1)} disabled={edges.end} className={`${arrow} right-0 bg-gradient-to-l from-ink-950 to-transparent`}>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>
    </section>
  )
}

export function StaticMovieRow({ title, movies, seeAllHref }: { title: string; movies: Movie[]; seeAllHref?: string }) {
  if (!movies.length) return null
  return (
    <RowShell title={title} seeAllHref={seeAllHref}>
      {movies.map((m) => (
        <MovieCard key={m.tmdb_id} movie={m} className={`${cardWidth} shrink-0 snap-start`} />
      ))}
    </RowShell>
  )
}

interface QueryMovieRowProps {
  title: string
  query: MovieQuery
  seeAllHref?: string
}

/** A row backed by GET /api/movies; fetches only once scrolled near the viewport. Hidden when empty. */
export function QueryMovieRow({ title, query, seeAllHref }: QueryMovieRowProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  const { data, isPending, isError, error, refetch } = useMovies({ limit: 20, ...query }, { enabled: inView })

  if (data && data.movies.length === 0) return null

  return (
    <div ref={ref}>
      {isError ? (
        <div className="px-4 sm:px-8 lg:px-12">
          <h2 className="mb-3 text-lg font-semibold">{title}</h2>
          <ErrorState compact title={`Could not load ${title}`} error={error} onRetry={() => refetch()} />
        </div>
      ) : isPending || !data ? (
        <RowShell title={title}>
          {Array.from({ length: 8 }, (_, i) => (
            <MovieCardSkeleton key={i} className={`${cardWidth} shrink-0`} />
          ))}
        </RowShell>
      ) : (
        <StaticMovieRow title={title} movies={data.movies} seeAllHref={data.total > data.movies.length ? seeAllHref : undefined} />
      )}
    </div>
  )
}
