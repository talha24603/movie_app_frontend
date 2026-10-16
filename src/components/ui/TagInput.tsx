import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/format'
import { controlClasses } from './Field'

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  normalize?: (tag: string) => string
  suggestions?: string[]
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Chips + free text. Enter or comma adds a tag, Backspace on an empty field removes the last one. */
export function TagInput({ id, value, onChange, placeholder, normalize = (t) => t.trim(), suggestions = [], ...aria }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const listId = id ? `${id}-suggestions` : undefined

  const add = (raw: string) => {
    const tags = raw.split(',').map(normalize).filter(Boolean)
    const next = [...value]
    for (const t of tags) if (!next.includes(t)) next.push(t)
    if (next.length !== value.length) onChange(next)
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (draft.trim()) add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn(controlClasses, 'flex w-full min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/10')} aria-invalid={aria['aria-invalid']}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-white/10 py-0.5 pl-2 pr-1 text-xs text-fg">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 text-fg-muted hover:bg-white/10 hover:text-fg" aria-label={`Remove ${tag}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? '' : placeholder}
        list={suggestions.length ? listId : undefined}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-fg-subtle"
        aria-describedby={aria['aria-describedby']}
      />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.filter((s) => !value.includes(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  )
}
