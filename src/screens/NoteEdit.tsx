import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FilesField from '../components/FilesField'
import { IconBack, IconTrash } from '../components/Icons'
import Markdown from '../components/Markdown'
import { deleteNote, updateNote, useNote } from '../lib/notes'
import { useAllSubjects } from '../lib/useAllSubjects'
import { subjectPath } from './Study'

type Tool = { label: string; title: string; wrap?: [string, string]; prefix?: string }

const TOOLS: Tool[] = [
  { label: 'B', title: 'Жирный', wrap: ['**', '**'] },
  { label: 'I', title: 'Курсив', wrap: ['*', '*'] },
  { label: 'H', title: 'Заголовок', prefix: '## ' },
  { label: '•', title: 'Список', prefix: '- ' },
  { label: '1.', title: 'Нумерованный список', prefix: '1. ' },
  { label: '☐', title: 'Чек-лист', prefix: '- [ ] ' },
  { label: '❝', title: 'Цитата', prefix: '> ' },
  { label: '🔗', title: 'Ссылка', wrap: ['[', '](https://)'] },
]

export default function NoteEdit() {
  const { id } = useParams()
  const note = useNote(id)
  const navigate = useNavigate()
  const subjects = useAllSubjects()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [mode, setMode] = useState<'edit' | 'view'>('edit')
  const [saved, setSaved] = useState(true)
  const loaded = useRef(false)
  const area = useRef<HTMLTextAreaElement>(null)

  // Загрузить один раз; дальше источник правды — поля на экране (сохраняем с задержкой).
  useEffect(() => {
    if (note && !loaded.current) {
      loaded.current = true
      setTitle(note.title)
      setBody(note.body)
      setSubject(note.subject)
      setMode(note.body.trim() ? 'view' : 'edit')
    }
  }, [note])

  useEffect(() => {
    if (!loaded.current || !id) return
    setSaved(false)
    const t = setTimeout(async () => {
      await updateNote(id, { title, body, subject })
      setSaved(true)
    }, 500)
    return () => clearTimeout(t)
  }, [id, title, body, subject])

  if (note === undefined) return null
  if (note === null || note.deleted)
    return (
      <div className="card empty" style={{ marginTop: 24 }}>
        <h3>Конспект не найден</h3>
        <Link to="/study" className="link-btn">
          К учёбе
        </Link>
      </div>
    )

  const apply = (tool: Tool) => {
    const el = area.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    let next: string
    let cursor: number
    if (tool.wrap) {
      const sel = body.slice(a, b) || 'текст'
      next = body.slice(0, a) + tool.wrap[0] + sel + tool.wrap[1] + body.slice(b)
      cursor = a + tool.wrap[0].length + sel.length
    } else {
      const lineStart = body.lastIndexOf('\n', a - 1) + 1
      next = body.slice(0, lineStart) + tool.prefix + body.slice(lineStart)
      cursor = b + tool.prefix!.length
    }
    // Применяем сразу (flushSync), а не «в следующем кадре»: иначе буквы, набранные
    // сразу после нажатия кнопки, попадали не туда и терялись.
    flushSync(() => setBody(next))
    el.focus()
    el.setSelectionRange(cursor, cursor)
  }

  const remove = async () => {
    if (confirm('Удалить конспект?')) {
      await deleteNote(note.id)
      navigate(subject ? subjectPath(subject) : '/study')
    }
  }

  return (
    <>
      <header className="page-head">
        <Link to={subject ? subjectPath(subject) : '/study'} className="icon-btn" aria-label="Назад">
          <IconBack size={20} />
        </Link>
        <span className="muted">{saved ? 'Сохранено' : 'Сохраняю…'}</span>
        <div className="segmented small" style={{ width: 170 }}>
          <button className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>
            Правка
          </button>
          <button className={mode === 'view' ? 'on' : ''} onClick={() => setMode('view')}>
            Просмотр
          </button>
        </div>
      </header>

      <div className="card note-card">
        <input className="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тема конспекта" />
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет">
          <option value="">— без предмета —</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {mode === 'edit' ? (
          <>
            <div className="md-toolbar" role="toolbar" aria-label="Оформление">
              {TOOLS.map((t) => (
                <button key={t.title} type="button" title={t.title} aria-label={t.title} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(t)}>
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              ref={area}
              className="input note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Пиши как обычно. Можно:\n# Заголовок\n- список\n**жирный**, *курсив*\n- [ ] чек-лист'}
              autoFocus={!note.body}
            />
          </>
        ) : body.trim() ? (
          <Markdown text={body} />
        ) : (
          <p className="muted">Пусто. Нажми «Правка», чтобы писать.</p>
        )}
      </div>

      <h2 className="section-title">Фото и файлы</h2>
      <div className="card">
        <FilesField ownerType="note" ownerId={note.id} />
      </div>

      <button className="pill" style={{ color: 'var(--danger)', marginTop: 16 }} onClick={remove}>
        <IconTrash size={18} /> Удалить конспект
      </button>
    </>
  )
}
