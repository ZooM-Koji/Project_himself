import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconChevron, IconFile, IconQuote } from '../components/Icons'
import PageHead from '../components/PageHead'
import QuickLinkSheet from '../components/QuickLinkSheet'
import { addNote, noteTitle, useNotes } from '../lib/notes'
import { linkHost, useQuickLinks, type QuickLink } from '../lib/quickLinks'
import { useSchedule } from '../lib/schedule'
import { saveSubject, subjectColor, useSubjectRecords } from '../lib/subjects'
import { useTasks } from '../lib/tasks'
import { useAllSubjects } from '../lib/useAllSubjects'

export const subjectPath = (name: string) => `/study/s/${encodeURIComponent(name)}`

export default function Study() {
  const navigate = useNavigate()
  const links = useQuickLinks()
  const subjects = useAllSubjects()
  const records = useSubjectRecords()
  const tasks = useTasks() ?? []
  const notes = useNotes() ?? []
  const { file } = useSchedule()
  const [editLink, setEditLink] = useState<QuickLink | 'new' | null>(null)
  const [editMode, setEditMode] = useState(false)

  const inSchedule = new Set(file?.lessons.map((l) => l.subject))
  const openTasks = (s: string) => tasks.filter((t) => t.subject === s && t.status !== 'done').length
  const notesOf = (s: string) => notes.filter((n) => n.subject === s).length

  const addSubject = async () => {
    const name = prompt('Название предмета')?.trim()
    if (!name) return
    await saveSubject(name, { custom: true })
    navigate(subjectPath(name))
  }

  const newNote = async () => navigate(`/study/notes/${await addNote('')}`)

  return (
    <>
      <PageHead title="Учёба" />

      <h2 className="section-title">
        Библиотеки и сайты
        <span style={{ display: 'flex', gap: 14 }}>
          {editMode && (
            <button className="link-btn" onClick={() => setEditLink('new')}>
              + Своя
            </button>
          )}
          <button className="link-btn" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Готово' : 'Изменить'}
          </button>
        </span>
      </h2>
      <div className="lib-grid">
        {links.map((l) => (
          <a
            key={l.id}
            className={`lib-tile${editMode ? ' editing' : ''}`}
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => editMode && (e.preventDefault(), setEditLink(l))}
          >
            <span className="lib-letter" style={{ background: subjectColor(l.title) }}>
              {l.title.charAt(0).toUpperCase()}
            </span>
            <span className="lib-text">
              <b>{l.title}</b>
              <span className="muted">{linkHost(l.url)}</span>
            </span>
          </a>
        ))}
      </div>
      {editMode && (
        <p className="muted" style={{ fontSize: 12, margin: '6px 4px 0' }}>
          Нажми на плитку, чтобы изменить или убрать её.
        </p>
      )}

      <h2 className="section-title" style={{ marginTop: 18 }}>
        Предметы
        <button className="link-btn" onClick={addSubject}>
          + Добавить
        </button>
      </h2>
      <div className="card subject-list">
        {subjects.length === 0 && <p className="muted">Предметы появятся, когда загрузится расписание.</p>}
        {subjects.map((s) => {
          const nt = openTasks(s)
          const nn = notesOf(s)
          return (
            <Link key={s} to={subjectPath(s)} className="row-link">
              <span className="subj-dot" style={{ background: subjectColor(s, records.get(s)) }} />
              <span className="row-text">
                <span className="row-title">{s}</span>
                <div className="muted" style={{ fontSize: 13 }}>
                  {[nt ? `заданий: ${nt}` : '', nn ? `конспектов: ${nn}` : '', !inSchedule.has(s) ? 'нет в расписании' : '']
                    .filter(Boolean)
                    .join(' · ') || 'пока пусто'}
                </div>
              </span>
              <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
            </Link>
          )
        })}
      </div>

      <h2 className="section-title" style={{ marginTop: 18 }}>
        Конспекты
        <span style={{ display: 'flex', gap: 14 }}>
          {notes.length > 3 && (
            <Link to="/study/notes" className="link-btn">
              Все ({notes.length})
            </Link>
          )}
          <button className="link-btn" onClick={newNote}>
            + Новый
          </button>
        </span>
      </h2>
      <div className="card">
        {notes.length === 0 ? (
          <p className="muted">Конспектов пока нет. Их удобно заводить прямо из карточки предмета.</p>
        ) : (
          notes.slice(0, 3).map((n) => (
            <Link key={n.id} to={`/study/notes/${n.id}`} className="row-link">
              <span className="row-icon">
                <IconFile />
              </span>
              <span className="row-text">
                <span className="row-title">{noteTitle(n)}</span>
                <div className="muted" style={{ fontSize: 13 }}>
                  {n.subject || 'без предмета'} · {new Date(n.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
              </span>
            </Link>
          ))
        )}
      </div>

      <h2 className="section-title" style={{ marginTop: 18 }}>
        Помощники
      </h2>
      <div className="card">
        {[
          { to: '/study/sto', title: 'Оформление по СТО САФУ', text: 'Чек-лист: поля, шрифт, интервалы, подписи, раздел об ИИ', icon: <IconFile /> },
          { to: '/study/gost', title: 'Список литературы по ГОСТ', text: 'Книга, статья, сайт, ЭБС — готовая запись и список', icon: <IconQuote /> },
        ].map((i) => (
          <Link key={i.title} to={i.to} className="row-link">
            <span className="row-icon">{i.icon}</span>
            <span className="row-text">
              <span className="row-title">{i.title}</span>
              <div className="muted">{i.text}</div>
            </span>
            <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
          </Link>
        ))}
      </div>

      {editLink && <QuickLinkSheet link={editLink === 'new' ? undefined : editLink} count={links.length} onClose={() => setEditLink(null)} />}
    </>
  )
}
