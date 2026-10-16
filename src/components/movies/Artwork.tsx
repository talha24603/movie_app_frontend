import { useState } from 'react'
import { Film } from 'lucide-react'
import { cn, initials } from '@/lib/format'

interface ArtworkProps {
  src?: string | null
  alt: string
  title: string
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
  /** Shown instead of the image when it is missing or fails to load. */
  variant?: 'poster' | 'backdrop'
}

/** Image with a designed fallback (no broken-image icons). */
export function Artwork({ src, alt, title, className, imgClassName, loading = 'lazy', variant = 'poster' }: ArtworkProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <div className={cn('relative overflow-hidden bg-ink-800', className)}>
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading={loading}
          decoding="async"
          onError={() => setFailedSrc(src!)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 p-3 text-center"
        >
          <Film className={cn('text-fg-subtle', variant === 'poster' ? 'h-7 w-7' : 'h-10 w-10')} aria-hidden="true" />
          {variant === 'poster' ? (
            <span className="text-2xl font-semibold uppercase tracking-wide text-fg-subtle" aria-hidden="true">
              {initials(title)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
