import { Link, useNavigate } from 'react-router-dom'
import { IconChevron, IconDumbbell, IconStar, IconTasks } from '../components/Icons'
import PageHead from '../components/PageHead'
import QuickTaskInput from '../components/QuickTaskInput'
import { eventEnd, useEvents } from '../lib/activities'
import { formatDue, formatIsoLong, plural } from '../lib/dates'
import { GROUP_LABEL, workSets } from '../lib/gym'
import { startWorkout, useExercises, useWorkouts, withSuggestedWeights } from '../lib/gymData'
import { isoDate } from '../lib/schedule'
import { bucketOf, isLife, sortTasks, useTasks } from '../lib/tasks'
import { useNow } from '../lib/useNow'

/** «Жизнь»: личные дела, зал и внеучебка — всё, что не пары и не учёба. */
export default function Life() {
  const now = useNow()
  const navigate = useNavigate()
  const tasks = (useTasks() ?? []).filter(isLife)
  const workouts = useWorkouts() ?? []
  const exercises = useExercises()
  const events = useEvents()
  const today = isoDate(now)

  const open = tasks.filter((t) => t.status !== 'done').sort(sortTasks)
  const overdue = open.filter((t) => bucketOf(t, now) === 'overdue').length
  const soon = open.filter((t) => t.dueDate && t.dueDate <= isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)))

  const last = workouts[0]
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const lastGroups = last ? [...new Set(last.items.map((i) => byId.get(i.exerciseId)?.group).filter(Boolean))].map((g) => GROUP_LABEL[g!]) : []
  const weekAgo = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  const week = workouts.filter((w) => w.date >= weekAgo && w.items.some((i) => workSets(i).length)).length
  const nextEvent = events.find((e) => e.date > today || (e.date === today && eventEnd(e) > `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`))

  return (
    <>
      <PageHead title="Жизнь" />

      <section className="card life-card">
        <Link to="/life/todo" className="life-head">
          <span className="row-icon tone-ok">
            <IconTasks />
          </span>
          <span className="row-text">
            <span className="row-title">Мои дела</span>
            <div className="muted" style={{ fontSize: 13 }}>
              {open.length ? `${open.length} ${plural(open.length, ['дело', 'дела', 'дел'])}` : 'пока пусто'}
              {overdue ? ` · просрочено: ${overdue}` : ''}
            </div>
          </span>
          <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
        <QuickTaskInput subjects={[]} life={{ list: '' }} />
        {soon.slice(0, 3).map((t) => (
          <div key={t.id} className="life-line">
            <span>{t.title}</span>
            <span className={bucketOf(t, now) === 'overdue' ? 'due overdue' : 'due'}>{formatDue(t.dueDate!, t.dueTime, now)}</span>
          </div>
        ))}
      </section>

      <section className="card life-card">
        <Link to="/gym" className="life-head">
          <span className="row-icon tone-accent">
            <IconDumbbell />
          </span>
          <span className="row-text">
            <span className="row-title">Зал</span>
            <div className="muted" style={{ fontSize: 13 }}>
              {last ? `последняя: ${formatIsoLong(last.date).toLowerCase()}${lastGroups.length ? ` (${lastGroups.join(', ').toLowerCase()})` : ''}` : 'тренировок пока нет'}
              {` · на неделе: ${week}`}
            </div>
          </span>
          <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
        <div className="sheet-actions" style={{ marginTop: 0 }}>
          <button className="pill small primary" onClick={async () => navigate(`/gym/w/${await startWorkout()}`)}>
            Начать тренировку
          </button>
          {last && last.items.length > 0 && (
            <button className="pill small" onClick={async () => navigate(`/gym/w/${await startWorkout(withSuggestedWeights(last, workouts, exercises))}`)}>
              Повторить прошлую
            </button>
          )}
        </div>
      </section>

      <section className="card life-card">
        <Link to="/activities" className="life-head">
          <span className="row-icon tone-pink">
            <IconStar />
          </span>
          <span className="row-text">
            <span className="row-title">Активности</span>
            <div className="muted" style={{ fontSize: 13 }}>
              {nextEvent ? `ближайшее: ${nextEvent.title}, ${formatDue(nextEvent.date, nextEvent.start, now)}` : 'студсовет, репетиции, мероприятия'}
            </div>
          </span>
          <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
      </section>
    </>
  )
}
