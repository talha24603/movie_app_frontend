import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'
import { RequireAdmin } from '@/routes/RequireAdmin'
import { mockFetch, renderRoutes } from '@/test/utils'

const admin = { id: 1, email: 'admin@example.com', display_name: 'Ada', is_active: true, is_superuser: true, created_at: null, last_login_at: null }

const routes = [
  { path: '/admin/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <RequireAdmin />,
    children: [
      { index: true, element: <p>Dashboard content</p> },
      { path: 'movies', element: <p>Movies content</p> },
    ],
  },
]

describe('admin route guard', () => {
  it('redirects anonymous visitors to the login page, remembering where they were going', async () => {
    mockFetch((url) => (url.pathname === '/api/auth/me' ? { status: 401, body: { detail: 'Authentication required.' } } : undefined))
    const { router } = renderRoutes(routes, '/admin/movies')
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/login')
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fmovies')
    expect(screen.queryByText('Movies content')).not.toBeInTheDocument()
  })

  it('renders the dashboard for a valid server session', async () => {
    mockFetch((url) => (url.pathname === '/api/auth/me' ? { status: 200, body: admin } : undefined))
    renderRoutes(routes, '/admin')
    expect(await screen.findByText('Dashboard content')).toBeInTheDocument()
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0)
  })
})

describe('login page', () => {
  it('validates input before calling the API', async () => {
    const fetchMock = mockFetch((url) => (url.pathname === '/api/auth/me' ? { status: 401, body: {} } : undefined))
    renderRoutes(routes, '/admin/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/api/auth/login'))).toBe(false)
  })

  it('toggles password visibility', async () => {
    mockFetch((url) => (url.pathname === '/api/auth/me' ? { status: 401, body: {} } : undefined))
    renderRoutes(routes, '/admin/login')
    const input = await screen.findByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('shows a clear message for wrong credentials and rate limiting', async () => {
    let attempts = 0
    mockFetch((url) => {
      if (url.pathname === '/api/auth/me') return { status: 401, body: {} }
      if (url.pathname === '/api/auth/login') {
        attempts++
        return attempts === 1 ? { status: 401, body: { detail: 'Invalid email or password.' } } : { status: 429, body: { detail: 'Too many failed sign-in attempts. Try again in a few minutes.' } }
      }
    })
    renderRoutes(routes, '/admin/login')
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/Too many failed sign-in attempts/)).toBeInTheDocument()
  })

  it('signs in and continues to the requested page', async () => {
    let signedIn = false
    mockFetch((url, init) => {
      if (url.pathname === '/api/auth/me') return signedIn ? { status: 200, body: admin } : { status: 401, body: {} }
      if (url.pathname === '/api/auth/login' && init.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ email: 'admin@example.com', password: 'correct-horse' })
        signedIn = true
        return { status: 200, body: { admin, expires_at: null } }
      }
    })
    const { router } = renderRoutes(routes, '/admin/login?next=%2Fadmin%2Fmovies')
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Movies content')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/movies'))
  })
})
