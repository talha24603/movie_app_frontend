import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { HomePage } from '@/pages/HomePage'
import { BrowsePage } from '@/pages/BrowsePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageSpinner } from '@/components/ui/Spinner'
import { RouteError } from './RouteError'
import { Root } from './Root'

// Split heavier / restricted areas out of the public bundle
const MoviePage = lazy(() => import('@/pages/MoviePage').then((m) => ({ default: m.MoviePage })))
const LoginPage = lazy(() => import('@/pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })))
const RequireAdmin = lazy(() => import('./RequireAdmin').then((m) => ({ default: m.RequireAdmin })))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MoviesPage = lazy(() => import('@/pages/admin/MoviesPage').then((m) => ({ default: m.MoviesPage })))
const MovieEditPage = lazy(() => import('@/pages/admin/MovieEditPage').then((m) => ({ default: m.MovieEditPage })))
const ScraperPage = lazy(() => import('@/pages/admin/ScraperPage').then((m) => ({ default: m.ScraperPage })))
const SubtitlesPage = lazy(() => import('@/pages/admin/SubtitlesPage').then((m) => ({ default: m.SubtitlesPage })))
const AdminsPage = lazy(() => import('@/pages/admin/AdminsPage').then((m) => ({ default: m.AdminsPage })))

const page = (node: ReactNode) => <Suspense fallback={<PageSpinner />}>{node}</Suspense>

export const routes = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'browse', element: <BrowsePage /> },
          { path: 'movie/:id', element: page(<MoviePage />) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'admin/login', element: page(<LoginPage />) },
      {
        path: 'admin',
        element: page(<RequireAdmin />),
        children: [
          { index: true, element: page(<DashboardPage />) },
          { path: 'movies', element: page(<MoviesPage />) },
          { path: 'movies/:id', element: page(<MovieEditPage />) },
          { path: 'scraper', element: page(<ScraperPage />) },
          { path: 'subtitles', element: page(<SubtitlesPage />) },
          { path: 'admins', element: page(<AdminsPage />) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
