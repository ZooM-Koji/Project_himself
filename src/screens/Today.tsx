import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Empty from '../components/Empty'
import { IconAlert, IconCalendar, IconCheck, IconClock, IconMoon, IconSettings, IconTasks } from '../components/Icons'
import LessonCard from '../components/LessonCard'
import LessonSheet from '../components/LessonSheet'
import { USER_NAME } from '../config'
import { addDays, capitalize, formatDuration, formatIsoLong, formatLongDate, greeting, plural } from '../lib/dates'
import { isoDate, toMinutes, useSchedule, type DayItem, type ScheduleView } from '../lib/schedule'
import { useNow } from '../lib/useNow'
import TaskRow from '../components/TaskRow'
import TaskEditor from '../components/TaskEditor'
import { bucketOf, sortTasks, taskStats, useSubjects, useTasks, type Task } from '../lib/tasks'

/** Ближайшая пара: сегодняшняя, которая ещё не кончилась, или первая в ближайшие 2 недели. */
function findNext(s: ScheduleView, now: Date): { date: string; it: DayItem } | null {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (let i = 0; i < 14; i++) {
    const date = isoDate(addDays(now, i))
    const it = s
      .day(date)
      .find((x) => x.type !== 'removed' && (i > 0 || toMinutes(x.end) > nowMin))
    if (it) return { date, it }
  }
  return null
}

function NextLesson({ s, now, onOpen }: { s: ScheduleView; now: Date; onOpen: (it: DayItem) => void }) {
  if (!s.file) {
    return (
      <Empty
        icon={<IconCalendar />}
        title="Расписание ещё не загружено"
        text="Подключитесь к интернету — приложение скачает расписание из РУЗ."
      />
    )
  }
  const next = findNext(s, now)
  if (!next) return <Empty icon={<IconCalendar />} title="Пар не видно" text="В ближайшие две недели в РУЗ пар нет." />

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const today = next.date === isoDate(now)
  const tomorrow = next.date === isoDate(addDays(now, 1))
  let when: string
  if (today && toMinutes(next.it.start) <= nowMin) when = `Идёт сейчас · ещё ${formatDuration(toMinutes(next.it.end) - nowMin)}`
  else if (today) when = `Через ${formatDuration(toMinutes(next.it.start) - nowMin)}`
  else if (tomorrow) when = `Завтра в ${next.it.start}`
  else when = `${capitalize(formatIsoLong(next.date))}, ${next.it.start}`

  return (
    <div className="card next-card">
      <span className="next-when">{when}</span>
      <LessonCard it={next.it} onOpen={() => onOpen(next.it)} />
    </div>
  )
}

export default function Today() {
  const now = useNow()
  const s = useSchedule()
  const [open, setOpen] = useState<DayItem | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const navigate = useNavigate()
  const tasks = useTasks()
  const subjects = useSubjects(tasks)
  const stats = taskStats(tasks ?? [], now)
  const soon = (tasks ?? [])
    .filter((t) => ['overdue', 'today', 'tomorrow'].includes(bucketOf(t, now)))
    .sort(sortTasks)

  const todayItems = s.day(isoDate(now)).filter((i) => i.type !== 'removed')
  const pairs = todayItems.length

  const tiles = [
    { label: 'Сделано за неделю', value: stats.doneWeek, tone: 'tone-ok', icon: <IconCheck size={20} />, to: '/tasks?filter=done' },
    { label: 'В работе', value: stats.doing, tone: 'tone-accent', icon: <IconClock size={20} />, to: '/tasks' },
    { label: 'Просрочено', value: stats.overdue, tone: 'tone-danger', icon: <IconAlert size={20} />, to: '/tasks?filter=overdue' },
    { label: 'На неделе', value: stats.week, tone: 'tone-sky', icon: <IconCalendar size={20} />, to: '/tasks?filter=week' },
  ]

  const summary: string[] = []
  if (stats.today > 0) summary.push(`${stats.today} ${plural(stats.today, ['задание', 'задания', 'заданий'])} на сегодня`)
  if (s.file && pairs > 0) summary.push(`${pairs} ${plural(pairs, ['пара', 'пары', 'пар'])}`)
  if (stats.overdue > 0) summary.push(`${stats.overdue} просрочено`)

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
        <p className="hero-sub">{summary.length ? summary.join(' · ') : 'Сегодня ни пар, ни дедлайнов'}</p>
      </section>

      <div className="tiles">
        {tiles.map((t) => (
          <button key={t.label} className="tile" onClick={() => navigate(t.to)}>
            <span className={`tile-icon ${t.tone}`}>{t.icon}</span>
            <span className="tile-num">{t.value}</span>
            <span className="tile-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="today-grid">
        <div className="stack">
          <h2 className="section-title">Следующая пара</h2>
          <NextLesson s={s} now={now} onOpen={setOpen} />
          {pairs > 1 && (
            <>
              <h2 className="section-title">
                Пары сегодня
                <Link to="/schedule" className="muted" style={{ fontWeight: 600 }}>
                  Всё расписание
                </Link>
              </h2>
              <div className="stack" style={{ gap: 8 }}>
                {todayItems.map((it, i) => (
                  <LessonCard key={i} it={it} onOpen={() => setOpen(it)} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="stack">
          <h2 className="section-title">
            Задания на сегодня и завтра
            <Link to="/tasks" className="muted" style={{ fontWeight: 600 }}>
              Все
            </Link>
          </h2>
          {soon.length === 0 ? (
            <Empty icon={<IconTasks />} title="Горящих дедлайнов нет" text="Новое задание — кнопка «+» или строка на экране «Задания»." />
          ) : (
            <div className="card task-list">
              {soon.map((t) => (
                <TaskRow key={t.id} task={t} now={now} onOpen={() => setOpenTask(t)} />
              ))}
            </div>
          )}
          <h2 className="section-title">Вечером</h2>
          <Empty icon={<IconMoon />} title="Событий нет" text="Репетиции, студсовет и мероприятия — на этапе 3." />
        </div>
      </div>
      {open && <LessonSheet it={open} onClose={() => setOpen(null)} />}
      {openTask && <TaskEditor task={openTask} subjects={subjects} onClose={() => setOpenTask(null)} />}
    </>
  )
}
