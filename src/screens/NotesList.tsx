import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Empty from '../components/Empty'
import { IconBack, IconFile } from '../components/Icons'
import { addNote, noteExcerpt, noteTitle, useNotes } from '../lib/notes'

export default function NotesList() {
  const notes = useNotes() ?? []
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const subjects = [...new Set(notes.map((n) => n.subject))].sort((a, b) => a.localeCompare(b, 'ru'))
  const needle = q.trim().toLowerCase()
  const list = notes.filter(
    (n) =>
      (!subject || n.subject === subject) &&
      (!needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)),
  )

  return (
    <>
      <header className="page-head">
        <Link to="/study" className="icon-btn" aria-label="Назад">
          <IconBack size={20} />
        </Link>
        <h1 style={{ flex: 1 }}>Конспекты</h1>
        <button className="pill primary small" onClick={async () => navigate(`/study/notes/${await addNote(subject)}`)}>
          + Новый
        </button>
      </header>
      <div className="stack" style={{ gap: 8 }}>
        <input className="input" style={{ background: 'var(--card)' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по тексту" />
        {subjects.length > 1 && (
          <select className="input subject-filter" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s || 'без предмета'}
              </option>
            ))}
          </select>
        )}
      </div>
      {list.length === 0 ? (
        <Empty icon={<IconFile />} title={notes.length ? 'Ничего не нашлось' : 'Конспектов пока нет'} text="Новый конспект — кнопка «+ Новый»." />
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          {list.map((n) => (
            <Link key={n.id} to={`/study/notes/${n.id}`} className="note-row">
              <b>{noteTitle(n)}</b>
              <span className="muted">
                {n.subject || 'без предмета'} · {new Date(n.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                {noteExcerpt(n) ? ` — ${noteExcerpt(n)}` : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
