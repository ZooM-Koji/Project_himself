import { useRef, useState } from 'react'
import { parseIcs, type IcsLesson } from '../lib/icsImport'
import { addManualLessons, deleteIcsLessons } from '../lib/manualLessons'
import { useSchedule } from '../lib/schedule'

/** Запасной вариант: загрузить расписание из .ics-файла (например, «Скачать» в РУЗ). */
export default function IcsImport() {
  const s = useSchedule()
  const ref = useRef<HTMLInputElement>(null)
  const [found, setFound] = useState<{ lessons: IcsLesson[]; dup: number; skipped: number } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const onFile = async (f?: File) => {
    if (!f) return
    setMsg(null)
    const { lessons, skipped } = parseIcs(await f.text())
    if (ref.current) ref.current.value = ''
    if (!lessons.length) return setMsg('В файле не нашлось пар с датой и временем.')
    // уже есть в расписании (из РУЗ или вручную) — не дублируем
    const have = new Set(s.lessons.map((l) => `${l.date}|${l.start}|${l.subject}`))
    const fresh = lessons.filter((l) => !have.has(`${l.date}|${l.start}|${l.subject}`))
    setFound({ lessons: fresh, dup: lessons.length - fresh.length, skipped })
  }

  const apply = async (replace: boolean) => {
    if (!found) return
    const removed = replace ? await deleteIcsLessons() : 0
    const n = await addManualLessons(found.lessons.map((l) => ({ ...l, notes: '', source: 'ics' as const })))
    setFound(null)
    setMsg(`Добавлено пар: ${n}${removed ? `, убрано из прошлого импорта: ${removed}` : ''}.`)
  }

  const range = found?.lessons.length ? `${found.lessons[0].date.split('-').reverse().join('.')} – ${found.lessons[found.lessons.length - 1].date.split('-').reverse().join('.')}` : ''

  return (
    <div style={{ marginTop: 12 }}>
      <button className="pill small" onClick={() => ref.current?.click()}>
        Импорт из .ics-файла
      </button>
      <input ref={ref} type="file" accept=".ics,text/calendar" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        Запасной вариант, если РУЗ долго недоступен: файл «Скачать» со страницы группы в РУЗ или экспорт из другого календаря.
      </p>
      {found && (
        <div className="note note-sky" style={{ marginTop: 8 }}>
          {found.lessons.length ? (
            <>
              Новых пар: <b>{found.lessons.length}</b> ({range})
              {found.dup ? `, уже есть в расписании: ${found.dup}` : ''}
              {found.skipped ? `, пропущено (без времени/отменённые): ${found.skipped}` : ''}.
              <div className="sheet-actions" style={{ marginTop: 8 }}>
                <button className="pill small primary" onClick={() => apply(false)}>
                  Добавить
                </button>
                <button className="pill small" onClick={() => apply(true)}>
                  Заменить прошлый импорт
                </button>
                <button className="link-btn" onClick={() => setFound(null)}>
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <>Все пары из файла уже есть в расписании — добавлять нечего.</>
          )}
        </div>
      )}
      {msg && <p className="note note-sky" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  )
}
