import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Captions, Clock, ExternalLink, Film, Star } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useMovie, useRelatedMovies } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { Artwork } from '@/components/movies/Artwork'
import { StaticMovieRow } from '@/components/movies/MovieRow'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Button, ButtonLink } from '@/components/ui/Button'
import { categoryLabel, formatDate, formatRating, hasStream, sourceLabel } from '@/lib/format'
import { streamCandidates, subtitleTracks } from '@/lib/media'
import type { Movie } from '@/types/movie'

function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  // Go back when we came from inside the app (keeps scroll position and filters), else to the catalog
  const canGoBack = location.key !== 'default'
  return canGoBack ? (
    <Button variant="ghost" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />} className="-ml-3">
      Back to catalog
    </Button>
  ) : (
    <ButtonLink to="/" variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} className="-ml-3">
      Back to catalog
    </ButtonLink>
  )
}

function NoStream({ movie }: { movie: Movie }) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/5">
      {movie.backdrop_url ? <img src={movie.backdrop_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" /> : null}
      <div className="relative flex max-w-md flex-col items-center gap-3 p-6 text-center" role="status">
        <Film className="h-10 w-10 text-fg-subtle" aria-hidden="true" />
        <p className="text-lg font-semibold">Not available to stream</p>
        <p className="text-sm text-fg-muted">No playable source has been found for this title yet. It may be region-restricted at the source, or still waiting to be scraped.</p>
      </div>
    </div>
  )
}

function MoviePageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-8" aria-busy="true" aria-label="Loading movie">
      <Skeleton className="mb-4 h-8 w-36" />
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="mt-8 grid gap-8 md:grid-cols-[180px_1fr]">
        <Skeleton className="hidden aspect-[2/3] rounded-card md:block" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}

export function MoviePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const movieQuery = useMovie(id)
  const related = useRelatedMovies(id)
  const movie = movieQuery.data
  useDocumentTitle(movie?.title)

  const sources = useMemo(() => (movie ? streamCandidates(movie) : []), [movie])
  const tracks = useMemo(() => subtitleTracks(movie?.subtitles), [movie])
  const autoplay = Boolean((location.state as { autoplay?: boolean } | null)?.autoplay)

  if (movieQuery.isPending) return <MoviePageSkeleton />

  if (movieQuery.isError || !movie) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28 sm:px-8">
        <BackButton />
        <div className="mt-4">
          {notFound ? (
            <EmptyState title="Movie not found" description="It may have been removed from the catalog." action={<ButtonLink to="/browse" variant="secondary" size="sm">Browse movies</ButtonLink>} />
          ) : (
            <ErrorState title="Could not load this movie" error={movieQuery.error} onRetry={() => movieQuery.refetch()} />
          )}
        </div>
      </div>
    )
  }

  const rating = formatRating(movie.rating)
  const cast = movie.cast.filter((c) => c.name)
  const subtitleLanguages = [...new Set(movie.subtitles.map((s) => s.language).filter(Boolean))] as string[]

  return (
    <div className="relative">
      {/* Ambient backdrop */}
      {movie.backdrop_url ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh] overflow-hidden" aria-hidden="true">
          <img src={movie.backdrop_url} alt="" className="h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/80 to-ink-950" />
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-8">
        <div className="mb-3">
          <BackButton />
        </div>

        {hasStream(movie) ? (
          <VideoPlayer key={movie.tmdb_id} sources={sources} tracks={tracks} poster={movie.backdrop_url || movie.poster_url} title={movie.title} autoPlay={autoplay} />
        ) : (
          <NoStream movie={movie} />
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-[180px_1fr] lg:gap-10">
          <Artwork src={movie.poster_url} alt={`${movie.title} poster`} title={movie.title} className="hidden aspect-[2/3] rounded-card shadow-card ring-1 ring-white/10 md:block" loading="eager" />

          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{movie.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
              {rating ? (
                <span className="inline-flex items-center gap-1 font-semibold text-gold" aria-label={`Rated ${rating} out of 10`}>
                  <Star className="h-4 w-4 fill-current" aria-hidden="true" /> {rating}
                  <span className="font-normal text-fg-subtle">/ 10</span>
                </span>
              ) : null}
              {movie.year ? <span>{movie.year}</span> : null}
              {movie.runtime ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden="true" /> {movie.runtime}
                </span>
              ) : null}
              <Badge>{sourceLabel(movie.source)}</Badge>
            </div>

            {movie.genres.length || movie.categories.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-fg hover:border-white/30 hover:bg-white/5">
                    {g}
                  </Link>
                ))}
                {movie.categories.map((c) => (
                  <Link key={c} to={`/browse?category=${encodeURIComponent(c)}`} className="rounded-full bg-brand-500/10 px-3 py-1 text-sm text-brand-400 hover:bg-brand-500/20">
                    {categoryLabel(c)}
                  </Link>
                ))}
              </div>
            ) : null}

            {movie.description ? <p className="mt-6 max-w-3xl text-base leading-relaxed text-fg/85">{movie.description}</p> : null}

            <dl className="mt-6 grid max-w-3xl gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {subtitleLanguages.length ? (
                <div className="sm:col-span-2">
                  <dt className="mb-1 inline-flex items-center gap-1.5 text-fg-subtle">
                    <Captions className="h-4 w-4" aria-hidden="true" /> Subtitles
                  </dt>
                  <dd className="text-fg-muted">
                    {subtitleLanguages.slice(0, 12).join(', ')}
                    {subtitleLanguages.length > 12 ? ` and ${subtitleLanguages.length - 12} more` : ''}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-fg-subtle">Added</dt>
                <dd className="text-fg-muted">{formatDate(movie.scraped_at)}</dd>
              </div>
              {movie.page_url ? (
                <div>
                  <dt className="text-fg-subtle">Source</dt>
                  <dd>
                    <a href={movie.page_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-fg-muted hover:text-white">
                      View on {sourceLabel(movie.source)} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        {cast.length ? (
          <section className="mt-12" aria-labelledby="cast-heading">
            <h2 id="cast-heading" className="mb-4 text-lg font-semibold">
              Cast
            </h2>
            <ul className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 md:grid-cols-6 lg:grid-cols-8">
              {cast.slice(0, 16).map((c, i) => (
                <li key={`${c.name}-${i}`} className="w-24 shrink-0 sm:w-auto">
                  <Artwork src={c.photo} alt={c.name ?? ''} title={c.name ?? ''} className="aspect-square w-full rounded-full ring-1 ring-white/10" />
                  <p className="mt-2 truncate text-center text-sm font-medium text-fg" title={c.name}>
                    {c.name}
                  </p>
                  {c.role ? (
                    <p className="truncate text-center text-xs text-fg-subtle" title={c.role}>
                      {c.role}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {related.data && related.data.length ? (
        <div className="mt-14">
          <StaticMovieRow title="More like this" movies={related.data} />
        </div>
      ) : null}
    </div>
  )
}
