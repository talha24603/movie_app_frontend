import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Play } from 'lucide-react'
import type { Movie } from '@/types/movie'
import { cn, hasStream } from '@/lib/format'
import { ButtonLink } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { RatingPill } from './MovieCard'

const ROTATE_MS = 9000

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function HeroBanner({ movies }: { movies: Movie[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = movies.length

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [count, paused])

  const movie = movies[Math.min(index, count - 1)]
  if (!movie) return null
  const detailHref = `/movie/${encodeURIComponent(movie.tmdb_id)}`
  const backdrop = movie.backdrop_url || movie.poster_url

  return (
    <section
      className="relative isolate flex min-h-[68vh] items-end overflow-hidden sm:min-h-[76vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured movies"
    >
      {/* Artwork layers (cross-fade) */}
      <div className="absolute inset-0 -z-10">
        {movies.map((m, i) => {
          const src = m.backdrop_url || m.poster_url
          return src ? (
            <img
              key={m.tmdb_id}
              src={src}
              alt=""
              aria-hidden="true"
              loading={i === 0 ? 'eager' : 'lazy'}
              className={cn('absolute inset-0 h-full w-full object-cover object-[center_20%] transition-opacity duration-1000', i === index ? 'opacity-100' : 'opacity-0')}
            />
          ) : null
        })}
        {!backdrop ? <div className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-850 to-ink-950" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/35 to-transparent" />
      </div>

      <div className="w-full px-4 pb-14 pt-32 sm:px-8 sm:pb-20 lg:px-12" aria-live="polite">
        <div className="max-w-2xl">
          {movie.logo_url ? (
            <img src={movie.logo_url} alt={movie.title} className="mb-5 max-h-28 max-w-[min(26rem,80%)] object-contain object-left drop-shadow-2xl sm:max-h-36" />
          ) : (
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">{movie.title}</h1>
          )}
          {movie.logo_url ? <h1 className="sr-only">{movie.title}</h1> : null}

          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <RatingPill rating={movie.rating} className="text-sm" />
            {movie.year ? <span>{movie.year}</span> : null}
            {movie.runtime ? <span>{movie.runtime}</span> : null}
            {movie.genres.slice(0, 3).map((g) => (
              <span key={g} className="before:mr-3 before:text-fg-subtle before:content-['•']">
                {g}
              </span>
            ))}
          </div>

          {movie.description ? <p className="mb-7 line-clamp-3 max-w-xl text-base leading-relaxed text-fg/85 sm:text-lg">{movie.description}</p> : null}

          <div className="flex flex-wrap gap-3">
            {hasStream(movie) ? (
              <ButtonLink to={detailHref} size="lg" icon={<Play className="h-5 w-5 fill-current" />} state={{ autoplay: true }}>
                Play
              </ButtonLink>
            ) : null}
            <ButtonLink to={detailHref} size="lg" variant="secondary" icon={<Info className="h-5 w-5" />}>
              More info
            </ButtonLink>
          </div>
        </div>

        {count > 1 ? (
          <div className="mt-10 flex gap-2" role="tablist" aria-label="Choose featured movie">
            {movies.map((m, i) => (
              <button
                key={m.tmdb_id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={m.title}
                onClick={() => setIndex(i)}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-8 bg-white' : 'w-4 bg-white/35 hover:bg-white/60')}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <div className="relative flex min-h-[68vh] items-end bg-ink-900 px-4 pb-20 sm:min-h-[76vh] sm:px-8 lg:px-12" aria-hidden="true">
      <div className="w-full max-w-2xl space-y-4">
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-3 pt-3">
          <Skeleton className="h-12 w-28 rounded-lg" />
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function HeroFallback() {
  return (
    <section className="flex min-h-[44vh] items-end bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 px-4 pb-14 pt-28 sm:px-8 lg:px-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Movies, ready to stream.</h1>
        <p className="mt-3 text-fg-muted">
          Browse the catalog below, or <Link to="/browse" className="text-fg underline underline-offset-4 hover:text-white">search every title</Link>.
        </p>
      </div>
    </section>
  )
}
