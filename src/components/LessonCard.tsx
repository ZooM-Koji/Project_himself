import { plural } from '../lib/dates'
import type { DayItem, RuzLesson, ShownLesson } from '../lib/schedule'

/** Цвет карточки по типу занятия. */
export function kindTone(kind: string): string {
  const k = kind.toLowerCase()
  if (k.includes('лекц')) return 'lec'
  if (k.includes('лаб')) return 'lab'
  if (k.includes('практ') || k.includes('семинар')) return 'prac'
  return 'other'
}

export function shortKind(kind: string): string {
  const k = kind.toLowerCase()
  if (k.includes('лекц')) return 'Лекция'
  if (k.includes('лаб')) return 'Лабораторная'
  if (k.includes('практ')) return 'Практика'
  return kind
}

export function ChangeBadge({ item }: { item: ShownLesson }) {
  if (item.change === 'changed') return <span className="chg chg-changed">изменено</span>
  if (item.change === 'new') return <span className="chg chg-new">новая</span>
  return null
}

function meta(l: RuzLesson) {
  return [shortKind(l.kind), l.room].filter(Boolean).join(' · ')
}

/** Карточка пары (или выбора группы, или убранной пары). */
export default function LessonCard({
  it,
  onOpen,
  style,
  compact,
}: {
  it: DayItem
  onOpen: () => void
  style?: React.CSSProperties
  compact?: boolean
}) {
  const time = `${it.start} – ${it.end}`
  if (it.type === 'choice') {
    const l = it.options[0].lesson
    const changed = it.options.find((o) => o.change)
    return (
      <button className={`lesson tone-${kindTone(l.kind)} lesson-choice${compact ? ' compact' : ''}`} style={style} onClick={onOpen}>
        <span className="lesson-top">
          <span>{time}</span>
          {changed && <ChangeBadge item={changed} />}
        </span>
        <span className="lesson-title">{l.subject}</span>
        <span className="lesson-meta">
          {shortKind(l.kind)} · {it.options.length} {plural(it.options.length, ['группа', 'группы', 'групп'])} — выбери свою
        </span>
      </button>
    )
  }
  if (it.type === 'removed') {
    return (
      <button className={`lesson lesson-removed${compact ? ' compact' : ''}`} style={style} onClick={onOpen}>
        <span className="lesson-top">
          <span>{time}</span>
          <span className="chg chg-removed">убрана</span>
        </span>
        <span className="lesson-title">{it.lesson.subject}</span>
        <span className="lesson-meta">{meta(it.lesson)}</span>
      </button>
    )
  }
  const l = it.item.lesson
  return (
    <button className={`lesson tone-${kindTone(l.kind)}${compact ? ' compact' : ''}`} style={style} onClick={onOpen}>
      <span className="lesson-top">
        <span>{time}</span>
        {l.manualId ? <span className="chg chg-manual">вручную</span> : <ChangeBadge item={it.item} />}
      </span>
      <span className="lesson-title">{l.subject}</span>
      <span className="lesson-meta">{meta(l)}</span>
    </button>
  )
}
