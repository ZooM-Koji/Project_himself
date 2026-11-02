import { useEffect, useMemo, useRef, useState } from 'react'
import Empty from '../components/Empty'
import EventCard from '../components/EventCard'
import EventEditor from '../components/EventEditor'
import { IconCalendar } from '../components/Icons'
import LessonCard from '../components/LessonCard'
import LessonSheet from '../components/LessonSheet'
import PageHead from '../components/PageHead'
import TaskEditor from '../components/TaskEditor'
import TaskRow from '../components/TaskRow'
import { eventEnd, useEvents, type CalEvent } from '../lib/activities'
import { addDays, capitalize, formatIsoLong, formatMonth, fromIso, startOfWeek } from '../lib/dates'
import { dayLoad, formatHours, LEVEL_LABEL, type DayLoad } from '../lib/load'
import { isoDate, toMinutes, useSchedule, type DayItem, type ScheduleView } from '../lib/schedule'
import { useSubjects, useTasks, type Task } from '../lib/tasks'
import { useNow } from '../lib/useNow'

const FIRST_HOUR = 8
const LAST_HOUR = 21
const HOUR_PX = 64
const TOP_PAD = 20 // совпадает с padding-top у .timeline в styles.css
const LEFT = 60 // ширина колонки времени

type Mode = 'day' | 'week'
/** Элемент ленты дня: пара (или выбор группы / убранная пара) либо событие внеучебки. */
type Item = DayItem | { type: 'event'; start: string; end: string; event: CalEvent }

export default function Schedule() {
  const now = useNow()
  const today = isoDate(now)
  const s = useSchedule()
  const events = useEvents()
  const tasks = useTasks() ?? []
  const subjects = useSubjects()
  const [selected, setSelected] = useState(today)
  const [mode, setMode] = useState<Mode>('day')
  const [open, setOpen] = useState<DayItem | null>(null)
  const [openEvent, setOpenEvent] = useState<CalEvent | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Лента дат: с понедельника недели, где начинается расписание (или текущей), до его конца.
  const days = useMemo(() => {
    const from = s.file && s.file.range.from < today ? s.file.range.from : today
    const to = s.file && s.file.range.to > today ? s.file.range.to : isoDate(addDays(new Date(), 13))
    const out: string[] = []
    for (let d = startOfWeek(fromIso(from)); isoDate(d) <= to; d = addDays(d, 1)) out.push(isoDate(d))
    return out
  }, [s.file, today])

  useEffect(() => {
    stripRef.current?.querySelector('.selected')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [days.length])

  const evBusy = events.map((e) => ({ date: e.date, start: e.start, end: eventEnd(e) }))
  const loadOf = (d: string) => dayLoad(d, s.lessons, evBusy, tasks)
  const itemsOf = (d: string): Item[] =>
    [
      ...s.day(d),
      ...events.filter((e) => e.date === d).map((e) => ({ type: 'event' as const, start: e.start, end: eventEnd(e), event: e })),
    ].sort((a, b) => a.start.localeCompare(b.start))
  const openItem = (it: Item) => (it.type === 'event' ? setOpenEvent(it.event) : setOpen(it))

  return (
    <>
      <PageHead title="Расписание" />
      <div className="sched-bar">
        <span className="muted">{formatMonth(fromIso(selected))}</span>
        <div className="segmented small" role="tablist">
          <button className={mode === 'day' ? 'on' : ''} onClick={() => setMode('day')}>
            День
          </button>
          <button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>
            Неделя
          </button>
        </div>
      </div>

      <div className="date-strip" ref={stripRef}>
        {days.map((d) => {
          const dt = fromIso(d)
          const count = s.day(d).filter((i) => i.type !== 'removed').length
          const hasEvent = events.some((e) => e.date === d)
          return (
            <button
              key={d}
              className={['day-dot', d === today ? 'today' : '', d === selected ? 'selected' : '', `load-${loadOf(d).level}`].join(' ')}
              onClick={() => setSelected(d)}
            >
              <span className="dow">{dt.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
              <span className="num">{dt.getDate()}</span>
              <span className="marks">
                {count > 0 && <i className="mark" />}
                {hasEvent && <i className="mark mark-event" />}
                {s.changedDates.has(d) && <i className="mark mark-warn" />}
              </span>
            </button>
          )
        })}
      </div>

      {!s.ready ? null : !s.file && events.length === 0 ? (
        <Empty
          icon={<IconCalendar />}
          title="Расписание ещё не загружено"
          text="Нужен интернет при первом запуске: приложение скачает расписание и дальше будет работать без сети."
        />
      ) : mode === 'day' ? (
        <DayTimeline s={s} date={selected} now={now} items={itemsOf(selected)} onOpen={openItem} />
      ) : (
        <WeekList
          s={s}
          date={selected}
          now={now}
          itemsOf={itemsOf}
          loadOf={loadOf}
          tasks={tasks}
          onOpen={openItem}
          onOpenTask={setOpenTask}
        />
      )}

      {s.file && <SourceLine fetchedAt={s.file.fetchedAt} />}
      {open && <LessonSheet it={open} onClose={() => setOpen(null)} />}
      {openEvent && <EventEditor event={openEvent} onClose={() => setOpenEvent(null)} />}
      {openTask && <TaskEditor task={openTask} subjects={subjects} onClose={() => setOpenTask(null)} />}
    </>
  )
}

function SourceLine({ fetchedAt }: { fetchedAt: string }) {
  const d = new Date(fetchedAt)
  return (
    <p className="muted" style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
      Из РУЗ САФУ · версия от {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })},{' '}
      {d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
    </p>
  )
}

/** Раскладка по колонкам, если пары/события пересекаются по времени. */
function layout(items: Item[]) {
  const placed: { it: Item; col: number; cols: number }[] = []
  let cluster: typeof placed = []
  let clusterEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1))
    cluster.forEach((p) => (p.cols = cols))
    placed.push(...cluster)
    cluster = []
  }
  for (const it of items) {
    const st = toMinutes(it.start)
    if (st >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    const used = new Set(cluster.filter((p) => toMinutes(p.it.end) > st).map((p) => p.col))
    let col = 0
    while (used.has(col)) col++
    cluster.push({ it, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, toMinutes(it.end))
  }
  flush()
  return placed
}

function DayTimeline({ s, date, now, items, onOpen }: { s: ScheduleView; date: string; now: Date; items: Item[]; onOpen: (it: Item) => void }) {
  // Ранние/поздние события расширяют ленту
  const minH = Math.min(FIRST_HOUR, ...items.map((i) => Math.floor(toMinutes(i.start) / 60)))
  const maxH = Math.max(LAST_HOUR, ...items.map((i) => Math.ceil(toMinutes(i.end) / 60) - 1))
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i)
  const y = (hhmm: string) => TOP_PAD + ((toMinutes(hhmm) - minH * 60) / 60) * HOUR_PX
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = date === isoDate(now) && nowMin >= minH * 60 && nowMin <= (maxH + 1) * 60

  let note: string | null = null
  if (items.length === 0) {
    note = s.covers(date) ? 'В РУЗ на этот день пар нет' : 'На эту дату РУЗ ещё не опубликовал расписание'
  }

  return (
    <div className="card timeline">
      {hours.map((h) => (
        <div key={h} className="hour">
          <span>{String(h).padStart(2, '0')}:00</span>
        </div>
      ))}
      {layout(items).map(({ it, col, cols }, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          top: y(it.start),
          height: Math.max(36, y(it.end) - y(it.start) - 4),
          left: `calc(${LEFT}px + (100% - ${LEFT + 12}px) * ${col / cols})`,
          width: `calc((100% - ${LEFT + 12}px) / ${cols} - 6px)`,
        }
        return it.type === 'event' ? (
          <EventCard key={i} e={it.event} onOpen={() => onOpen(it)} compact={cols > 1} style={style} />
        ) : (
          <LessonCard key={i} it={it} onOpen={() => onOpen(it)} compact={cols > 1} style={style} />
        )
      })}
      {showNow && <div className="now-line" style={{ top: TOP_PAD + ((nowMin - minH * 60) / 60) * HOUR_PX }} />}
      {note && (
        <div className="timeline-note">
          <b>{note}</b>
        </div>
      )}
    </div>
  )
}

