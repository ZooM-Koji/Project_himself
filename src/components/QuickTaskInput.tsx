import { useState } from 'react'
import { formatDue } from '../lib/dates'
import { parseQuick } from '../lib/quickParse'
import { addTask, type TaskDraft } from '../lib/tasks'
import { IconSend } from './Icons'

/**
 * Строка быстрого ввода: «конспект по страхованию до пт».
 * Пока печатаешь — под строкой видно, что распознано.
 */
export default function QuickTaskInput({
  subjects,
  onAdded,
  onMore,
  autoFocus,
}: {
  subjects: string[]
  onAdded?: (id: string) => void
  onMore?: (draft: TaskDraft) => void
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')
  const now = new Date()
  const r = parseQuick(text, now, subjects)
  const draft: TaskDraft = { title: r.title, subject: r.subject ?? '', dueDate: r.dueDate, dueTime: r.dueTime }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!r.title) return
    const id = await addTask(draft)
    setText('')
    onAdded?.(id)
  }

  return (
    <form className="quick" onSubmit={submit}>
      <div className="quick-row">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: конспект по статистике до пт"
          enterKeyHint="done"
          autoFocus={autoFocus}
          aria-label="Быстро добавить задание"
        />
        <button className="quick-send" type="submit" disabled={!r.title} aria-label="Добавить">
          <IconSend size={20} />
        </button>
      </div>
      {text.trim() && (
        <div className="quick-preview">
          <span className="chip">{r.title || 'без названия'}</span>
          <span className={r.dueDate ? 'chip chip-accent' : 'chip chip-muted'}>
            {r.dueDate ? `до ${formatDue(r.dueDate, r.dueTime, now)}` : 'без срока'}
          </span>
          {r.subject && <span className="chip chip-sky">{r.subject}</span>}
          {onMore && (
            <button type="button" className="link-btn" onClick={() => onMore(draft)}>
              Подробнее
            </button>
          )}
        </div>
      )}
    </form>
  )
}
