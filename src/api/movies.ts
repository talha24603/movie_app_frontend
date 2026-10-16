import { request } from './client'
import type { Movie, MovieFacets, MovieList, MovieQuery } from '@/types/movie'

export const moviesApi = {
  list: (query: MovieQuery, signal?: AbortSignal) => request<MovieList>('/api/movies', { query: { ...query }, signal }),
  get: (id: string, signal?: AbortSignal) => request<Movie>(`/api/movies/${encodeURIComponent(id)}`, { signal }),
  related: (id: string, limit = 12, signal?: AbortSignal) =>
    request<Movie[]>(`/api/movies/${encodeURIComponent(id)}/related`, { query: { limit }, signal }),
  facets: (signal?: AbortSignal) => request<MovieFacets>('/api/movies/facets', { signal }),
}
