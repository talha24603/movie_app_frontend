import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { onUnauthorized } from '@/api/client'
import { useSession } from '@/hooks/useSession'
import { queryKeys } from '@/hooks/queries'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/Feedback'

/**
 * Gate for /admin/*. This only decides what to render: the backend authorises every admin API call on its
 * own, so bypassing this component exposes nothing.
 */
export function RequireAdmin() {
  const { admin, isLoading, error, refetch } = useSession()
  const location = useLocation()
  const qc = useQueryClient()

  // Any admin API call answering 401 (expired / revoked session) drops the cached identity -> redirect below
  useEffect(
    () =>
      onUnauthorized(() => {
        if (qc.getQueryData(queryKeys.session)) {
          qc.setQueryData(queryKeys.session, null)
          qc.removeQueries({ queryKey: ['admin'] })
        }
      }),
    [qc],
  )

  if (isLoading) return <PageSpinner label="Checking your session" />
  if (error && !admin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <ErrorState title="Could not verify your session" error={error} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!admin) {
    const next = location.pathname + location.search
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <AdminLayout admin={admin} />
}
