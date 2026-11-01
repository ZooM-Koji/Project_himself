import { IconCalendar, IconStar, IconTasks } from './Icons'
import Sheet from './Sheet'

const ITEMS = [
  { title: 'Задание', hint: 'Будет на этапе 1.5', icon: <IconTasks /> },
  { title: 'Событие', hint: 'Будет на этапе 3', icon: <IconStar /> },
  { title: 'Пара вручную', hint: 'Скоро', icon: <IconCalendar /> },
]

export default function QuickAddSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Добавить" onClose={onClose}>
      {ITEMS.map((i) => (
        <div key={i.title} className="row-link" style={{ opacity: 0.6 }}>
          <span className="row-icon">{i.icon}</span>
          <span className="row-text">
            <span className="row-title">{i.title}</span>
            <div className="muted">{i.hint}</div>
          </span>
        </div>
      ))}
    </Sheet>
  )
}
