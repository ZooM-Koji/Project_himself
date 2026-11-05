import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EventCard from '../components/EventCard'
import EventEditor from '../components/EventEditor'
import { IconBack, IconEdit } from '../components/Icons'
import Markdown from '../components/Markdown'
import ProjectEditor from '../components/ProjectEditor'
import PasteScheduleSheet from '../components/PasteScheduleSheet'
import QuickTaskInput from '../components/QuickTaskInput'
import TaskEditor from '../components/TaskEditor'
import TaskRow from '../components/TaskRow'
import { KIND_LABEL, updateProject, useEvents, useProject, type CalEvent } from '../lib/activities'
import { capitalize, formatIsoLong } from '../lib/dates'
import { isoDate } from '../lib/schedule'
import { sortTasks, useSubjects, useTasks, type Task, type TaskDraft } from '../lib/tasks'
import { useNow } from '../lib/useNow'

export default function ProjectPage() {
  const { id } = useParams()
  const project = useProject(id)
  const navigate = useNavigate()
  const now = useNow()
  const events = useEvents().filter((e) => e.projectId === id)
  const allTasks = useTasks()
  const subjects = useSubjects()
  const [edit, setEdit] = useState(false)
  const [openEvent, setOpenEvent] = useState<CalEvent | 'new' | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [paste, setPaste] = useState(false)

  if (project === undefined) return null
  if (project === null || project.deleted)
    return (
      <div className="card empty" style={{ marginTop: 24 }}>
        <h3>Проект не найден</h3>
        <Link to="/activities" className="link-btn">
          К активностям
        </Link>
      </div>
    )

  const today = isoDate(now)
  const future = events.filter((e) => e.date >= today)
  const past = events.filter((e) => e.date < today).reverse()
  const tasks = (allTasks ?? []).filter((t) => t.projectId === project.id).sort(sortTasks)
  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  const toggleArchive = async () => {
    await updateProject(project.id, { archived: !project.archived })
    if (!project.archived) navigate('/activities')
  }
  const remove = async () => {
    if (confirm(`Удалить проект «${project.title}»? События проекта останутся без проекта.`)) {
      await updateProject(project.id, { deleted: true })
      navigate('/activities')
    }
  }

  return (
    <>
      <header className="page-head">
        <Link to="/activities" className="icon-btn" aria-label="Назад к активностям">
          <IconBack size={20} />
        </Link>
        <button className="icon-btn" aria-label="Изменить проект" onClick={() => setEdit(true)}>
          <IconEdit size={20} />
        </button>
      </header>

      <section className={`card subj-head kind-top-${project.kind}`}>
        <h1>{project.title}</h1>
        <div className="quick-preview" style={{ marginTop: 8 }}>
          <span className="chip chip-pink">{KIND_LABEL[project.kind]}</span>
          {project.archived && <span className="chip chip-muted">в архиве</span>}
        </div>
        {project.notes && (
          <div style={{ marginTop: 12 }}>
            <Markdown text={project.notes} />
          </div>
        )}
      </section>

      <div className="today-grid">
        <div className="stack">
          <h2 className="section-title">
            События
            <span style={{ display: 'flex', gap: 14 }}>
              <button className="link-btn" onClick={() => setPaste(true)}>
                Из сообщения
              </button>
              <button className="link-btn" onClick={() => setOpenEvent('new')}>
                + Событие
              </button>
            </span>
          </h2>
          {future.length === 0 ? (
            <div className="card">
              <p className="muted">Впереди событий нет. Для репетиций можно включить повтор каждую неделю.</p>
            </div>
          ) : (
            <div className="card stack" style={{ gap: 8 }}>
              {future.map((e) => (
                <div key={e.id}>
                  <div className="muted" style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 4px' }}>
                    {capitalize(formatIsoLong(e.date))}
                  </div>
                  <EventCard e={e} onOpen={() => setOpenEvent(e)} />
                </div>
              ))}
            </div>
          )}
          {past.length > 0 && (
            <button className="link-btn" onClick={() => setShowPast(!showPast)}>
              {showPast ? 'Скрыть прошедшие' : `Прошедшие: ${past.length}`}
            </button>
          )}
          {showPast && (
            <div className="card stack" style={{ gap: 8, opacity: 0.75 }}>
              {past.map((e) => (
                <EventCard key={e.id} e={e} onOpen={() => setOpenEvent(e)} />
              ))}
            </div>
          )}
        </div>

        <div className="stack">
          <h2 className="section-title">Задачи</h2>
          <QuickTaskInput subjects={subjects} projectId={project.id} onMore={setDraft} />
          {open.length > 0 && (
            <div className="card task-list">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} now={now} onOpen={() => setOpenTask(t)} />
              ))}
            </div>
          )}
          {done.length > 0 && <p className="muted">Сделано: {done.length}</p>}

          <div className="sheet-actions" style={{ marginTop: 18 }}>
            <button className="pill" onClick={toggleArchive}>
              {project.archived ? 'Вернуть из архива' : 'В архив'}
            </button>
            <button className="pill" style={{ color: 'var(--danger)' }} onClick={remove}>
              Удалить
            </button>
          </div>
        </div>
      </div>

      {paste && <PasteScheduleSheet projectId={project.id} onClose={() => setPaste(false)} />}
      {edit && <ProjectEditor project={project} onClose={() => setEdit(false)} />}
      {openEvent && (
        <EventEditor event={openEvent === 'new' ? undefined : openEvent} draft={{ projectId: project.id }} onClose={() => setOpenEvent(null)} />
      )}
      {openTask && <TaskEditor task={openTask} subjects={subjects} onClose={() => setOpenTask(null)} />}
      {draft && <TaskEditor draft={draft} subjects={subjects} onClose={() => setDraft(null)} />}
    </>
  )
}
