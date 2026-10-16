import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/format'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Native <dialog>: modal focus trapping, Esc to close and inert background come from the browser. */
export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal?.()
    if (!open && el.open) el.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // click on the backdrop
      }}
      aria-labelledby="dialog-title"
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-ink-600 bg-ink-850 p-0 text-fg shadow-2xl',
        className,
      )}
    >
      {open ? (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-6 py-4">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description ? <div className="mt-1 text-sm text-fg-muted">{description}</div> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-fg-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children ? <div className="px-6 py-5">{children}</div> : null}
          {footer ? <div className="flex justify-end gap-2 border-t border-ink-700 px-6 py-4">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'danger', loading, error, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
