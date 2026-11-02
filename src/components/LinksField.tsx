import { useState } from 'react'
import type { TaskLink } from '../lib/db'
import { IconLink } from './Icons'

/** Нормализуем ссылку: «e.lanbook.com/…» → «https://e.lanbook.com/…» */
export function normUrl(s: string): string | null {
  const v = s.trim()
  if (!v) return null
  const withScheme = /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    return /^https?:$/.test(u.protocol) ? u.href : null
  } catch {
    return null
  }
}

/**
 * Список ссылок с полем «добавить». pending — то, что введено, но ещё не добавлено
 * (форма может забрать его при сохранении через onPendingChange).
 */
export default function LinksField({
  links,
  onChange,
  onPendingChange,
  placeholder = 'e.lanbook.com/book/…',
}: {
  links: TaskLink[]
  onChange: (l: TaskLink[]) => void
  onPendingChange?: (url: string | null) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const add = () => {
    const url = normUrl(input)
    if (!url) return setError(true)
    onChange([...links, { url }])
    setInput('')
    setError(false)
    onPendingChange?.(null)
  }

  return (
    <>
      {links.map((l, i) => (
        <div key={i} className="link-row">
          <IconLink size={16} />
          <a href={l.url} target="_blank" rel="noreferrer noopener">
            {l.title || l.url.replace(/^https?:\/\//, '')}
          </a>
          <button type="button" aria-label="Убрать ссылку" onClick={() => onChange(links.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div className="quick-row">
        <input
          className="input"
          value={input}
          inputMode="url"
          onChange={(e) => {
            setInput(e.target.value)
            setError(false)
            onPendingChange?.(normUrl(e.target.value))
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button type="button" className="pill small" onClick={add}>
          Добавить
        </button>
      </div>
      {error && <p className="muted" style={{ color: 'var(--danger)' }}>Не похоже на ссылку</p>}
    </>
  )
}
