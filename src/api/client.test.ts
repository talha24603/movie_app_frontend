import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiUrl, messageFromDetail, onUnauthorized, request } from './client'
import { mockFetch } from '@/test/utils'

describe('api client', () => {
  it('builds URLs and drops empty params', () => {
    expect(apiUrl('/api/movies', { page: 2, search: '', genre: undefined, has_stream: false })).toBe('/api/movies?page=2&has_stream=false')
  })

  it('sends cookies and JSON', async () => {
    const fetchMock = mockFetch(() => ({ status: 200, body: { ok: true } }))
    await request('/api/admin/movies/1', { method: 'PATCH', body: { title: 'x' } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.credentials).toBe('include')
    expect(init?.body).toBe('{"title":"x"}')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('turns FastAPI validation errors into readable messages', async () => {
    mockFetch(() => ({ status: 422, body: { detail: [{ loc: ['body', 'rating'], msg: 'Value error, Rating must be a number between 0 and 10.' }] } }))
    await expect(request('/api/admin/movies/1', { method: 'PATCH', body: {} })).rejects.toMatchObject({
      status: 422,
      message: 'Rating must be a number between 0 and 10.',
    })
  })

  it('does not leak raw 5xx bodies', async () => {
    mockFetch(() => ({ status: 502, body: { trace: 'internal stuff' } }))
    await expect(request('/api/movies')).rejects.toMatchObject({ status: 502, message: 'Something went wrong on the server.' })
  })

  it('notifies listeners when a protected call returns 401, but not for public ones', async () => {
    const listener = vi.fn()
    const off = onUnauthorized(listener)
    mockFetch(() => ({ status: 401, body: { detail: 'Authentication required.' } }))
    await expect(request('/api/admin/stats')).rejects.toBeInstanceOf(ApiError)
    expect(listener).toHaveBeenCalledTimes(1)
    await expect(request('/api/auth/login', { method: 'POST', body: {}, authenticated: false })).rejects.toBeInstanceOf(ApiError)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('reports network failures as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(request('/api/movies')).rejects.toMatchObject({ status: 0, isNetwork: true })
  })

  it('extracts messages from every FastAPI detail shape', () => {
    expect(messageFromDetail('Plain', 'f')).toBe('Plain')
    expect(messageFromDetail({ code: 'X', message: 'Structured' }, 'f')).toBe('Structured')
    expect(messageFromDetail(undefined, 'fallback')).toBe('fallback')
  })
})
