import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../lib/db'
import { addManualLessons, deleteManualLesson, MANUAL_KINDS, PAIR_SLOTS, updateManualLesson, type ManualDraft } from '../lib/manualLessons'
import { isoDate } from '../lib/schedule'
import { useAllSubjects } from '../lib/useAllSubjects'
import Sheet from './Sheet'

/** Добавить или поправить пару вручную (консультация, отработка, перенос, которого нет в РУЗ). */
export default function ManualLessonEditor({ id, date, onClose }: { id?: string; date?: string; onClose: () => void }) {
  const existing = useLiveQuery(() => (id ? db.manualLessons.get(id) : undefined), [id])
  if (id && !existing) return null
  return <Form key={id ?? 'new'} init={existing} date={date} onClose={onClose} />
}

function Form({ init, date, onClose }: { init?: ManualDraft & { id: string }; date?: string; onClose: () => void }) {
  const subjects = useAllSubjects()
  const [d, setD] = useState<ManualDraft>(
    init ?? { date: date ?? isoDate(new Date()), start: PAIR_SLOTS[0][0], end: PAIR_SLOTS[0][1], subject: '', kind: 'Консультация', room: '', teacher: '', notes: '', source: 'manual' },
  )
  const set = (p: Partial<ManualDraft>) => setD((x) => ({ ...x, ...p }))
  const slot = PAIR_SLOTS.findIndex(([s, e]) => s === d.start && e === d.end)
  const bad = !d.subject.trim() || !d.date || !d.start || !d.end || d.end <= d.start

  const save = async () => {
    if (bad) return
    const data = { ...d, subject: d.subject.trim(), room: d.room.trim(), teacher: d.teacher.trim(), notes: d.notes.trim() }
    if (init) await updateManualLesson(init.id, data)
    else await addManualLessons([data])
    onClose()
  }
  const remove = async () => {
    if (init && confirm('Удалить эту пару?')) {
      await deleteManualLesson(init.id)
      onClose()
    }
  }

  return (
    <Sheet title={init ? 'Пара (вручную)' : 'Добавить пару'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Предмет</span>
          <input className="input" list="manual-subjects" value={d.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Высшая математика" autoFocus={!init} />
          <datalist id="manual-subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Тип</span>
          <select className="input" value={MANUAL_KINDS.includes(d.kind) ? d.kind : 'Другое'} onChange={(e) => set({ kind: e.target.value })}>
            {MANUAL_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Когда</span>
          <input className="input" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} aria-label="Дата" />
          <select className="input" value={slot} onChange={(e) => Number(e.target.value) >= 0 && set({ start: PAIR_SLOTS[+e.target.value][0], end: PAIR_SLOTS[+e.target.value][1] })}>
            {PAIR_SLOTS.map(([s, e], i) => (
              <option key={s} value={i}>
                {i + 1} пара: {s}–{e}
              </option>
            ))}
            <option value={-1}>Своё время</option>
          </select>
          <div className="quick-row">
            <input className="input" type="time" value={d.start} onChange={(e) => set({ start: e.target.value })} aria-label="Начало" />
            <span className="muted">—</span>
            <input className="input" type="time" value={d.end} onChange={(e) => set({ end: e.target.value })} aria-label="Конец" />
          </div>
          {d.end <= d.start && <p className="muted" style={{ color: 'var(--danger)' }}>Конец раньше начала</p>}
        </div>
        <div className="grid2">
          <label className="field">
            <span>Аудитория</span>
            <input className="input" value={d.room} onChange={(e) => set({ room: e.target.value })} placeholder="ауд. 211" />
          </label>
          <label className="field">
            <span>Преподаватель</span>
            <input className="input" value={d.teacher} onChange={(e) => set({ teacher: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Заметка</span>
          <input className="input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Например: перенос с 12.11" />
        </label>
      </div>
      <div className="sheet-actions">
        <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} disabled={bad} onClick={save}>
          Сохранить
        </button>
        {init && (
          <button className="pill" style={{ color: 'var(--danger)' }} onClick={remove}>
            Удалить
          </button>
        )}
      </div>
    </Sheet>
  )
}
