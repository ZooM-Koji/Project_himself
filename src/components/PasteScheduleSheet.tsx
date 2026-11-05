import { useMemo, useState } from 'react'
import { addEvent, useProjects } from '../lib/activities'
import { formatIsoLong } from '../lib/dates'
import { parseScheduleText, type ParsedSlot } from '../lib/textSchedule'
import Sheet from './Sheet'

const REPEATS: [number, string][] = [
  [0, 'Не повторять'],
  [3, 'Каждую неделю, 4 недели'],
  [7, 'Каждую неделю, 8 недель'],
]

type Row = ParsedSlot & { on: boolean }

/** Вставить сообщение с расписанием → события на каждую дату. */
export default function PasteScheduleSheet({ projectId: initProject, onClose }: { projectId?: string; onClose: () => void }) {
  const projects = useProjects() ?? []
  const [text, setText] = useState('')
  const [edits, setEdits] = useState<Record<number, Partial<Row>>>({})
  const [titleEdit, setTitleEdit] = useState<string | null>(null)
  const [projectId, setProjectId] = useState(initProject ?? '')
  const [repeat, setRepeat] = useState(0)
  const [done, setDone] = useState<number | null>(null)

  const parsed = useMemo(() => parseScheduleText(text, new Date()), [text])
  const rows: Row[] = parsed.slots.map((s, i) => ({ ...s, on: true, ...edits[i] }))
  const title = titleEdit ?? (parsed.title || 'Репетиция')
  const ready = rows.filter((r) => r.on && r.start && r.date)
  const edit = (i: number, p: Partial<Row>) => setEdits((e) => ({ ...e, [i]: { ...e[i], ...p } }))

  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText())
      setEdits({})
    } catch {
      /* браузер не дал прочитать буфер — вставь вручную */
    }
  }

  const create = async () => {
    for (const r of ready) {
      await addEvent({ title: title.trim() || 'Событие', projectId: projectId || undefined, date: r.date, start: r.start, end: r.end && r.end > r.start ? r.end : undefined, place: r.place, notes: '' }, repeat)
    }
    setDone(ready.length * (repeat + 1))
  }

  if (done !== null) {
    return (
      <Sheet title="Готово" onClose={onClose}>
        <p className="note note-sky">Создано событий: {done}. Они уже в «Парах» (лента дня и неделя), на «Сегодня» и в «Активностях».</p>
      </Sheet>
    )
  }

  return (
    <Sheet title="Расписание из сообщения" onClose={onClose}>
      <p className="muted" style={{ marginBottom: 8 }}>
        Вставь сообщение как есть — например, из чата: «10.11 (пн) 18:00–20:00, 12.11 ср 19:00 актовый зал». Я найду даты и время.
      </p>
      <textarea
        className="input"
        rows={5}
        value={text}
        onChange={(e) => (setText(e.target.value), setEdits({}))}
        placeholder={'Репетиции посвята:\n10.11 (пн) 18:00–20:00\n12.11 ср 19:00, актовый зал\n15 ноября в 12:00'}
        autoFocus
      />
      {'clipboard' in navigator && (
        <button className="link-btn" style={{ marginTop: 6 }} onClick={paste}>
          Вставить из буфера
        </button>
      )}

      {text.trim() && rows.length === 0 && <p className="note note-warn" style={{ marginTop: 10 }}>Не нашёл ни одной даты. Даты пишутся так: 10.11, 10 ноября, пн, завтра.</p>}

      {rows.length > 0 && (
        <div className="form" style={{ marginTop: 12 }}>
          <div className="grid2">
            <label className="field">
              <span>Название</span>
              <input className="input" value={title} onChange={(e) => setTitleEdit(e.target.value)} />
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
          </div>

          <div className="field">
            <span>Найдено: {rows.length}. Проверь и поправь, если нужно</span>
            {rows.map((r, i) => (
              <div key={i} className={`paste-row${r.on ? '' : ' off'}`}>
                <label className="check-row" style={{ padding: 0, border: 0 }}>
                  <input type="checkbox" checked={r.on} onChange={(e) => edit(i, { on: e.target.checked })} />
                  <span className="cbx" aria-hidden="true">
                    {r.on ? '✓' : ''}
                  </span>
                  <b>{formatIsoLong(r.date)}</b>
                </label>
                <div className="quick-row">
                  <input className="input" type="time" value={r.start} onChange={(e) => edit(i, { start: e.target.value })} aria-label="Начало" />
                  <span className="muted">—</span>
                  <input className="input" type="time" value={r.end} onChange={(e) => edit(i, { end: e.target.value })} aria-label="Конец" />
                </div>
                <input className="input" value={r.place} onChange={(e) => edit(i, { place: e.target.value })} placeholder="Место" />
                {r.warn && r.on && <span className="muted" style={{ color: 'var(--warn)', fontSize: 13, fontWeight: 700 }}>{r.warn}</span>}
                {!r.start && r.on && <span className="muted" style={{ color: 'var(--danger)', fontSize: 13 }}>Укажи время — без него событие не создастся</span>}
                <span className="muted paste-src">«{r.line}»</span>
              </div>
            ))}
          </div>

          <label className="field">
            <span>Повтор</span>
            <select className="input" value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
              {REPEATS.map(([n, l]) => (
                <option key={n} value={n}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {rows.length > 0 && (
        <div className="sheet-actions">
          <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!ready.length} onClick={create}>
            Создать {ready.length * (repeat + 1)} {ready.length * (repeat + 1) === 1 ? 'событие' : 'событий'}
          </button>
        </div>
      )}
    </Sheet>
  )
}
