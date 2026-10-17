// Mirrors app/schemas.py (MovieResponse, MovieListResponse, MovieFacetsResponse). Field names are the API's.

export type MovieSource = 'flixkiss' | 'fawesome' | (string & {})

export interface CastMember {
  name?: string
  role?: string
  photo?: string
}

export interface SubtitleTrack {
  language?: string
  language_code?: string
  url: string
  source_url?: string
  auto_generated?: boolean
  generated?: boolean
}

export interface Movie {
  /** Primary key. A TMDB id for FlixKiss rows, the Fawesome id for Fawesome rows. */
  tmdb_id: string
  source: MovieSource
  title: string
  year: string
  rating: string
  runtime: string
  genres: string[]
  categories: string[]
  description: string
  cast: CastMember[]
  poster_url: string
  backdrop_url: string
  logo_url: string
  page_url: string
  m3u8_url: string
  player_url: string
  download_url: string
  subtitles: SubtitleTrack[]
  /** Admin switch: inactive movies are hidden from the public site. */
  is_active: boolean
  proxied_stream_url: string
  direct_play_url: string
  scraped_at: string | null
  updated_at: string | null
}

export interface MovieList {
  page: number
  limit: number
  total: number
  total_pages: number
  movies: Movie[]
}

export interface FacetItem {
  name: string
  count: number
}

export interface MovieFacets {
  total: number
  sources: FacetItem[]
  categories: FacetItem[]
  genres: FacetItem[]
}

export type MovieSortField = 'scraped_at' | 'updated_at' | 'title' | 'year' | 'rating'
export type SortOrder = 'asc' | 'desc'

export interface MovieQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  genre?: string
  source?: string
  has_stream?: boolean
  /** Honoured for admin sessions only; the default (and every public caller) is active movies only. */
  status?: 'active' | 'inactive' | 'all'
  sort?: MovieSortField
  order?: SortOrder
}
