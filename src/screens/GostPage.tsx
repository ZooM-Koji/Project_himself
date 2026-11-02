import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import { IconBack, IconTrash } from '../components/Icons'
import { db, type Reference } from '../lib/db'
import { EBS, ebsByUrl, formatRef, sortRefs, type RefData, type RefKind } from '../lib/gost'
import { useTasks } from '../lib/tasks'

const KINDS: [RefKind, string][] = [
  ['book', 'Книга'],
  ['ebs', 'Книга в ЭБС'],
  ['article', 'Статья'],
  ['web', 'Сайт'],
]

const today = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
const empty = (kind: RefKind): RefData => ({ kind, authors: '', title: '', accessed: today(), site: kind === 'ebs' ? EBS[0].site : '' })

function readDash(): '–' | '—' {
  try {
    return localStorage.getItem('zachetka.gostDash') === '—' ? '—' : '–'
  } catch {
    return '–'
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function GostPage() {
  const [params, setParams] = useSearchParams()
  const taskId = params.get('task') ?? ''
  const tasks = (useTasks() ?? []).filter((t) => t.status !== 'done' || t.id === taskId)
  const [d, setD] = useState<RefData>(empty('book'))
  const [editId, setEditId] = useState<string | null>(null)
  const [dash, setDash] = useState<'–' | '—'>(readDash)
  const [msg, setMsg] = useState<string | null>(null)
  const refs = useLiveQuery(() => db.refs.where({ taskId }).filter((r) => !r.deleted).toArray(), [taskId]) ?? []

  useEffect(() => {
    try {
      localStorage.setItem('zachetka.gostDash', dash)
    } catch {
      /* ничего страшного */
    }
  }, [dash])

  const set = (patch: Partial<RefData>) => setD((x) => ({ ...x, ...patch }))
  const text = d.title.trim() ? formatRef(d, dash) : ''
  const flash = (m: string) => (setMsg(m), setTimeout(() => setMsg(null), 2500))

  const save = async () => {
    if (!text) return
    const now = Date.now()
    if (editId) await db.refs.update(editId, { text, data: { ...d }, updatedAt: now })
    else await db.refs.add({ id: crypto.randomUUID(), taskId, text, data: { ...d }, createdAt: now, updatedAt: now, deleted: false })
    setEditId(null)
    setD(empty(d.kind))
    flash(editId ? 'Запись обновлена' : 'Добавлено в список')
  }
  const edit = (r: Reference) => {
    setD(r.data as unknown as RefData)
    setEditId(r.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = async (r: Reference) => {
    if (confirm('Убрать запись из списка?')) await db.refs.update(r.id, { deleted: true, updatedAt: Date.now() })
  }

  // Список: заново собираем записи с текущим тире, по алфавиту
  const list = sortRefs(refs.map((r) => formatRef(r.data as unknown as RefData, dash)))
  const listText = list.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const field = (key: keyof RefData, label: string, placeholder = '', props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" value={(d[key] as string) ?? ''} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} {...props} />
    </label>
  )

  return (
    <>
      <header className="page-head">
        <Link to="/study" className="icon-btn" aria-label="Назад">
          <IconBack size={20} />
        </Link>
        <h1 style={{ flex: 1, fontSize: 22 }}>Литература по ГОСТ</h1>
      </header>

      <div className="chips">
        {KINDS.map(([k, l]) => (
          <button key={k} className={`pill small${d.kind === k ? ' active' : ''}`} onClick={() => set({ kind: k, site: k === 'ebs' ? (EBS.some((e) => e.site === d.site) ? d.site : EBS[0].site) : d.kind === 'ebs' ? '' : d.site })}>
            {l}
          </button>
        ))}
      </div>

      <div className="card form">
        <label className="field">
          <span>Авторы — по одному в строке</span>
          <textarea
            className="input"
            rows={2}
            value={d.authors}
            onChange={(e) => set({ authors: e.target.value })}
            placeholder={'Иванов Иван Иванович\nПетров П.П.'}
          />
        </label>
        {field('title', 'Заглавие', d.kind === 'web' ? 'Банк России' : 'Экономическая теория')}
        {d.kind !== 'article' && field('subtitle', 'Сведения к заглавию', d.kind === 'web' ? 'официальный сайт' : 'учебник для вузов')}
        {(d.kind === 'book' || d.kind === 'ebs') && (
          <>
            {field('extra', 'Редактор, переводчик (если есть)', 'под редакцией С. С. Сидорова')}
            {field('edition', 'Издание', '3-е изд., перераб. и доп.')}
            <div className="grid2">
              {field('city', 'Город', 'Москва')}
              {field('publisher', 'Издательство', 'Юрайт')}
            </div>
            <div className="grid2">
              {field('year', 'Год', '2024', { inputMode: 'numeric' })}
              {field('pages', 'Страниц', '320', { inputMode: 'numeric' })}
            </div>
            {field('series', 'Серия (если есть)', 'Высшее образование')}
            {field('isbn', 'ISBN', '978-5-534-…')}
          </>
        )}
        {d.kind === 'article' && (
          <>
            {field('journal', 'Журнал', 'Вопросы экономики')}
            <div className="grid2">
              {field('year', 'Год', '2024', { inputMode: 'numeric' })}
              {field('issue', 'Номер', '5')}
            </div>
            <div className="grid2">
              {field('volume', 'Том (если есть)', '')}
              {field('pages', 'Страницы', '10-25')}
            </div>
            <label className="check-row" style={{ padding: '4px 0' }}>
              <input type="checkbox" checked={!!d.electronic} onChange={(e) => set({ electronic: e.target.checked })} />
              <span className="cbx" aria-hidden="true">
                {d.electronic ? '✓' : ''}
              </span>
              <span>Читал онлайн (КиберЛенинка, eLIBRARY…)</span>
            </label>
          </>
        )}
        {d.kind === 'web' && (
          <>
            {field('site', 'Сайт (если это статья на сайте)', 'РБК : сайт')}
            <div className="grid2">
              {field('city', 'Город (если есть)', 'Москва')}
              {field('year', 'Год (если есть)', '')}
            </div>
          </>
        )}
        {(d.kind === 'ebs' || d.kind === 'web' || (d.kind === 'article' && d.electronic)) && (
          <>
            {field('url', 'Ссылка', 'https://e.lanbook.com/book/…', {
              inputMode: 'url',
              onBlur: (e) => {
                const e2 = ebsByUrl(e.target.value)
                if (d.kind === 'ebs' && e2) set({ site: e2.site })
              },
            })}
            {d.kind === 'ebs' && (
              <label className="field">
                <span>ЭБС</span>
                <select className="input" value={EBS.find((e) => e.site === d.site)?.id ?? ''} onChange={(e) => set({ site: EBS.find((x) => x.id === e.target.value)?.site ?? d.site })}>
                  {EBS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {field('accessed', 'Дата обращения', 'ДД.ММ.ГГГГ')}
          </>
        )}
      </div>

      <h2 className="section-title">Запись</h2>
      <div className="card gost-out">
        {text ? <p>{text}</p> : <p className="muted">Заполни хотя бы заглавие — здесь появится готовая запись.</p>}
        <div className="sheet-actions">
          <button className="pill primary" disabled={!text} onClick={async () => flash((await copy(text)) ? 'Скопировано' : 'Не удалось скопировать')}>
            Копировать
          </button>
          <button className="pill" disabled={!text} onClick={save}>
            {editId ? 'Сохранить изменения' : '+ В список'}
          </button>
          {editId && (
            <button className="link-btn" onClick={() => (setEditId(null), setD(empty(d.kind)))}>
              Отмена
            </button>
          )}
        </div>
        {msg && <p className="muted" style={{ marginTop: 8 }}>{msg}</p>}
        <div className="segmented small" style={{ width: 230, marginTop: 12 }} title="Какое тире между частями записи">
          <button className={dash === '–' ? 'on' : ''} onClick={() => setDash('–')}>
            Тире «–»
          </button>
          <button className={dash === '—' ? 'on' : ''} onClick={() => setDash('—')}>
            Тире «—»
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          ГОСТ разделяет части записи «. –». Если кафедра просит длинное тире — переключи.
        </p>
      </div>

      <h2 className="section-title">
        Список литературы
        {list.length > 0 && (
          <button className="link-btn" onClick={async () => flash((await copy(listText)) ? `Скопировано: ${list.length}` : 'Не удалось скопировать')}>
            Копировать всё
          </button>
        )}
      </h2>
      <div className="card stack" style={{ gap: 10 }}>
        <label className="field">
          <span>Для какой работы</span>
          <select className="input" value={taskId} onChange={(e) => setParams(e.target.value ? { task: e.target.value } : {}, { replace: true })}>
            <option value="">Общий список</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.subject ? ` (${t.subject})` : ''}
              </option>
            ))}
          </select>
        </label>
        {list.length === 0 ? (
          <p className="muted">Пока пусто. Заполни форму и нажми «+ В список» — записи встанут по алфавиту и с номерами.</p>
        ) : (
          <ol className="gost-list">
            {refs
              .map((r) => ({ r, t: formatRef(r.data as unknown as RefData, dash) }))
              .sort((a, b) => a.t.localeCompare(b.t, 'ru', { sensitivity: 'base' }))
              .map(({ r, t }) => (
                <li key={r.id}>
                  <span onClick={() => edit(r)}>{t}</span>
                  <button aria-label="Убрать" onClick={() => remove(r)}>
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
          </ol>
        )}
      </div>
    </>
  )
}
