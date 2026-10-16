import { request } from './client'
import type { Movie } from '@/types/movie'
import type {
  AdminStats, AdminUser, AdminUserCreate, AdminUserUpdate, CatalogScrapeRequest, FawesomeScrapeRequest,
  MovieUpdate, ScraperState, SubtitleBatchCreated, SubtitleJob, SubtitleJobCreate, SubtitleJobList,
} from '@/types/admin'

export const adminApi = {
  stats: (signal?: AbortSignal) => request<AdminStats>('/api/admin/stats', { signal }),
  updateMovie: (id: string, body: MovieUpdate) =>
    request<Movie>(`/api/admin/movies/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  deleteMovie: (id: string) => request<void>(`/api/admin/movies/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  users: (signal?: AbortSignal) => request<AdminUser[]>('/api/admin/users', { signal }),
  createUser: (body: AdminUserCreate) => request<AdminUser>('/api/admin/users', { method: 'POST', body }),
  updateUser: (id: number, body: AdminUserUpdate) => request<AdminUser>(`/api/admin/users/${id}`, { method: 'PATCH', body }),
}

// Pre-existing scraper endpoints (app/routers/scraper.py)
export const scraperApi = {
  status: (signal?: AbortSignal) => request<ScraperState>('/api/scrape/status', { signal }),
  catalog: (body: CatalogScrapeRequest) =>
    request<{ status: string; queued_movies: number; category: string; message: string }>('/api/scrape/catalog', {
      method: 'POST',
      body,
    }),
  movie: (tmdbId: string) =>
    request<{ status: string; movie: Partial<Movie> }>(`/api/scrape/movie/${encodeURIComponent(tmdbId)}`, { method: 'POST' }),
  fawesomeCatalog: (body: FawesomeScrapeRequest) =>
    request<{ status: string; movies_on_site: number; queued_movies: number; candidates_to_scan: number; message: string }>(
      '/api/scrape/fawesome/catalog',
      { method: 'POST', body },
    ),
  fawesomeMovie: (id: string) =>
    request<{ status: string; movie: Partial<Movie> }>(`/api/scrape/fawesome/movie/${encodeURIComponent(id)}`, {
      method: 'POST',
    }),
}

// Pre-existing subtitle generation endpoints (app/routers/subtitle_jobs.py)
export interface SubtitleJobQuery {
  page?: number
  limit?: number
  status?: string
  source?: string
  language?: string
  movie_id?: string
}

export const subtitleJobsApi = {
  list: (query: SubtitleJobQuery, signal?: AbortSignal) =>
    request<SubtitleJobList>('/api/subtitle-jobs', { query: { ...query }, signal }),
  create: (body: SubtitleJobCreate) => request<SubtitleBatchCreated>('/api/subtitle-jobs', { method: 'POST', body }),
  retry: (id: number) => request<SubtitleJob>(`/api/subtitle-jobs/${id}/retry`, { method: 'POST' }),
}
