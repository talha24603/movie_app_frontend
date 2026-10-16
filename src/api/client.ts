/** Centralised HTTP client: base URL, credentials, JSON, typed errors, cancellation. */

const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim()
/** Empty string = same origin (Vite proxy / nginx). Never ends with a slash. */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isNetwork() {
    return this.status === 0
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

export function apiUrl(path: string, query?: Query): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return `${API_BASE}${path}${s ? `?${s}` : ''}`
}

/**
 * The API builds absolute URLs from the host it was reached on. Re-root any URL that points at an /api/
 * path onto our configured base so it works behind proxies too. Other URLs are returned unchanged.
 */
export function rebaseApiUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url, window.location.origin)
    if (u.pathname.startsWith('/api/')) return `${API_BASE}${u.pathname}${u.search}`
  } catch {
    /* not a URL */
  }
  return url
}

/** FastAPI errors: {detail: string} | {detail: [{msg, loc}]} | {detail: {code, message}} */
export function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : ''))
      .filter(Boolean)
      .map((m) => m.replace(/^Value error, /, ''))
    if (msgs.length) return msgs.join(' ')
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message)
  }
  return fallback
}

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Your session has ended. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'Not found.',
  409: 'That conflicts with the current state.',
  422: 'Some values are invalid.',
  429: 'Too many requests. Please wait a moment.',
  503: 'The service is temporarily unavailable.',
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Notified when an authenticated request comes back 401 (session expired or revoked). */
export function onUnauthorized(fn: UnauthorizedListener) {
  unauthorizedListeners.add(fn)
  return () => {
    unauthorizedListeners.delete(fn)
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
  /** Whether a 401 means "session ended" (fires the listeners). Defaults to true for protected prefixes. */
  authenticated?: boolean
}

const AUTH_PREFIXES = ['/api/admin', '/api/scrape', '/api/subtitle-jobs']

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = opts
  const authenticated = opts.authenticated ?? AUTH_PREFIXES.some((p) => path.startsWith(p))
  let res: Response
  try {
    res = await fetch(apiUrl(path, query), {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? (data as { detail: unknown }).detail : data
    const fallback =
      STATUS_FALLBACK[res.status] ?? (res.status >= 500 ? 'Something went wrong on the server.' : `Request failed (${res.status}).`)
    // 5xx bodies can be proxy/HTML noise; only surface a server-provided string message
    const message = res.status >= 500 && typeof detail !== 'string' ? fallback : messageFromDetail(detail, fallback)
    if (res.status === 401 && authenticated) unauthorizedListeners.forEach((fn) => fn())
    throw new ApiError(res.status, message, detail)
  }
  return data as T
}