/** Полоска нагрузки: 8 часов занятости = полная. */
function LoadBar({ load }: { load: DayLoad }) {
  const pct = Math.min(100, (load.busyMin / (8 * 60)) * 100)
  return (
    <div className={`load load-${load.level}`}>
      <div className="load-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>
        {LEVEL_LABEL[load.level]}
        {load.busyMin ? ` · ${formatHours(load.busyMin)}` : ''}
        {load.deadlines ? ` · дедлайнов: ${load.deadlines}` : ''}
      </span>
    </div>
  )
}

function WeekList({
  s,
  date,
  now,
  itemsOf,
  loadOf,
  tasks,
  onOpen,
  onOpenTask,
}: {
  s: ScheduleView
  date: string
  now: Date
  itemsOf: (d: string) => Item[]
  loadOf: (d: string) => DayLoad
  tasks: Task[]
  onOpen: (it: Item) => void
  onOpenTask: (t: Task) => void
}) {
  const monday = startOfWeek(fromIso(date))
  const week = Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i)))
  const loads = week.map(loadOf)
  const total = loads.reduce((a, l) => a + l.busyMin, 0)
  return (
    <div className="stack">
      <div className="card week-summary">
        <b>Неделя: занято {formatHours(total)}</b>
        <div className="week-bars">
          {week.map((d, i) => (
            <div key={d} className={`wb load-${loads[i].level}`} title={LEVEL_LABEL[loads[i].level]}>
              <i style={{ height: `${Math.max(4, Math.min(100, (loads[i].busyMin / 480) * 100))}%` }} />
              <span>{fromIso(d).toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </div>
      {week.map((d, i) => {
        const items = itemsOf(d)
        const due = tasks.filter((t) => t.dueDate === d && t.status !== 'done')
        if (items.length === 0 && due.length === 0 && fromIso(d).getDay() === 0) return null // пустое воскресенье
        return (
          <div key={d} className="card">
            <h3 className="week-day">{capitalize(formatIsoLong(d))}</h3>
            <LoadBar load={loads[i]} />
            {items.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>{s.covers(d) ? 'Пар нет' : 'Расписание ещё не опубликовано'}</p>
            ) : (
              <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                {items.map((it, j) =>
                  it.type === 'event' ? <EventCard key={j} e={it.event} onOpen={() => onOpen(it)} /> : <LessonCard key={j} it={it} onOpen={() => onOpen(it)} />,
                )}
              </div>
            )}
            {due.length > 0 && (
              <div className="week-due">
                <span className="muted">Срок сдачи:</span>
                {due.map((t) => (
                  <TaskRow key={t.id} task={t} now={now} onOpen={() => onOpenTask(t)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
