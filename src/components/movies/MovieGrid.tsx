import type { Movie } from '@/types/movie'
import { MovieCard, MovieCardSkeleton } from './MovieCard'

const gridClasses = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className={gridClasses}>
      {movies.map((m) => (
        <MovieCard key={m.tmdb_id} movie={m} />
      ))}
    </div>
  )
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={gridClasses} aria-busy="true" aria-label="Loading movies">
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}
