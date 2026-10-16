import type { Movie } from '@/types/movie'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Ratings are stored as strings ("7.3", "6", "" or "0.0" when unknown). Returns null when not meaningful. */
export function parseRating(rating: string | null | undefined): number | null {
  if (!rating) return null
  const n = Number.parseFloat(rating)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(n, 10)
}

export function formatRating(rating: string | null | undefined): string | null {
  const n = parseRating(rating)
  return n === null ? null : n.toFixed(1)
}

/** Category tags are snake_case catalog names (popular, top_rated, now_playing...). */
const CATEGORY_LABELS: Record<string, string> = {
  popular: 'Popular',
  top_rated: 'Top Rated',
  now_playing: 'Now Playing',
  upcoming: 'Upcoming',
  trending: 'Trending',
  animation: 'Animation',
  anime: 'Anime',
  discover: 'Discover',
}

export function categoryLabel(tag: string): string {
  return CATEGORY_LABELS[tag] ?? tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const SOURCE_LABELS: Record<string, string> = { flixkiss: 'FlixKiss', fawesome: 'Fawesome' }

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.charAt(0).toUpperCase() + source.slice(1)
}

export function hasStream(movie: Pick<Movie, 'm3u8_url'>): boolean {
  return Boolean(movie.m3u8_url && movie.m3u8_url.trim())
}

/** Seconds -> "1:02:03" / "4:05". */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const s = Math.floor(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return (withTime ? dateTimeFmt : dateFmt).format(d)
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = (t - now) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return formatDate(iso)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter((w) => /\w/.test(w))
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')
}
