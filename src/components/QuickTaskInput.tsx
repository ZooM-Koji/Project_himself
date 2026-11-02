import { useState } from 'react'
import { formatDue } from '../lib/dates'
import { parseQuick } from '../lib/quickParse'
import { useSchedule } from '../lib/schedule'
import { shortKind } from './LessonCard'
import { addTask, type TaskDraft } from '../lib/tasks'
import { IconSend } from './Icons'

const KIND_GEN: Record<string, string> = { лекция: 'лекций', практика: 'практик', лабораторная: 'лабораторных' }

/**
 * Строка быстрого ввода: «конспект по страхованию до пт».
 * Пока печатаешь — под строкой видно, что распознано.
 */
export default function QuickTaskInput({
  subjects,
  onAdded,
  onMore,
  autoFocus,
  defaultSubject,
}: {
  defaultSubject?: string
  subjects: string[]
  onAdded?: (id: string) => void
  onMore?: (draft: TaskDraft) => void
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')
  const { lessons } = useSchedule()
  const now = new Date()
  const r = parseQuick(text, now, subjects, lessons)
  if (!r.subject && defaultSubject) {
    // на странице предмета: предмет известен заранее, «к следующей паре» — тоже по нему
    const again = parseQuick(`${text} ${defaultSubject}`, now, [defaultSubject], lessons)
    r.subject = defaultSubject
    if (r.pair && again.pair) (r.pair = again.pair), (r.dueDate = again.dueDate), (r.dueTime = again.dueTime)
  }
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
          {r.pair?.found ? (
            <span className="chip chip-accent">
              к паре ({shortKind(r.pair.found.kind).toLowerCase()}): {formatDue(r.pair.found.date, r.pair.found.start, now)}
            </span>
          ) : (
            <span className={r.dueDate ? 'chip chip-accent' : 'chip chip-muted'}>
              {r.dueDate ? `до ${formatDue(r.dueDate, r.dueTime, now)}` : 'без срока'}
            </span>
          )}
          {r.subject && <span className="chip chip-sky">{r.subject}</span>}
          {r.pair?.problem === 'no-subject' && (
            <span className="quick-hint">Не понял, к паре по какому предмету — допиши, например «…по истории».</span>
          )}
          {r.pair?.problem === 'not-found' && (
            <span className="quick-hint">
              В опубликованном расписании больше нет {KIND_GEN[r.pair.kind ?? ''] ?? 'пар'} по предмету «{r.subject}» — срок не
              поставлен.
            </span>
          )}
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
