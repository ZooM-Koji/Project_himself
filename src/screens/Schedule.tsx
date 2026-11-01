import { useEffect, useMemo, useRef, useState } from 'react'
import Empty from '../components/Empty'
import { IconCalendar } from '../components/Icons'
import LessonCard from '../components/LessonCard'
import LessonSheet from '../components/LessonSheet'
import PageHead from '../components/PageHead'
import { addDays, capitalize, formatIsoLong, formatMonth, fromIso, startOfWeek } from '../lib/dates'
import { isoDate, toMinutes, useSchedule, type DayItem, type ScheduleView } from '../lib/schedule'
import { useNow } from '../lib/useNow'

const FIRST_HOUR = 8
const LAST_HOUR = 21
const HOUR_PX = 64
const TOP_PAD = 20 // совпадает с padding-top у .timeline в styles.css
const LEFT = 60 // ширина колонки времени

type Mode = 'day' | 'week'

export default function Schedule() {
  const now = useNow()
  const today = isoDate(now)
  const s = useSchedule()
  const [selected, setSelected] = useState(today)
  const [mode, setMode] = useState<Mode>('day')
  const [open, setOpen] = useState<DayItem | null>(null)
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
          return (
            <button
              key={d}
              className={['day-dot', d === today ? 'today' : '', d === selected ? 'selected' : ''].join(' ')}
              onClick={() => setSelected(d)}
            >
              <span className="dow">{dt.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
              <span className="num">{dt.getDate()}</span>
              <span className="marks">
                {count > 0 && <i className="mark" />}
                {s.changedDates.has(d) && <i className="mark mark-warn" />}
              </span>
            </button>
          )
        })}
      </div>

      {!s.ready ? null : !s.file ? (
        <Empty
          icon={<IconCalendar />}
          title="Расписание ещё не загружено"
          text="Нужен интернет при первом запуске: приложение скачает расписание и дальше будет работать без сети."
        />
      ) : mode === 'day' ? (
        <DayTimeline s={s} date={selected} now={now} onOpen={setOpen} />
      ) : (
        <WeekList s={s} date={selected} onOpen={setOpen} />
      )}

      {s.file && <SourceLine fetchedAt={s.file.fetchedAt} />}
      {open && <LessonSheet it={open} onClose={() => setOpen(null)} />}
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

/** Раскладка по колонкам, если пары пересекаются по времени. */
function layout(items: DayItem[]) {
  const placed: { it: DayItem; col: number; cols: number }[] = []
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

function DayTimeline({
  s,
  date,
  now,
  onOpen,
}: {
  s: ScheduleView
  date: string
  now: Date
  onOpen: (it: DayItem) => void
}) {
  const items = s.day(date)
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)
  const y = (hhmm: string) => TOP_PAD + ((toMinutes(hhmm) - FIRST_HOUR * 60) / 60) * HOUR_PX
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = date === isoDate(now) && nowMin >= FIRST_HOUR * 60 && nowMin <= (LAST_HOUR + 1) * 60

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
      {layout(items).map(({ it, col, cols }, i) => (
        <LessonCard
          key={i}
          it={it}
          onOpen={() => onOpen(it)}
          compact={cols > 1}
          style={{
            position: 'absolute',
            top: y(it.start),
            height: y(it.end) - y(it.start) - 4,
            left: `calc(${LEFT}px + (100% - ${LEFT + 12}px) * ${col / cols})`,
            width: `calc((100% - ${LEFT + 12}px) / ${cols} - 6px)`,
          }}
        />
      ))}
      {showNow && <div className="now-line" style={{ top: TOP_PAD + ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_PX }} />}
      {note && (
        <div className="timeline-note">
          <b>{note}</b>
        </div>
      )}
    </div>
  )
}

function WeekList({ s, date, onOpen }: { s: ScheduleView; date: string; onOpen: (it: DayItem) => void }) {
  const monday = startOfWeek(fromIso(date))
  const week = Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i)))
  return (
    <div className="stack">
      {week.map((d) => {
        const items = s.day(d)
        if (items.length === 0 && fromIso(d).getDay() === 0) return null // пустое воскресенье не показываем
        return (
          <div key={d} className="card">
            <h3 className="week-day">{capitalize(formatIsoLong(d))}</h3>
            {items.length === 0 ? (
              <p className="muted">{s.covers(d) ? 'Пар нет' : 'Расписание ещё не опубликовано'}</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {items.map((it, i) => (
                  <LessonCard key={i} it={it} onOpen={() => onOpen(it)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
