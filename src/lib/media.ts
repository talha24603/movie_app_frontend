import { API_BASE, apiUrl, rebaseApiUrl } from '@/api/client'
import type { Movie, SubtitleTrack } from '@/types/movie'
import { hasStream } from './format'

/**
 * Upstream CDNs require Referer/Origin headers browsers cannot send, so playback always goes through the
 * backend's HLS proxy. Raw upstream URLs are never handed to the player.
 */
export interface StreamCandidate {
  url: string
  label: string
}

/**
 * Fawesome rows store one rendition's playlist (".../hls-mi/<name>.m3u8"); the master playlist listing every
 * rendition sits one directory up under the same name. Mirrors app/templates/fawesome.html.
 */
export function fawesomeMasterUrl(m3u8: string): string | null {
  const m = m3u8.match(/^(.*)\/hls-[a-z]+\/([^/?]+)$/i)
  return m ? `${m[1]}/${m[2]}` : null
}

/** Ordered list of sources to try; the player falls back to the next one on a fatal error. */
export function streamCandidates(movie: Pick<Movie, 'tmdb_id' | 'source' | 'm3u8_url' | 'player_url' | 'page_url'>): StreamCandidate[] {
  if (!hasStream(movie)) return []
  const direct: StreamCandidate = {
    url: `${API_BASE}/api/movies/${encodeURIComponent(movie.tmdb_id)}/play.m3u8`,
    label: 'Default',
  }
  if (movie.source === 'fawesome') {
    const master = fawesomeMasterUrl(movie.m3u8_url)
    if (master) {
      return [
        { url: apiUrl('/api/stream/proxy', { url: master, referer: movie.player_url || movie.page_url || '' }), label: 'Adaptive' },
        direct,
      ]
    }
  }
  return [direct]
}

export interface PlayerTrack {
  src: string
  label: string
  srcLang?: string
}

export function subtitleTracks(subtitles: SubtitleTrack[] | undefined): PlayerTrack[] {
  const seen = new Set<string>()
  return (subtitles ?? [])
    .filter((s) => s.url)
    .map((s, i) => {
      let label = s.language || `Track ${i + 1}`
      if (seen.has(label)) label = `${label} (${i + 1})`
      seen.add(label)
      return { src: rebaseApiUrl(s.url), label, srcLang: s.language_code }
    })
}
