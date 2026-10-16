// Mirrors the admin/auth/scraper/subtitle schemas in app/schemas.py and app/routers/scraper.py.

export interface AdminUser {
  id: number
  email: string
  display_name: string | null
  is_active: boolean
  is_superuser: boolean
  created_at: string | null
  last_login_at: string | null
}

export interface SessionResponse {
  admin: AdminUser
  expires_at: string | null
}

export interface CountByKey {
  key: string
  count: number
}

export interface ScraperError {
  tmdb_id?: string
  url?: string
  error: string
}

export interface ScraperState {
  is_running: boolean
  current_task: string
  scraped_count: number
  total_queued: number
  errors: ScraperError[]
  error_count?: number
}

export interface RecentMovie {
  tmdb_id: string
  title: string
  year: string
  source: string
  poster_url: string
  scraped_at: string | null
  has_stream: boolean
}

export interface AdminStats {
  total_movies: number
  with_stream: number
  without_stream: number
  by_source: CountByKey[]
  by_category: CountByKey[]
  top_genres: CountByKey[]
  recent_movies: RecentMovie[]
  subtitle_jobs: Record<string, number>
  generated_subtitles: number
  scraper: ScraperState
  admins: number
}

export interface MovieUpdate {
  title?: string
  year?: string
  rating?: string
  runtime?: string
  description?: string
  genres?: string[]
  categories?: string[]
  poster_url?: string
  backdrop_url?: string
  logo_url?: string
}

export interface AdminUserCreate {
  email: string
  password: string
  display_name?: string
  is_superuser: boolean
}

export interface AdminUserUpdate {
  display_name?: string
  is_active?: boolean
  is_superuser?: boolean
  password?: string
}

/** Catalog names accepted by POST /api/scrape/catalog (scraper_service.CATALOG_URLS). */
export const FLIXKISS_CATALOGS = [
  'popular', 'top_rated', 'now_playing', 'upcoming', 'trending', 'animation', 'anime', 'discover',
] as const

export interface CatalogScrapeRequest {
  category: string
  pages: number
  start_page: number
  limit: number
  skip_existing: boolean
  get_m3u8: boolean
}

export interface FawesomeScrapeRequest {
  limit: number
  offset: number
  only_with_stream: boolean
  skip_existing: boolean
}

export type SubtitleJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface SubtitleJob {
  id: number
  batch_id: number | null
  movie_tmdb_id: string
  source: string
  language: string
  mode: string
  subtitle_format: string
  status: SubtitleJobStatus
  stage: string | null
  progress: number
  attempts: number
  error_code: string | null
  error_message: string | null
  whisper_model: string | null
  created_at: string | null
  started_at: string | null
  finished_at: string | null
}

export interface SubtitleJobList {
  page: number
  limit: number
  total: number
  jobs: SubtitleJob[]
}

export interface SubtitleJobCreate {
  source: 'flixkiss' | 'fawesome' | 'all'
  language: string
  mode?: 'auto' | 'transcribe' | 'translate'
  retry_failed: boolean
  movie_ids: string[]
  limit: number
  offset: number
}

export interface SubtitleBatchCreated {
  batch_id: number
  queued: number
  skipped: number
  skipped_details: Record<string, string>
  job_ids: number[]
}
