import { eventEnd, useProjectName, type CalEvent } from '../lib/activities'

/** Карточка события (в ленте дня, неделе, на «Сегодня»). */
export default function EventCard({ e, onOpen, style, compact }: { e: CalEvent; onOpen: () => void; style?: React.CSSProperties; compact?: boolean }) {
  const project = useProjectName(e.projectId)
  return (
    <button className={`lesson tone-event${compact ? ' compact' : ''}`} style={style} onClick={onOpen}>
      <span className="lesson-top">
        <span>
          {e.start} – {eventEnd(e)}
        </span>
        {e.seriesId && <span className="chip chip-muted" style={{ padding: '0 8px', fontSize: 11 }}>каждую неделю</span>}
      </span>
      <span className="lesson-title">{e.title}</span>
      <span className="lesson-meta">{[project, e.place].filter(Boolean).join(' · ') || 'событие'}</span>
    </button>
  )
}
