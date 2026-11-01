import { useState } from 'react'
import { formatIsoLong } from '../lib/dates'
import {
  chooseMyGroup,
  groupLabel,
  hideLesson,
  isWholeGroup,
  type DayItem,
  type RuzLesson,
  type ShownLesson,
} from '../lib/schedule'
import { ChangeBadge, shortKind } from './LessonCard'
import Sheet from './Sheet'
import TaskEditor from './TaskEditor'
import { useSubjects, useTasks } from '../lib/tasks'

const FIELD_NAMES: Partial<Record<keyof RuzLesson, string>> = {
  subject: 'Предмет',
  kind: 'Тип',
  teacher: 'Преподаватель',
  room: 'Аудитория',
  address: 'Адрес',
  start: 'Начало',
  end: 'Конец',
}

function Details({ l }: { l: RuzLesson }) {
  const rows: [string, string][] = [
    ['Когда', `${formatIsoLong(l.date)}, ${l.start} – ${l.end}${l.num ? ` (${l.num} пара)` : ''}`],
    ['Тип', l.kind],
    ['Аудитория', l.room],
    ['Адрес', l.address],
    ['Преподаватель', l.teacher],
    ['Поток / подгруппа', l.group ? groupLabel(l.group) : ''],
  ]
  return (
    <div>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="kv">
            <span className="muted">{k}</span>
            <b>{v}</b>
          </div>
        ))}
    </div>
  )
}

function ChangeNote({ s }: { s: ShownLesson }) {
  if (s.change === 'new') return <p className="note note-sky">Новая пара: её не было в прошлой версии расписания.</p>
  if (s.change !== 'changed' || !s.before) return null
  const diffs = (Object.keys(FIELD_NAMES) as (keyof RuzLesson)[]).filter((f) => s.before![f] !== s.lesson[f])
  return (
    <div className="note note-warn">
      <b>Изменено с прошлой загрузки:</b>
      {diffs.map((f) => (
        <div key={f}>
          {FIELD_NAMES[f]}: <s>{String(s.before![f]) || '—'}</s> → {String(s.lesson[f]) || '—'}
        </div>
      ))}
    </div>
  )
}

export default function LessonSheet({ it, onClose }: { it: DayItem; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const subjects = useSubjects(useTasks())
  const act = (fn: () => Promise<void>) => async () => {
    setBusy(true)
    await fn()
    onClose()
  }

  if (it.type === 'choice') {
    const l = it.options[0].lesson
    return (
      <Sheet title={l.subject} onClose={onClose}>
        <p className="muted" style={{ marginBottom: 8 }}>
          {shortKind(l.kind)}, {it.start} – {it.end}. В это время у разных потоков свои пары. Выбери свою — запомню для всех
          пар «{l.subject}» ({l.kind.toLowerCase()}), остальные скрою.
        </p>
        {it.options.map((o) => (
          <div key={o.id} className="row-link">
            <span className="row-text">
              <span className="row-title">{groupLabel(o.lesson.group)}</span>
              <div className="muted">{[o.lesson.teacher, o.lesson.room].filter(Boolean).join(' · ')}</div>
            </span>
            <ChangeBadge item={o} />
            <button className="pill primary small" disabled={busy} onClick={act(() => chooseMyGroup(o.lesson))}>
              Моя
            </button>
          </div>
        ))}
      </Sheet>
    )
  }

  if (it.type === 'removed') {
    return (
      <Sheet title={<s>{it.lesson.subject}</s>} onClose={onClose}>
        <p className="note note-danger">Этой пары больше нет в РУЗ: она была в прошлой версии расписания.</p>
        <Details l={it.lesson} />
      </Sheet>
    )
  }

  const s = it.item
  if (newTask) return <TaskEditor draft={{ title: '', subject: s.lesson.subject }} subjects={subjects} onClose={onClose} />
  return (
    <Sheet title={s.lesson.subject} onClose={onClose}>
      <ChangeNote s={s} />
      <Details l={s.lesson} />
      <div className="sheet-actions">
        <button className="pill primary" onClick={() => setNewTask(true)}>
          + Задание по предмету
        </button>
        {!isWholeGroup(s.lesson) && (
          <button className="pill" disabled={busy} onClick={act(() => chooseMyGroup(s.lesson))}>
            Это моя группа
          </button>
        )}
        <button className="pill" disabled={busy} onClick={act(() => hideLesson(s.lesson))}>
          Скрыть эту пару
        </button>
      </div>
    </Sheet>
  )
}
