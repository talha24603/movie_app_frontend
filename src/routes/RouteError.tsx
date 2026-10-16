import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

/** Last-resort boundary (render crashes, failed chunk loads after a deploy). */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message)
      ? 'A new version of the app is available.'
      : 'An unexpected error occurred.'
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-fg-muted">{message}</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
          Reload
        </button>
        <a href="/" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-fg hover:bg-white/15">
          Go home
        </a>
      </div>
    </div>
  )
}
