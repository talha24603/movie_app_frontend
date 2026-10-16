import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, LogIn, Menu, X } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { SearchBox } from '@/components/movies/SearchBox'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/format'

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-white' : 'text-fg-muted hover:text-white')

function AccountLink({ className }: { className?: string }) {
  const { admin } = useSession()
  return admin ? (
    <Link to="/admin" className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-white', className)}>
      <LayoutDashboard className="h-4 w-4" /> Dashboard
    </Link>
  ) : (
    <Link to="/admin/login" className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-white', className)}>
      <LogIn className="h-4 w-4" /> Admin
    </Link>
  )
}

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] rounded bg-white px-3 py-2 text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          scrolled || mobileOpen ? 'border-b border-white/5 bg-ink-950/95 backdrop-blur' : 'bg-gradient-to-b from-ink-950/90 to-transparent',
        )}
      >
        <div className="flex h-16 items-center gap-4 px-4 sm:px-8 lg:px-12">
          <Brand />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={navLink}>
              Home
            </NavLink>
            <NavLink to="/browse" className={navLink}>
              Browse
            </NavLink>
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <SearchBox className="w-64 lg:w-80" />
            <AccountLink />
          </div>
          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen ? (
          <div id="mobile-nav" className="space-y-3 border-t border-white/5 px-4 pb-5 pt-3 md:hidden">
            <SearchBox autoFocus onSubmitted={() => setMobileOpen(false)} />
            <nav className="flex flex-col" aria-label="Mobile">
              <NavLink to="/" end className={navLink}>
                Home
              </NavLink>
              <NavLink to="/browse" className={navLink}>
                Browse
              </NavLink>
            </nav>
            <AccountLink className="-ml-1" />
          </div>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-white/5 px-4 py-8 text-sm text-fg-subtle sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Brand />
          <p>Metadata and artwork come from each title’s source catalog.</p>
        </div>
      </footer>
    </div>
  )
}
