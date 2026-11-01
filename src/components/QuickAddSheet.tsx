import { useEffect } from 'react'
import { IconCalendar, IconStar, IconTasks } from './Icons'

const ITEMS = [
  { title: 'Задание', hint: 'Будет на этапе 1.5', icon: <IconTasks /> },
  { title: 'Событие', hint: 'Будет на этапе 3', icon: <IconStar /> },
  { title: 'Пара вручную', hint: 'Будет на этапе 1', icon: <IconCalendar /> },
]

export default function QuickAddSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Быстро добавить" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Добавить</h2>
        {ITEMS.map((i) => (
          <div key={i.title} className="row-link" style={{ opacity: 0.6 }}>
            <span className="row-icon">{i.icon}</span>
            <span className="row-text">
              <span className="row-title">{i.title}</span>
              <div className="muted">{i.hint}</div>
            </span>
          </div>
        ))}
        <button className="pill" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
