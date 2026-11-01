import { IconBook, IconChevron, IconFile, IconQuote } from '../components/Icons'
import PageHead from '../components/PageHead'

const ITEMS = [
  { title: 'Предметы и конспекты', text: 'Карточки предметов, материалы, заметки', stage: 'этап 2', icon: <IconBook /> },
  { title: 'Оформление по СТО САФУ', text: 'Чек-лист: поля, шрифт, интервалы, подписи', stage: 'этап 4', icon: <IconFile /> },
  { title: 'Список литературы по ГОСТ', text: 'Генератор записей по ГОСТ Р 7.0.100–2018', stage: 'этап 4', icon: <IconQuote /> },
]

export default function Study() {
  return (
    <>
      <PageHead title="Учёба" />
      <div className="card">
        {ITEMS.map((i) => (
          <div key={i.title} className="row-link">
            <span className="row-icon">{i.icon}</span>
            <span className="row-text">
              <span className="row-title">{i.title}</span>
              <div className="muted">{i.text}</div>
            </span>
            <span className="badge">{i.stage}</span>
            <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
          </div>
        ))}
      </div>
    </>
  )
}
