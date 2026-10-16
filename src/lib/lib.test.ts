import { describe, expect, it } from 'vitest'
import { categoryLabel, formatClock, formatRating, initials, parseRating } from './format'
import { fawesomeMasterUrl, streamCandidates, subtitleTracks } from './media'
import { pageWindow } from './pagination'
import { safeNext } from './redirect'
import { makeMovie } from '@/test/utils'

describe('format', () => {
  it('parses string ratings and hides unknown ones', () => {
    expect(parseRating('7.3')).toBe(7.3)
    expect(parseRating('6')).toBe(6)
    expect(parseRating('0.0')).toBeNull()
    expect(parseRating('')).toBeNull()
    expect(parseRating('N/A')).toBeNull()
    expect(formatRating('8')).toBe('8.0')
  })

  it('formats clock times', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })

  it('labels catalog tags', () => {
    expect(categoryLabel('top_rated')).toBe('Top Rated')
    expect(categoryLabel('some_new_tag')).toBe('Some New Tag')
  })

  it('builds initials', () => {
    expect(initials('The Matrix')).toBe('TM')
    expect(initials('Up')).toBe('U')
  })
})

describe('media', () => {
  it('derives the Fawesome master playlist', () => {
    expect(fawesomeMasterUrl('https://cdn/files/x/hls-mi/s1.m3u8')).toBe('https://cdn/files/x/s1.m3u8')
    expect(fawesomeMasterUrl('https://cdn/files/x/s1.m3u8')).toBeNull()
  })

  it('routes FlixKiss playback through the play.m3u8 proxy only', () => {
    const c = streamCandidates(makeMovie({ tmdb_id: '99', source: 'flixkiss' }))
    expect(c.map((s) => s.url)).toEqual(['/api/movies/99/play.m3u8'])
  })

  it('tries the Fawesome master first, then falls back', () => {
    const c = streamCandidates(
      makeMovie({ tmdb_id: '7', source: 'fawesome', m3u8_url: 'https://cdn/a/hls-mi/s7.m3u8', player_url: 'https://fawesome.tv/movies/7' }),
    )
    expect(c).toHaveLength(2)
    expect(c[0].url).toMatch(/^\/api\/stream\/proxy\?url=https%3A%2F%2Fcdn%2Fa%2Fs7.m3u8&referer=/)
    expect(c[1].url).toBe('/api/movies/7/play.m3u8')
  })

  it('never offers a source without a stream, and never exposes the raw upstream URL', () => {
    expect(streamCandidates(makeMovie({ m3u8_url: '' }))).toEqual([])
    const c = streamCandidates(makeMovie({ m3u8_url: 'https://cdn.example/x.m3u8' }))
    expect(c.every((s) => s.url.startsWith('/api/'))).toBe(true)
  })

  it('re-roots API subtitle URLs and de-duplicates labels', () => {
    const tracks = subtitleTracks([
      { language: 'English', url: 'http://api-host:8000/api/subtitles/1/0' },
      { language: 'English', url: 'http://api-host:8000/api/subtitles/1/1' },
      { language: 'Urdu (AI)', language_code: 'ur', url: 'http://api-host:8000/api/generated-subtitles/1/ur' },
    ])
    expect(tracks.map((t) => t.src)).toEqual(['/api/subtitles/1/0', '/api/subtitles/1/1', '/api/generated-subtitles/1/ur'])
    expect(tracks.map((t) => t.label)).toEqual(['English', 'English (2)', 'Urdu (AI)'])
    expect(tracks[2].srcLang).toBe('ur')
  })
})

describe('pagination window', () => {
  it('shows neighbours and ellipses', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(6, 20)).toEqual([1, 'gap', 5, 6, 7, 'gap', 20])
  })
})

describe('post-login redirect', () => {
  it('only allows admin paths', () => {
    expect(safeNext('/admin/movies?page=2')).toBe('/admin/movies?page=2')
    expect(safeNext('https://evil.example')).toBe('/admin')
    expect(safeNext('//evil.example/admin')).toBe('/admin')
    expect(safeNext('/admin/login')).toBe('/admin')
    expect(safeNext(null)).toBe('/admin')
  })
})
