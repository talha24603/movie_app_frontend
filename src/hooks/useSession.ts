import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { authApi } from '@/api/auth'
import { queryKeys } from './queries'

/**
 * The signed-in admin, as reported by the server (GET /api/auth/me). The UI uses it only to decide what to
 * render; every protected API call is authorised by the backend independently.
 */
export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.session,
    queryFn: async ({ signal }) => {
      try {
        return await authApi.me(signal)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  })
  return { admin: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch }
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      qc.setQueryData(queryKeys.session, null)
      qc.removeQueries({ queryKey: ['admin'] })
    },
  })
}
