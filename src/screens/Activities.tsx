import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Empty from '../components/Empty'
import EventCard from '../components/EventCard'
import EventEditor from '../components/EventEditor'
import { IconChevron, IconStar } from '../components/Icons'
import PageHead from '../components/PageHead'
import ProjectEditor from '../components/ProjectEditor'
import PasteScheduleSheet from '../components/PasteScheduleSheet'
import { KIND_LABEL, useEvents, useProjects, type CalEvent } from '../lib/activities'
import { addDays, capitalize, formatIsoLong } from '../lib/dates'
import { isoDate } from '../lib/schedule'
import { useTasks } from '../lib/tasks'

export const projectPath = (id: string) => `/activities/p/${id}`

export default function Activities() {
  const navigate = useNavigate()
  const projects = useProjects()
  const events = useEvents()
  const tasks = useTasks() ?? []
  const [newProject, setNewProject] = useState(false)
  const [openEvent, setOpenEvent] = useState<CalEvent | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [paste, setPaste] = useState(false)

  const today = isoDate(new Date())
  const upcoming = events.filter((e) => e.date >= today && e.date <= isoDate(addDays(new Date(), 14)))
  const byDate = new Map<string, CalEvent[]>()
  for (const e of upcoming) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])

  const active = (projects ?? []).filter((p) => !p.archived)
  const archived = (projects ?? []).filter((p) => p.archived)
  const nextOf = (id: string) => events.find((e) => e.projectId === id && e.date >= today)
  const openTasksOf = (id: string) => tasks.filter((t) => t.projectId === id && t.status !== 'done').length

  const projectRow = (p: (typeof active)[number]) => {
    const n = nextOf(p.id)
    const t = openTasksOf(p.id)
    return (
      <Link key={p.id} to={projectPath(p.id)} className="row-link">
        <span className={`row-icon kind-${p.kind}`}>
          <IconStar />
        </span>
        <span className="row-text">
          <span className="row-title">{p.title}</span>
          <div className="muted" style={{ fontSize: 13 }}>
            {[KIND_LABEL[p.kind], n ? `ближайшее: ${formatIsoLong(n.date).toLowerCase()}` : '', t ? `задач: ${t}` : ''].filter(Boolean).join(' · ')}
          </div>
        </span>
        <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
      </Link>
    )
  }

  return (
    <>
      <PageHead title="Активности" back="/life" />
      <button className="pill primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={() => setPaste(true)}>
        Вставить расписание из сообщения
      </button>

      <h2 className="section-title">
        Ближайшие 2 недели
        <button className="link-btn" onClick={() => setOpenEvent('new')}>
          + Событие
        </button>
      </h2>
      {upcoming.length === 0 ? (
        <div className="card">
          <p className="muted">Событий нет. Добавь репетицию, собрание или выступление — они появятся в расписании недели и на «Сегодня».</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {[...byDate].map(([d, list]) => (
            <div key={d} className="card">
              <h3 className="week-day">{capitalize(formatIsoLong(d))}</h3>
              <div className="stack" style={{ gap: 8 }}>
                {list.map((e) => (
                  <EventCard key={e.id} e={e} onOpen={() => setOpenEvent(e)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: 18 }}>
        Проекты
        <button className="link-btn" onClick={() => setNewProject(true)}>
          + Проект
        </button>
      </h2>
      {projects && active.length === 0 ? (
        <Empty
          icon={<IconStar />}
          title="Проектов пока нет"
          text="Студсовет, «Школа актива», подготовка мероприятия, репетиции — у каждого проекта свои события, задачи и заметки."
        />
      ) : (
        <div className="card">{active.map(projectRow)}</div>
      )}

      {archived.length > 0 && (
        <>
          <button className="link-btn" style={{ marginTop: 12 }} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Скрыть архив' : `Архив: ${archived.length}`}
          </button>
          {showArchived && <div className="card" style={{ marginTop: 8, opacity: 0.8 }}>{archived.map(projectRow)}</div>}
        </>
      )}

      {newProject && <ProjectEditor onClose={() => setNewProject(false)} onCreated={(id) => navigate(projectPath(id))} />}
      {paste && <PasteScheduleSheet onClose={() => setPaste(false)} />}
      {openEvent && <EventEditor event={openEvent === 'new' ? undefined : openEvent} onClose={() => setOpenEvent(null)} />}
    </>
  )
}
