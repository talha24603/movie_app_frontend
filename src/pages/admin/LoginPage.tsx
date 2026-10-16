import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { ApiError } from '@/api/client'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/hooks/queries'
import { useSession } from '@/hooks/useSession'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { safeNext } from '@/lib/redirect'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
type FormValues = z.infer<typeof schema>

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'The email or password is incorrect.'
    if (err.status === 429) return err.message
    if (err.status === 422) return 'Check the email address and try again.'
    if (err.status === 0) return err.message
    return 'Sign-in is unavailable right now. Please try again shortly.'
  }
  return 'Something went wrong. Please try again.'
}

export function LoginPage() {
  useDocumentTitle('Admin sign in')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { admin, isLoading } = useSession()
  const [showPassword, setShowPassword] = useState(false)
  const next = safeNext(params.get('next'))
  const sessionEnded = params.has('next')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const login = useMutation({
    mutationFn: (v: FormValues) => authApi.login(v.email, v.password),
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.session, session.admin)
      navigate(next, { replace: true })
    },
  })

  if (isLoading) return <PageSpinner />
  if (admin && !login.isPending) return <Navigate to={next} replace />

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(225,29,72,0.28),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgba(251,191,36,0.10),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,#fff_0_1px,transparent_1px_64px),repeating-linear-gradient(0deg,#fff_0_1px,transparent_1px_64px)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Brand />
          <div className="max-w-md">
            <p className="text-3xl font-semibold leading-tight tracking-tight text-white">Manage the catalog, monitor scraping, and keep every stream healthy.</p>
            <p className="mt-4 text-fg-muted">Restricted area for authorised administrators.</p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Admin sign in</h1>
          <p className="mt-1 text-sm text-fg-muted">Use the account an administrator created for you.</p>

          {sessionEnded && !login.isError ? (
            <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">
              Please sign in to continue. Your session may have expired.
            </p>
          ) : null}

          {login.isError ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {loginErrorMessage(login.error)}
            </div>
          ) : null}

          <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit((v) => login.mutate(v))}>
            <Field label="Email" error={errors.email?.message}>
              {(p) => <Input {...p} {...register('email')} type="email" autoComplete="username" autoFocus inputMode="email" placeholder="you@example.com" />}
            </Field>
            <Field label="Password" error={errors.password?.message}>
              {(p) => (
                <div className="relative">
                  <Input {...p} {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pr-11" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:text-fg"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>
            <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-fg-subtle">
            <a href="/" className="hover:text-fg">
              ← Back to the catalog
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
