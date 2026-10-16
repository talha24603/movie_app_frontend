import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

export const controlClasses =
  'rounded-lg border border-ink-600 bg-ink-900 px-3 text-sm text-fg placeholder:text-fg-subtle ' +
  'transition-colors hover:border-ink-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 ' +
  'disabled:opacity-60 aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:focus:ring-red-500/30'

/** Full width unless the caller sets its own width (w-auto, w-44, ...). */
const withWidth = (className?: string) => cn(controlClasses, /(^|\s)(w-|min-w-|flex-1)/.test(className ?? '') ? '' : 'w-full', className)

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(withWidth(className), 'h-10')} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(withWidth(className), 'min-h-28 py-2 leading-relaxed')} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(withWidth(className), 'h-10 pr-8')} {...rest}>
      {children}
    </select>
  )
})

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, ...rest },
  ref,
) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-500 bg-ink-900 accent-brand-600"
        {...rest}
      />
      <label htmlFor={id} className="cursor-pointer text-sm">
        <span className="text-fg">{label}</span>
        {description ? <span className="block text-xs text-fg-subtle">{description}</span> : null}
      </label>
    </div>
  )
})
