// Задания: создание, изменение, мягкое удаление, группировка и счётчики.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task, type TaskStatus } from './db'
import { addDays, startOfWeek } from './dates'
import { isoDate, type ScheduleFile } from './schedule'
import { kvGet } from './db'

export type { Task, TaskStatus }

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Не начато',
  doing: 'В работе',
  done: 'Сдано',
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

export type TaskDraft = Pick<Task, 'title' | 'subject'> & Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>>

export async function addTask(d: TaskDraft): Promise<string> {
  const now = Date.now()
  const task: Task = {
    id: crypto.randomUUID(),
    status: 'todo',
    notes: '',
    links: [],
    ...d,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  }
  if (task.status === 'done') task.doneAt = now
  await db.tasks.add(task)
  return task.id
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const now = Date.now()
  const extra: Partial<Task> = {}
  if (patch.status === 'done') extra.doneAt = now
  else if (patch.status) extra.doneAt = undefined
  await db.tasks.update(id, { ...patch, ...extra, updatedAt: now })
}

/** Не начато → в работе → сдано → не начато */
export function cycleStatus(t: Task) {
  return updateTask(t.id, { status: NEXT_STATUS[t.status] })
}

/** Мягкое удаление: запись остаётся с deleted=true (нужно для синхронизации). */
export function deleteTask(id: string) {
  return updateTask(id, { deleted: true })
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.filter((t) => !t.deleted).toArray(), [])
}

/** Предметы для выбора: из расписания + те, что уже встречаются в заданиях. */
export function useSubjects(tasks: Task[] | undefined): string[] {
  const file = useLiveQuery(() => kvGet<ScheduleFile>('schedule.current'), [])
  const set = new Set<string>()
  for (const l of file?.lessons ?? []) set.add(l.subject)
  for (const t of tasks ?? []) if (t.subject) set.add(t.subject)
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}

// ---------- группировка ----------

export type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate' | 'done'

export const BUCKET_TITLE: Record<Bucket, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'На этой неделе',
  later: 'Позже',
  nodate: 'Без срока',
  done: 'Сдано',
}

export function bucketOf(t: Task, now: Date): Bucket {
  if (t.status === 'done') return 'done'
  if (!t.dueDate) return 'nodate'
  const today = isoDate(now)
  if (t.dueDate < today) return 'overdue'
  if (t.dueDate === today) return 'today'
  if (t.dueDate === isoDate(addDays(now, 1))) return 'tomorrow'
  if (t.dueDate <= isoDate(addDays(startOfWeek(now), 6))) return 'week'
  return 'later'
}

/** Порядок внутри группы: по сроку, потом по времени, потом по дате создания. */
export function sortTasks(a: Task, b: Task): number {
  return (
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
    (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99') ||
    a.createdAt - b.createdAt
  )
}

export function weekRange(now: Date): [string, string] {
  const mon = startOfWeek(now)
  return [isoDate(mon), isoDate(addDays(mon, 6))]
}

export interface TaskStats {
  doneWeek: number
  doing: number
  overdue: number
  week: number
  today: number
}

export function taskStats(tasks: Task[], now: Date): TaskStats {
  const [from, to] = weekRange(now)
  const monday = startOfWeek(now).getTime()
  const today = isoDate(now)
  let doneWeek = 0
  let doing = 0
  let overdue = 0
  let week = 0
  let todayN = 0
  for (const t of tasks) {
    if (t.status === 'done') {
      if ((t.doneAt ?? 0) >= monday) doneWeek++
      continue
    }
    if (t.status === 'doing') doing++
    if (t.dueDate && t.dueDate < today) overdue++
    if (t.dueDate && t.dueDate >= from && t.dueDate <= to && t.dueDate >= today) week++
    if (t.dueDate === today) todayN++
  }
  return { doneWeek, doing, overdue, week, today: todayN }
}
