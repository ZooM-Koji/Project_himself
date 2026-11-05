import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Empty from '../components/Empty'
import { IconTasks } from '../components/Icons'
import PageHead from '../components/PageHead'
import QuickTaskInput from '../components/QuickTaskInput'
import TaskEditor from '../components/TaskEditor'
import TaskRow from '../components/TaskRow'
import { useNow } from '../lib/useNow'
import {
  BUCKET_TITLE,
  bucketOf,
  isLife,
  LIFE_LISTS,
  sortTasks,
  useSubjects,
  useTasks,
  weekRange,
  type Bucket,
  type Task,
  type TaskDraft,
} from '../lib/tasks'

type Filter = 'all' | 'week' | 'overdue' | 'done'

const FILTERS: [Filter, string][] = [
  ['all', 'Все'],
  ['week', 'На этой неделе'],
  ['overdue', 'Просрочено'],
  ['done', 'Сдано'],
]

const ORDER: Bucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'nodate', 'done']

/** Учебные задания или (life) личные дела — один экран, разные фильтры. */
export default function Tasks({ life = false }: { life?: boolean }) {
  const now = useNow()
  const allTasks = useTasks()
  const tasks = allTasks?.filter((t) => isLife(t) === life)
  const subjects = useSubjects(tasks)
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') as Filter) || 'all'
  const subject = params.get('subject') ?? ''
  const listName = params.get('list') ?? ''
  const [open, setOpen] = useState<Task | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [showDone, setShowDone] = useState(false)

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }

  const [from, to] = weekRange(now)
  const list = (tasks ?? [])
    .filter((t) => (life ? !listName || (t.list ?? '') === listName : !subject || t.subject === subject))
    .filter((t) => {
      const b = bucketOf(t, now)
      if (filter === 'overdue') return b === 'overdue'
      if (filter === 'done') return b === 'done'
      if (filter === 'week') return b !== 'done' && !!t.dueDate && t.dueDate >= from && t.dueDate <= to
      return true
    })
    .sort(sortTasks)

  const groups = new Map<Bucket, Task[]>()
  for (const t of list) {
    const b = bucketOf(t, now)
    groups.set(b, [...(groups.get(b) ?? []), t])
  }
  // Сданные в общем списке свёрнуты (их со временем будет много), сначала новые.
  groups.get('done')?.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))

  const taskSubjects = [...new Set((tasks ?? []).map((t) => t.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))
  const lists = [...new Set([...LIFE_LISTS, ...(tasks ?? []).map((t) => t.list ?? '').filter(Boolean)])]

  return (
    <>
      <PageHead title={life ? 'Мои дела' : 'Задания'} back={life ? '/life' : undefined} />
      {life && (
        <div className="chips">
          <button className={`pill small${!listName ? ' active' : ''}`} onClick={() => setParam('list', '')}>
            Все списки
          </button>
          {lists.map((l) => (
            <button key={l} className={`pill small${listName === l ? ' active' : ''}`} onClick={() => setParam('list', l)}>
              {l}
            </button>
          ))}
        </div>
      )}
      <QuickTaskInput subjects={subjects} onMore={setDraft} life={life ? { list: listName } : undefined} />

      <div className="chips" style={{ marginTop: 14 }}>
        {FILTERS.map(([f, label0]) => [f, life && f === 'done' ? 'Сделано' : label0] as const).map(([f, label]) => (
          <button key={f} className={filter === f ? 'pill small active' : 'pill small'} onClick={() => setParam('filter', f === 'all' ? '' : f)}>
            {label}
          </button>
        ))}
      </div>
      {!life && taskSubjects.length > 0 && (
        <select className="input subject-filter" value={subject} onChange={(e) => setParam('subject', e.target.value)} aria-label="Предмет">
          <option value="">Все предметы</option>
          {taskSubjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {tasks && list.length === 0 && (
        <Empty
          icon={<IconTasks />}
          title={tasks.length === 0 ? (life ? 'Личных дел пока нет' : 'Заданий пока нет') : 'Здесь пусто'}
          text={
            tasks.length === 0
              ? life
                ? 'Всё, что не про учёбу: «купить кроссовки до сб», «записаться к врачу завтра», «накопить на ноутбук».'
                : 'Напиши задание в строке выше, например «лаба по цифровой культуре до чт».'
              : filter === 'overdue'
                ? 'Просроченных заданий нет — так держать.'
                : 'Под этот фильтр ничего не подходит.'
          }
        />
      )}

      <div className="stack" style={{ marginTop: 6 }}>
        {ORDER.filter((b) => groups.has(b)).map((b) => {
          const items = groups.get(b)!
          const collapsed = b === 'done' && filter !== 'done' && !showDone
          return (
            <section key={b}>
              <h2 className={`section-title${b === 'overdue' ? ' danger' : ''}`}>
                <span>
                  {life && b === 'done' ? 'Сделано' : BUCKET_TITLE[b]} <span className="count">{items.length}</span>
                </span>
                {b === 'done' && filter !== 'done' && (
                  <button className="link-btn" onClick={() => setShowDone(!showDone)}>
                    {showDone ? 'Скрыть' : 'Показать'}
                  </button>
                )}
              </h2>
              {!collapsed && (
                <div className="card task-list">
                  {items.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} onOpen={() => setOpen(t)} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {open && <TaskEditor task={open} subjects={subjects} onClose={() => setOpen(null)} />}
      {draft && <TaskEditor draft={life ? { ...draft, area: 'life', list: draft.list ?? listName } : draft} subjects={subjects} onClose={() => setDraft(null)} />}
    </>
  )
}
