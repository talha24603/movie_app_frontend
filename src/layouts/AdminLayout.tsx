import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bot, ExternalLink, Film, LayoutDashboard, LogOut, Menu, Captions, Users, X } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { useLogout } from '@/hooks/useSession'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/format'
import type { AdminUser } from '@/types/admin'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/movies', label: 'Movies', icon: Film },
  { to: '/admin/scraper', label: 'Scraper', icon: Bot },
  { to: '/admin/subtitles', label: 'Subtitle jobs', icon: Captions },
  { to: '/admin/admins', label: 'Administrators', icon: Users, superuserOnly: true },
]

export function AdminLayout({ admin }: { admin: AdminUser }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  const toast = useToast()

  useEffect(() => setOpen(false), [location.pathname])

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Signed out.')
        navigate('/admin/login', { replace: true })
      },
    })

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Brand to="/admin" suffix="Admin" />
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Admin">
        {nav
          .filter((n) => !n.superuserOnly || admin.is_superuser)
          .map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/8 text-white' : 'text-fg-muted hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
      </nav>
      <div className="space-y-1 border-t border-ink-700 p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View site
        </a>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-sm font-semibold uppercase text-brand-400" aria-hidden="true">
            {(admin.display_name || admin.email)[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{admin.display_name || admin.email}</p>
            <p className="truncate text-xs text-fg-subtle">{admin.is_superuser ? 'Superuser' : 'Administrator'}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="rounded-md p-1.5 text-fg-muted hover:bg-white/5 hover:text-white disabled:opacity-50"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-ink-950 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink-700 bg-ink-900 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-ink-700 bg-ink-900">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-md p-1.5 text-fg-muted hover:text-white" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-700 bg-ink-950/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 text-fg hover:bg-white/10" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <Brand to="/admin" suffix="Admin" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card border border-ink-700 bg-ink-900', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}
