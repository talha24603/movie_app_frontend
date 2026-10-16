import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import type { MovieQuery } from '@/types/movie'

export const queryKeys = {
  movies: (q: MovieQuery) => ['movies', 'list', q] as const,
  movie: (id: string) => ['movies', 'detail', id] as const,
  related: (id: string) => ['movies', 'related', id] as const,
  facets: ['movies', 'facets'] as const,
  session: ['auth', 'session'] as const,
  stats: ['admin', 'stats'] as const,
  scraperStatus: ['admin', 'scraper-status'] as const,
  subtitleJobs: (q: object) => ['admin', 'subtitle-jobs', q] as const,
  admins: ['admin', 'users'] as const,
}

/** Paginated catalog query. The AbortSignal cancels obsolete requests (e.g. while typing a search). */
export function useMovies(query: MovieQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.movies(query),
    queryFn: ({ signal }) => moviesApi.list(query, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useMovie(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.movie(id ?? ''),
    queryFn: ({ signal }) => moviesApi.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useRelatedMovies(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.related(id ?? ''),
    queryFn: ({ signal }) => moviesApi.related(id!, 12, signal),
    enabled: Boolean(id),
  })
}

export function useFacets() {
  return useQuery({
    queryKey: queryKeys.facets,
    queryFn: ({ signal }) => moviesApi.facets(signal),
    staleTime: 5 * 60_000,
  })
}
