import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { Movie } from '@/types/movie'
import { cn, formatRating } from '@/lib/format'
import { Artwork } from './Artwork'
import { Skeleton } from '@/components/ui/Feedback'

export function RatingPill({ rating, className }: { rating: string; className?: string }) {
  const value = formatRating(rating)
  if (!value) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold text-gold', className)} aria-label={`Rated ${value} out of 10`}>
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      {value}
    </span>
  )
}

type CardMovie = Pick<Movie, 'tmdb_id' | 'title' | 'year' | 'rating' | 'genres' | 'poster_url' | 'm3u8_url'>

export function MovieCard({ movie, className }: { movie: CardMovie; className?: string }) {
  const genre = movie.genres?.[0]
  return (
    <Link
      to={`/movie/${encodeURIComponent(movie.tmdb_id)}`}
      className={cn('group flex flex-col gap-2 rounded-card focus-visible:outline-offset-4', className)}
    >
      <div className="relative">
        <Artwork
          src={movie.poster_url}
          alt={`${movie.title} poster`}
          title={movie.title}
          className="aspect-[2/3] w-full rounded-card ring-1 ring-white/5 transition duration-300 group-hover:ring-white/25"
          imgClassName="transition duration-500 group-hover:scale-[1.04]"
        />
        {!movie.m3u8_url ? (
          <span className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            No stream
          </span>
        ) : null}
      </div>
      <div className="min-w-0 px-0.5">
        <h3 className="truncate text-sm font-medium text-fg group-hover:text-white" title={movie.title}>
          {movie.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
          {movie.year ? <span>{movie.year}</span> : null}
          <RatingPill rating={movie.rating} />
          {genre ? <span className="truncate">{genre}</span> : null}
        </div>
      </div>
    </Link>
  )
}

export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      <Skeleton className="aspect-[2/3] w-full rounded-card" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}
