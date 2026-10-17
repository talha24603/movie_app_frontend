import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation, useRoutes, type Location, type RouteObject } from 'react-router-dom'
import { vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import type { Movie } from '@/types/movie'

function RoutesWithProbe({ routes, onLocation }: { routes: RouteObject[]; onLocation: (l: Location) => void }) {
  onLocation(useLocation())
  return useRoutes(routes)
}

/** MemoryRouter (not a data router: jsdom's AbortSignal is incompatible with Node's Request). */
export function renderRoutes(routes: RouteObject[], initialPath = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = { state: { location: undefined as unknown as Location } }
  const utils = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <RoutesWithProbe routes={routes} onLocation={(l) => (router.state.location = l)} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...utils, router, client }
}

export function renderWithRouter(ui: ReactNode, path = '/') {
  return renderRoutes([{ path: '*', element: ui }], path)
}

type Handler = (url: URL, init: RequestInit) => { status: number; body?: unknown } | undefined

/** Routes fetch() calls to `handler`; unmatched calls fail the test loudly. */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const res = handler(url, init)
    if (!res) throw new Error(`Unexpected fetch ${init.method ?? 'GET'} ${url.pathname}`)
    return new Response(res.body === undefined ? null : JSON.stringify(res.body), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    tmdb_id: '42',
    source: 'flixkiss',
    title: 'Test Movie',
    year: '2024',
    rating: '7.3',
    runtime: '1h 40m',
    genres: ['Drama'],
    categories: [],
    description: '',
    cast: [],
    poster_url: 'https://img.example/p.jpg',
    backdrop_url: '',
    logo_url: '',
    page_url: '',
    m3u8_url: 'https://cdn.example/x.m3u8',
    player_url: '',
    download_url: '',
    subtitles: [],
    is_active: true,
    proxied_stream_url: '',
    direct_play_url: '',
    scraped_at: null,
    updated_at: null,
    ...overrides,
  }
}
