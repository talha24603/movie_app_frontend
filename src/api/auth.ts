import { request } from './client'
import type { AdminUser, SessionResponse } from '@/types/admin'

export const authApi = {
  login: (email: string, password: string) =>
    request<SessionResponse>('/api/auth/login', { method: 'POST', body: { email, password }, authenticated: false }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST', authenticated: false }),
  me: (signal?: AbortSignal) => request<AdminUser>('/api/auth/me', { signal, authenticated: false }),
}
