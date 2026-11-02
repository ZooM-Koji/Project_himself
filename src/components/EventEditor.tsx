import { useState } from 'react'
import { addEvent, deleteEvent, updateEvent, useProjects, type CalEvent, type EventDraft } from '../lib/activities'
import { isoDate } from '../lib/schedule'
import Sheet from './Sheet'

const REPEATS: [number, string][] = [
  [0, 'Не повторять'],
  [3, '4 недели'],
  [7, '8 недель'],
  [15, '16 недель (до конца семестра)'],
]

export default function EventEditor({ event, draft, onClose }: { event?: CalEvent; draft?: Partial<EventDraft>; onClose: () => void }) {
  const projects = useProjects() ?? []
  const init: Partial<EventDraft> = event ?? draft ?? {}
  const [title, setTitle] = useState(init.title ?? '')
  const [projectId, setProjectId] = useState(init.projectId ?? '')
  const [date, setDate] = useState(init.date ?? isoDate(new Date()))
  const [start, setStart] = useState(init.start ?? '18:00')
  const [end, setEnd] = useState(init.end ?? '')
  const [place, setPlace] = useState(init.place ?? '')
  const [notes, setNotes] = useState(init.notes ?? '')
  const [repeat, setRepeat] = useState(0)
  const endBad = !!end && end <= start

  const save = async () => {
    const data: EventDraft = { title: title.trim(), projectId: projectId || undefined, date, start, end: end || undefined, place: place.trim(), notes: notes.trim() }
    if (!data.title || !date || !start || endBad) return
    if (event) await updateEvent(event.id, data)
    else await addEvent(data, repeat)
    onClose()
  }

  const remove = async (withFuture: boolean) => {
    if (!event) return
    if (confirm(withFuture ? 'Удалить это событие и все следующие в серии?' : `Удалить «${event.title}»?`)) {
      await deleteEvent(event, withFuture)
      onClose()
    }
  }

  return (
    <Sheet title={event ? 'Событие' : 'Новое событие'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Что</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Репетиция, собрание студсовета, мастер-класс…" autoFocus={!event} />
        </label>
        <label className="field">
          <span>Проект</span>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— без проекта —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Когда</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Дата" />
          <div className="quick-row">
            <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Начало" />
            <span className="muted">—</span>
            <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Конец" />
          </div>
          {endBad && <p className="muted" style={{ color: 'var(--danger)' }}>Конец раньше начала</p>}
          {!end && <p className="muted" style={{ fontSize: 13 }}>Без времени конца считаем 1 час.</p>}
        </div>
        <label className="field">
          <span>Где</span>
          <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Актовый зал, ауд. 1413…" />
        </label>
        {!event && (
          <label className="field">
            <span>Повторять каждую неделю</span>
            <select className="input" value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
              {REPEATS.map(([n, l]) => (
                <option key={n} value={n}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Заметка</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div className="sheet-actions">
        <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!title.trim() || !date || !start || endBad} onClick={save}>
          Сохранить
        </button>
        {event && (
          <button className="pill" style={{ color: 'var(--danger)' }} onClick={() => remove(false)}>
            Удалить
          </button>
        )}
      </div>
      {event?.seriesId && (
        <button className="link-btn" style={{ color: 'var(--danger)', marginTop: 10 }} onClick={() => remove(true)}>
          Удалить это и все следующие повторы
        </button>
      )}
    </Sheet>
  )
}
