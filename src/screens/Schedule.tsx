import { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../components/PageHead'
import { addDays, formatMonth, sameDay, startOfWeek } from '../lib/dates'

const FIRST_HOUR = 8
const LAST_HOUR = 21
const HOUR_PX = 56
const TOP_PAD = 20 // совпадает с padding-top у .timeline в styles.css

export default function Schedule() {
  const today = useMemo(() => new Date(), [])
  const [selected, setSelected] = useState(today)
  const stripRef = useRef<HTMLDivElement>(null)

  // Три недели, начиная с понедельника текущей.
  const days = useMemo(() => {
    const start = startOfWeek(today)
    return Array.from({ length: 21 }, (_, i) => addDays(start, i))
  }, [today])

  useEffect(() => {
    stripRef.current?.querySelector('.today')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)
  const minutesFromStart = (today.getHours() - FIRST_HOUR) * 60 + today.getMinutes()
  const showNow = sameDay(selected, today) && minutesFromStart >= 0 && today.getHours() <= LAST_HOUR

  const monthTitle = formatMonth(selected)

  return (
    <>
      <PageHead title="Расписание" />
      <p className="muted" style={{ marginTop: -10, marginBottom: 12 }}>
        {monthTitle}
      </p>

      <div className="date-strip" ref={stripRef}>
        {days.map((d) => (
          <button
            key={d.toISOString()}
            className={[
              'day-dot',
              sameDay(d, today) ? 'today' : '',
              sameDay(d, selected) ? 'selected' : '',
            ].join(' ')}
            onClick={() => setSelected(d)}
          >
            <span className="dow">{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
            <span className="num">{d.getDate()}</span>
          </button>
        ))}
      </div>

      <div className="card timeline">
        {hours.map((h) => (
          <div key={h} className="hour">
            <span>{String(h).padStart(2, '0')}:00</span>
          </div>
        ))}
        {showNow && (
          <div className="now-line" style={{ top: TOP_PAD + (minutesFromStart / 60) * HOUR_PX }} aria-label="Сейчас" />
        )}
        <div className="timeline-note">
          <b>Расписание ещё не подключено</b>
          <p className="muted">На этапе 1 пары будут загружаться из РУЗ САФУ автоматически.</p>
        </div>
      </div>
    </>
  )
}
