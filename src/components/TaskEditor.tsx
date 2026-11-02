import { useState } from 'react'
import { addDays, formatDue } from '../lib/dates'
import { isoDate, useSchedule } from '../lib/schedule'
import { findNextPair } from '../lib/quickParse'
import { addTask, deleteTask, STATUS_LABEL, updateTask, type Task, type TaskDraft, type TaskStatus } from '../lib/tasks'
import { db, type TaskLink } from '../lib/db'
import { IconTrash } from './Icons'
import FilesField from './FilesField'
import LinksField from './LinksField'
import Sheet from './Sheet'

const OTHER = '__other__'

function nextWeekday(now: Date, wd: number) {
  return addDays(now, (wd - now.getDay() + 7) % 7 || 7)
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
  const [pendingLink, setPendingLink] = useState<string | null>(null)
  // У нового задания id создаём сразу — чтобы к нему можно было прикрепить фото до сохранения.
  const [id] = useState(() => task?.id ?? crypto.randomUUID())

  const now = new Date()
  const { lessons } = useSchedule()
  const nextPair = subject ? findNextPair(lessons, now, subject) : undefined
  const quickDates: [string, string][] = [
    ['Сегодня', isoDate(now)],
    ['Завтра', isoDate(addDays(now, 1))],
    ['Пятница', isoDate(nextWeekday(now, 5))],
    ['Через неделю', isoDate(addDays(now, 7))],
  ]

  /** Закрыли новое задание без сохранения — убираем уже прикреплённые к нему файлы. */
  const cancel = async () => {
    if (!task) await db.files.where({ ownerType: 'task', ownerId: id }).delete()
    onClose()
  }

  const save = async () => {
    const pending = pendingLink // не забыть ссылку, которую ввели, но не нажали «Добавить»
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
    else await addTask({ ...data, id })
    onClose()
  }

  const remove = async () => {
    if (task && confirm(`Удалить задание «${task.title}»?`)) {
      await deleteTask(task.id)
      onClose()
    }
  }

  return (
    <Sheet title={task ? 'Задание' : 'Новое задание'} onClose={cancel}>
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
            {nextPair && (
              <button
                type="button"
                className={`pill small${dueDate === nextPair.date && dueTime === nextPair.start ? ' active' : ''}`}
                title={formatDue(nextPair.date, nextPair.start, now)}
                onClick={() => (setDueDate(nextPair.date), setDueTime(nextPair.start))}
              >
                К след. паре
              </button>
            )}
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
          <LinksField links={links} onChange={setLinks} onPendingChange={setPendingLink} />
        </div>

        <div className="field">
          <span>Файлы и фото</span>
          <FilesField ownerType="task" ownerId={id} />
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
