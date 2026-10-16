import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Plus, ShieldCheck } from 'lucide-react'
import { ApiError } from '@/api/client'
import { adminApi } from '@/api/admin'
import { queryKeys } from '@/hooks/queries'
import { useSession } from '@/hooks/useSession'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/layouts/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input } from '@/components/ui/Field'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatRelative } from '@/lib/format'
import type { AdminUser } from '@/types/admin'

const password = z.string().min(10, 'At least 10 characters.').max(256)

const createSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address.'),
    display_name: z.string().trim().max(128),
    password,
    confirm: z.string(),
    is_superuser: z.boolean(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' })

const passwordSchema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' })

function CreateAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', display_name: '', password: '', confirm: '', is_superuser: false },
  })
  const create = useMutation({
    mutationFn: (v: z.infer<typeof createSchema>) => adminApi.createUser({ email: v.email, password: v.password, display_name: v.display_name || undefined, is_superuser: v.is_superuser }),
    onSuccess: (a) => {
      toast.success(`${a.email} can now sign in.`)
      qc.invalidateQueries({ queryKey: queryKeys.admins })
      reset()
      onClose()
    },
  })
  return (
    <Dialog
      open={open}
      onClose={() => !create.isPending && onClose()}
      title="Add administrator"
      description="Share the password with them over a secure channel; they can't reset it themselves."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" form="create-admin" loading={create.isPending}>Create account</Button>
        </>
      }
    >
      <form id="create-admin" noValidate onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>{(p) => <Input {...p} {...register('email')} type="email" autoComplete="off" />}</Field>
        <Field label="Display name (optional)" error={errors.display_name?.message}>{(p) => <Input {...p} {...register('display_name')} autoComplete="off" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}>{(p) => <Input {...p} {...register('password')} type="password" autoComplete="new-password" />}</Field>
          <Field label="Confirm password" error={errors.confirm?.message}>{(p) => <Input {...p} {...register('confirm')} type="password" autoComplete="new-password" />}</Field>
        </div>
        <Checkbox {...register('is_superuser')} label="Superuser" description="Can add, deactivate and promote other administrators." />
        {create.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(create.error)}</p> : null}
      </form>
    </Dialog>
  )
}

function ResetPasswordDialog({ admin, onClose }: { admin: AdminUser | null; onClose: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirm: '' } })
  const save = useMutation({
    mutationFn: (v: z.infer<typeof passwordSchema>) => adminApi.updateUser(admin!.id, { password: v.password }),
    onSuccess: (a) => {
      toast.success(`Password changed for ${a.email}. Their other sessions were signed out.`)
      reset()
      onClose()
    },
  })
  return (
    <Dialog
      open={Boolean(admin)}
      onClose={() => !save.isPending && onClose()}
      title="Set a new password"
      description={admin?.email}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="reset-password" loading={save.isPending}>Save password</Button>
        </>
      }
    >
      <form id="reset-password" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
        <Field label="New password" error={errors.password?.message}>{(p) => <Input {...p} {...register('password')} type="password" autoComplete="new-password" />}</Field>
        <Field label="Confirm password" error={errors.confirm?.message}>{(p) => <Input {...p} {...register('confirm')} type="password" autoComplete="new-password" />}</Field>
        {save.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p> : null}
      </form>
    </Dialog>
  )
}

export function AdminsPage() {
  useDocumentTitle('Administrators')
  const toast = useToast()
  const qc = useQueryClient()
  const { admin: me } = useSession()
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState<AdminUser | null>(null)

  const admins = useQuery({ queryKey: queryKeys.admins, queryFn: ({ signal }) => adminApi.users(signal) })
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: number; is_active?: boolean; is_superuser?: boolean }) => adminApi.updateUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admins }),
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (admins.isError && admins.error instanceof ApiError && admins.error.status === 403) {
    return <EmptyState title="Superusers only" description="Ask a superuser if you need administrator accounts changed." />
  }

  return (
    <>
      <PageHeader
        title="Administrators"
        description="Only people listed here can sign in to the dashboard. There is no public sign-up."
        actions={<Button size="sm" onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>Add administrator</Button>}
      />
      {admins.isError ? (
        <ErrorState title="Could not load administrators" error={admins.error} onRetry={() => admins.refetch()} />
      ) : !admins.data ? (
        <Skeleton className="h-48 w-full rounded-card" />
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-700 bg-ink-900">
          <ul className="divide-y divide-ink-700">
            {admins.data.map((a) => {
              const self = a.id === me?.id
              const busy = update.isPending && update.variables?.id === a.id
              return (
                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold uppercase text-fg-muted" aria-hidden="true">
                      {(a.display_name || a.email)[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                        <span className="truncate">{a.display_name || a.email}</span>
                        {self ? <Badge tone="brand">You</Badge> : null}
                        {a.is_superuser ? <Badge tone="info"><ShieldCheck className="h-3 w-3" /> Superuser</Badge> : null}
                        {!a.is_active ? <Badge tone="danger">Deactivated</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-fg-subtle">
                        {a.email} · added {formatDate(a.created_at)} · last sign-in {a.last_login_at ? formatRelative(a.last_login_at) : 'never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setResetting(a)} icon={<KeyRound className="h-3.5 w-3.5" />}>Password</Button>
                    {!self ? (
                      <>
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => update.mutate({ id: a.id, is_superuser: !a.is_superuser })}>
                          {a.is_superuser ? 'Remove superuser' : 'Make superuser'}
                        </Button>
                        <Button variant={a.is_active ? 'outline' : 'secondary'} size="sm" disabled={busy} className={a.is_active ? 'text-red-300 hover:border-red-500/50 hover:bg-red-500/10' : undefined} onClick={() => update.mutate({ id: a.id, is_active: !a.is_active })}>
                          {a.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <CreateAdminDialog open={creating} onClose={() => setCreating(false)} />
      <ResetPasswordDialog admin={resetting} onClose={() => setResetting(null)} />
    </>
  )
}
