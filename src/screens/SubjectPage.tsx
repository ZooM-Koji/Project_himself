import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FilesField from '../components/FilesField'
import { IconBack, IconEdit, IconLink } from '../components/Icons'
import LessonCard, { shortKind } from '../components/LessonCard'
import LessonSheet from '../components/LessonSheet'
import Markdown from '../components/Markdown'
import QuickTaskInput from '../components/QuickTaskInput'
import SubjectEditor from '../components/SubjectEditor'
import TaskEditor from '../components/TaskEditor'
import TaskRow from '../components/TaskRow'
import { formatIsoLong } from '../lib/dates'
import { db } from '../lib/db'
import { addNote, noteExcerpt, noteTitle, useNotes } from '../lib/notes'
import { lessonId, useSchedule, type DayItem } from '../lib/schedule'
import { subjectColor, subjectFacts, useSubjectRecords } from '../lib/subjects'
import { sortTasks, useTasks, type Task, type TaskDraft } from '../lib/tasks'
import { useAllSubjects } from '../lib/useAllSubjects'
import { useNow } from '../lib/useNow'

export default function SubjectPage() {
  const name = decodeURIComponent(useParams().name ?? '')
  const navigate = useNavigate()
  const now = useNow()
  const s = useSchedule()
  const rec = useSubjectRecords().get(name)
  const allTasks = useTasks()
  const subjects = useAllSubjects()
  const notes = useNotes(name) ?? []
  const [edit, setEdit] = useState(false)
  const [openLesson, setOpenLesson] = useState<DayItem | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [showDone, setShowDone] = useState(false)

  const facts = subjectFacts(name, s.lessons, now)
  const color = subjectColor(name, rec)
  const tasks = (allTasks ?? []).filter((t) => t.subject === name).sort(sortTasks)
  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  const newNote = async () => navigate(`/study/notes/${await addNote(name)}`)
  const removeSubject = async () => {
    if (confirm(`Убрать предмет «${name}» из списка? Задания и конспекты останутся.`)) {
      await db.subjects.update(name, { deleted: true, updatedAt: Date.now() })
      navigate('/study')
    }
  }

  return (
    <>
      <header className="page-head">
        <Link to="/study" className="icon-btn" aria-label="Назад к учёбе">
          <IconBack size={20} />
        </Link>
        <button className="icon-btn" aria-label="Изменить предмет" onClick={() => setEdit(true)}>
          <IconEdit size={20} />
        </button>
      </header>

      <section className="card subj-head" style={{ borderTop: `6px solid ${color}` }}>
        <h1>{name}</h1>
        <div className="quick-preview" style={{ marginTop: 8 }}>
          {facts.kinds.map((k) => (
            <span key={k} className="chip">
              {shortKind(k)}
            </span>
          ))}
          {facts.total > 0 && <span className="chip chip-muted">пар в расписании: {facts.total}</span>}
          {facts.total === 0 && <span className="chip chip-muted">в опубликованном расписании нет</span>}
        </div>
      </section>

      <div className="today-grid">
        <div className="stack">
          {facts.next && (
            <>
              <h2 className="section-title">Ближайшая пара</h2>
              <div className="card next-card">
                <span className="next-when">{formatIsoLong(facts.next.date)}</span>
                <LessonCard
                  it={{ type: 'lesson', start: facts.next.start, end: facts.next.end, item: { lesson: facts.next, id: lessonId(facts.next) } }}
                  onOpen={() =>
                    setOpenLesson({ type: 'lesson', start: facts.next!.start, end: facts.next!.end, item: { lesson: facts.next!, id: lessonId(facts.next!) } })
                  }
                />
              </div>
            </>
          )}

          <h2 className="section-title">О предмете</h2>
          <div className="card">
            {facts.teachers.map((t) => (
              <div key={t.name} className="kv">
                <span className="muted">{t.kinds.map((k) => shortKind(k)).join(', ')}</span>
                <b>{t.name}</b>
              </div>
            ))}
            {facts.rooms.length > 0 && (
              <div className="kv">
                <span className="muted">Аудитории</span>
                <b>{facts.rooms.slice(0, 6).join(', ')}</b>
              </div>
            )}
            {rec?.contacts && <Section title="Контакты" text={rec.contacts} />}
            {rec?.requirements && <Section title="Требования" text={rec.requirements} />}
            {rec?.notes && <Section title="Заметка" text={rec.notes} />}
            {!rec?.contacts && !rec?.requirements && (
              <button className="link-btn" style={{ marginTop: 10 }} onClick={() => setEdit(true)}>
                + Контакты, требования к зачёту/экзамену
              </button>
            )}
          </div>

          <h2 className="section-title">Материалы</h2>
          <div className="card">
            {rec?.links.map((l, i) => (
              <div key={i} className="link-row">
                <IconLink size={16} />
                <a href={l.url} target="_blank" rel="noreferrer noopener">
                  {l.title || l.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
            ))}
            {!rec?.links.length && (
              <button className="link-btn" style={{ marginBottom: 10 }} onClick={() => setEdit(true)}>
                + Ссылка на учебник в Лани, методичку, СДО
              </button>
            )}
            <FilesField ownerType="subject" ownerId={name} />
          </div>
        </div>

        <div className="stack">
          <h2 className="section-title">Задания</h2>
          <QuickTaskInput subjects={subjects} defaultSubject={name} onMore={setDraft} />
          {open.length > 0 && (
            <div className="card task-list">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} now={now} onOpen={() => setOpenTask(t)} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <button className="link-btn" onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Скрыть сданные' : `Сданные: ${done.length}`}
            </button>
          )}
          {showDone && (
            <div className="card task-list">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} now={now} onOpen={() => setOpenTask(t)} />
              ))}
            </div>
          )}

          <h2 className="section-title">
            Конспекты
            <button className="link-btn" onClick={newNote}>
              + Новый
            </button>
          </h2>
          <div className="card">
            {notes.length === 0 ? (
              <p className="muted">Пока нет. Нажми «+ Новый» — можно писать прямо на паре.</p>
            ) : (
              notes.map((n) => (
                <Link key={n.id} to={`/study/notes/${n.id}`} className="note-row">
                  <b>{noteTitle(n)}</b>
                  <span className="muted">{noteExcerpt(n) || 'пусто'}</span>
                </Link>
              ))
            )}
          </div>

          {rec?.custom && (
            <button className="link-btn" style={{ color: 'var(--danger)', marginTop: 8 }} onClick={removeSubject}>
              Убрать предмет
            </button>
          )}
        </div>
      </div>

      {edit && <SubjectEditor name={name} rec={rec} onClose={() => setEdit(false)} />}
      {openLesson && <LessonSheet it={openLesson} onClose={() => setOpenLesson(null)} />}
      {openTask && <TaskEditor task={openTask} subjects={subjects} onClose={() => setOpenTask(null)} />}
      {draft && <TaskEditor draft={draft} subjects={subjects} onClose={() => setDraft(null)} />}
    </>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="subj-section">
      <span className="muted">{title}</span>
      <Markdown text={text} />
    </div>
  )
}
