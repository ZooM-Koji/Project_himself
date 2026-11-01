import { Link } from 'react-router-dom'
import Empty from '../components/Empty'
import { IconAlert, IconCalendar, IconCheck, IconClock, IconMoon, IconSettings, IconTasks } from '../components/Icons'
import { USER_NAME } from '../config'
import { formatLongDate, greeting, plural } from '../lib/dates'

export default function Today() {
  const now = new Date()
  // Пока данных нет — все счётчики нулевые. Настоящие цифры появятся на этапе 1.5.
  const stats = { done: 0, inProgress: 0, overdue: 0, week: 0 }
  const todayTasks = 0

  const tiles = [
    { label: 'Сделано', value: stats.done, tone: 'tone-ok', icon: <IconCheck size={20} /> },
    { label: 'В работе', value: stats.inProgress, tone: 'tone-accent', icon: <IconClock size={20} /> },
    { label: 'Просрочено', value: stats.overdue, tone: 'tone-danger', icon: <IconAlert size={20} /> },
    { label: 'На неделе', value: stats.week, tone: 'tone-sky', icon: <IconCalendar size={20} /> },
  ]

  return (
    <>
      <section className="hero">
        <div className="hero-top">
          <span className="hero-date">{formatLongDate(now)}</span>
          <Link to="/settings" className="icon-btn only-mobile" aria-label="Настройки">
            <IconSettings size={20} />
          </Link>
        </div>
        <h1>
          {greeting(now)}, {USER_NAME}
        </h1>
        <p className="hero-sub">
          {todayTasks === 0
            ? 'На сегодня заданий нет'
            : `${todayTasks} ${plural(todayTasks, ['задание', 'задания', 'заданий'])} на сегодня`}
        </p>
      </section>

      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className="tile">
            <span className={`tile-icon ${t.tone}`}>{t.icon}</span>
            <span className="tile-num">{t.value}</span>
            <span className="tile-label">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="today-grid">
        <div className="stack">
          <h2 className="section-title">Следующая пара</h2>
          <Empty
            icon={<IconCalendar />}
            title="Расписание ещё не подключено"
            text="Пары из РУЗ САФУ начнут подтягиваться сами на этапе 1."
          />
        </div>
        <div className="stack">
          <h2 className="section-title">Задания на сегодня и завтра</h2>
          <Empty
            icon={<IconTasks />}
            title="Пока пусто"
            text="Добавлять задания с дедлайнами можно будет на этапе 1.5."
          />
          <h2 className="section-title">Вечером</h2>
          <Empty icon={<IconMoon />} title="Событий нет" text="Репетиции, студсовет и мероприятия — на этапе 3." />
        </div>
      </div>
    </>
  )
}
