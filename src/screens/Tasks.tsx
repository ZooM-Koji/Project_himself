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

export default function Tasks() {
  const now = useNow()
  const tasks = useTasks()
  const subjects = useSubjects(tasks)
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') as Filter) || 'all'
  const subject = params.get('subject') ?? ''
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
    .filter((t) => !subject || t.subject === subject)
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

  return (
    <>
      <PageHead title="Задания" />
      <QuickTaskInput subjects={subjects} onMore={setDraft} />

      <div className="chips" style={{ marginTop: 14 }}>
        {FILTERS.map(([f, label]) => (
          <button key={f} className={filter === f ? 'pill small active' : 'pill small'} onClick={() => setParam('filter', f === 'all' ? '' : f)}>
            {label}
          </button>
        ))}
      </div>
      {taskSubjects.length > 0 && (
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
          title={tasks.length === 0 ? 'Заданий пока нет' : 'Здесь пусто'}
          text={
            tasks.length === 0
              ? 'Напиши задание в строке выше, например «лаба по цифровой культуре до чт».'
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
                  {BUCKET_TITLE[b]} <span className="count">{items.length}</span>
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
      {draft && <TaskEditor draft={draft} subjects={subjects} onClose={() => setDraft(null)} />}
    </>
  )
}
