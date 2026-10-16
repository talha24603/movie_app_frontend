import { ButtonLink } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">404</p>
      <h1 className="text-3xl font-bold tracking-tight">This page doesn’t exist</h1>
      <p className="max-w-md text-fg-muted">The link may be broken, or the page may have moved.</p>
      <ButtonLink to="/" variant="secondary">
        Back to home
      </ButtonLink>
    </div>
  )
}
