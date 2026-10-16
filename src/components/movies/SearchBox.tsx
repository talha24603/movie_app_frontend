import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/format'

/**
 * Header search. Typing navigates to /browse?q=… after a debounce; results are fetched there with request
 * cancellation, so only the latest query's response is ever rendered.
 */
export function SearchBox({ className, autoFocus, onSubmitted }: { className?: string; autoFocus?: boolean; onSubmitted?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onBrowse = location.pathname === '/browse'
  const urlQuery = onBrowse ? params.get('q') ?? '' : ''
  const [value, setValue] = useState(urlQuery)
  const debounced = useDebouncedValue(value.trim(), 400)
  const touched = useRef(false)

  // Keep the box in sync when the URL changes (back/forward, clicking a genre link)
  useEffect(() => {
    if (!touched.current) setValue(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (!touched.current) return
    touched.current = false
    if (debounced === urlQuery) return
    if (!debounced && !onBrowse) return
    const next = new URLSearchParams(onBrowse ? params : undefined)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    next.delete('page')
    navigate({ pathname: '/browse', search: next.toString() }, { replace: onBrowse })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        navigate({ pathname: '/browse', search: q ? `?q=${encodeURIComponent(q)}` : '' })
        onSubmitted?.()
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          touched.current = true
          setValue(e.target.value)
        }}
        placeholder="Search movies"
        aria-label="Search movies"
        className="h-10 w-full rounded-full border border-white/10 bg-black/40 pl-9 pr-9 text-sm text-fg placeholder:text-fg-subtle backdrop-blur transition-colors hover:border-white/20 focus:border-white/30 focus:bg-black/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            touched.current = true
            setValue('')
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-fg-subtle hover:text-fg"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  )
}
