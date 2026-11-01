import { useState } from 'react'
import { addDays } from '../lib/dates'
import { isoDate } from '../lib/schedule'
import { addTask, deleteTask, STATUS_LABEL, updateTask, type Task, type TaskDraft, type TaskStatus } from '../lib/tasks'
import type { TaskLink } from '../lib/db'
import { IconLink, IconTrash } from './Icons'
import Sheet from './Sheet'

const OTHER = '__other__'

function nextWeekday(now: Date, wd: number) {
  return addDays(now, (wd - now.getDay() + 7) % 7 || 7)
}

/** Нормализуем ссылку: «e.lanbook.com/…» → «https://e.lanbook.com/…» */
function normUrl(s: string): string | null {
  const v = s.trim()
  if (!v) return null
  const withScheme = /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`
  try {
    return new URL(withScheme).href
  } catch {
    return null
  }
}

export default function TaskEditor({
  task,
  draft,
  subjects,
  onClose,
}: {
  task?: Task
  draft?: TaskDraft
  subjects: string[]
  onClose: () => void
}) {
  const init = task ?? draft ?? { title: '', subject: '' }
  const [title, setTitle] = useState(init.title)
  const [subject, setSubject] = useState(init.subject)
  const [customSubject, setCustomSubject] = useState(!!init.subject && !subjects.includes(init.subject))
  const [dueDate, setDueDate] = useState(init.dueDate ?? '')
  const [dueTime, setDueTime] = useState(init.dueTime ?? '')
  const [status, setStatus] = useState<TaskStatus>(init.status ?? 'todo')
  const [notes, setNotes] = useState(init.notes ?? '')
  const [links, setLinks] = useState<TaskLink[]>(init.links ?? [])
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState(false)

  const now = new Date()
  const quickDates: [string, string][] = [
    ['Сегодня', isoDate(now)],
    ['Завтра', isoDate(addDays(now, 1))],
    ['Пятница', isoDate(nextWeekday(now, 5))],
    ['Через неделю', isoDate(addDays(now, 7))],
  ]

  const addLink = () => {
    const url = normUrl(linkInput)
    if (!url) return setLinkError(true)
    setLinks([...links, { url }])
    setLinkInput('')
    setLinkError(false)
  }

  const save = async () => {
    const pending = normUrl(linkInput) // не забыть ссылку, которую ввели, но не нажали «+»
    const data = {
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate || undefined,
      dueTime: dueDate && dueTime ? dueTime : undefined,
      status,
      notes: notes.trim(),
      links: pending ? [...links, { url: pending }] : links,
    }
    if (!data.title) return
    if (task) await updateTask(task.id, data)
    else await addTask(data)
    onClose()
  }

  const remove = async () => {
    if (task && confirm(`Удалить задание «${task.title}»?`)) {
      await deleteTask(task.id)
      onClose()
    }
  }

  return (
    <Sheet title={task ? 'Задание' : 'Новое задание'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Что сделать</span>
          <textarea className="input" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!task} />
        </label>

        <label className="field">
          <span>Предмет</span>
          {customSubject ? (
            <div className="quick-row">
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Название предмета" />
              <button type="button" className="link-btn" onClick={() => (setCustomSubject(false), setSubject(''))}>
                Из списка
              </button>
            </div>
          ) : (
            <select
              className="input"
              value={subject}
              onChange={(e) => (e.target.value === OTHER ? (setCustomSubject(true), setSubject('')) : setSubject(e.target.value))}
            >
              <option value="">— без предмета —</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER}>Другой…</option>
            </select>
          )}
        </label>

        <div className="field">
          <span>Срок</span>
          <div className="chips" style={{ paddingBottom: 6 }}>
            {quickDates.map(([label, d]) => (
              <button key={label} type="button" className={`pill small${dueDate === d ? ' active' : ''}`} onClick={() => setDueDate(d)}>
                {label}
              </button>
            ))}
            <button type="button" className={`pill small${!dueDate ? ' active' : ''}`} onClick={() => setDueDate('')}>
              Без срока
            </button>
          </div>
          <div className="quick-row">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Дата" />
            <input
              className="input"
              type="time"
              value={dueTime}
              disabled={!dueDate}
              onChange={(e) => setDueTime(e.target.value)}
              aria-label="Время"
              style={{ maxWidth: 120 }}
            />
          </div>
        </div>

        <div className="field">
          <span>Статус</span>
          <div className="segmented">
            {(['todo', 'doing', 'done'] as TaskStatus[]).map((s) => (
              <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Заметка</span>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Требования, страницы, вопросы…" />
        </label>

        <div className="field">
          <span>Ссылки</span>
          {links.map((l, i) => (
            <div key={i} className="link-row">
              <IconLink size={16} />
              <a href={l.url} target="_blank" rel="noreferrer">
                {l.url.replace(/^https?:\/\//, '')}
              </a>
              <button type="button" aria-label="Убрать ссылку" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <div className="quick-row">
            <input
              className="input"
              value={linkInput}
              inputMode="url"
              onChange={(e) => (setLinkInput(e.target.value), setLinkError(false))}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
              placeholder="e.lanbook.com/book/…"
            />
            <button type="button" className="pill small" onClick={addLink}>
              Добавить
            </button>
          </div>
          {linkError && <p className="muted" style={{ color: 'var(--danger)' }}>Не похоже на ссылку</p>}
        </div>
      </div>

      <div className="sheet-actions">
        <button className="pill primary" disabled={!title.trim()} onClick={save} style={{ flex: 1, justifyContent: 'center' }}>
          Сохранить
        </button>
        {task && (
          <button className="pill" onClick={remove} aria-label="Удалить" style={{ color: 'var(--danger)' }}>
            <IconTrash size={18} /> Удалить
          </button>
        )}
      </div>
    </Sheet>
  )
}
