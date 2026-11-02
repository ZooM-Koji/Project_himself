// Внеучебка: проекты и события.
import { createContext, useContext } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalEvent, type Project, type ProjectKind } from './db'
import { addDays } from './dates'
import { isoDate } from './schedule'

export type { CalEvent, Project, ProjectKind }

export const KIND_LABEL: Record<ProjectKind, string> = {
  council: 'Студсовет',
  school: 'Школа актива',
  event: 'Мероприятие',
  rehearsal: 'Репетиции',
  other: 'Другое',
}

/** Конец события: если не указан — через час. */
export function eventEnd(e: Pick<CalEvent, 'start' | 'end'>): string {
  if (e.end && e.end > e.start) return e.end
  const [h, m] = e.start.split(':').map(Number)
  const t = Math.min(h * 60 + m + 60, 23 * 60 + 59)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export async function addProject(title: string, kind: ProjectKind): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.projects.add({ id, title, kind, notes: '', createdAt: now, updatedAt: now, deleted: false })
  return id
}

export async function updateProject(id: string, patch: Partial<Project>) {
  await db.projects.update(id, { ...patch, updatedAt: Date.now() })
}

export type EventDraft = Omit<CalEvent, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'seriesId'>

/** Новое событие; repeatWeeks > 0 — ещё столько же копий через каждые 7 дней (одна серия). */
export async function addEvent(d: EventDraft, repeatWeeks = 0): Promise<string> {
  const now = Date.now()
  const seriesId = repeatWeeks > 0 ? crypto.randomUUID() : undefined
  const base = new Date(+d.date.slice(0, 4), +d.date.slice(5, 7) - 1, +d.date.slice(8, 10))
  const rows: CalEvent[] = []
  for (let i = 0; i <= repeatWeeks; i++) {
    rows.push({ ...d, id: crypto.randomUUID(), date: isoDate(addDays(base, i * 7)), seriesId, createdAt: now, updatedAt: now, deleted: false })
  }
  await db.events.bulkAdd(rows)
  return rows[0].id
}

export async function updateEvent(id: string, patch: Partial<CalEvent>) {
  await db.events.update(id, { ...patch, updatedAt: Date.now() })
}

/** Удалить событие; withFuture — и все следующие в его серии. */
export async function deleteEvent(e: CalEvent, withFuture = false) {
  const now = Date.now()
  const ids = withFuture && e.seriesId
    ? (await db.events.where({ seriesId: e.seriesId }).filter((x) => x.date >= e.date).toArray()).map((x) => x.id)
    : [e.id]
  await db.events.bulkUpdate(ids.map((key) => ({ key, changes: { deleted: true, updatedAt: now } })))
}

export function useProjects(): Project[] | undefined {
  return useLiveQuery(
    () => db.projects.filter((p) => !p.deleted).toArray().then((a) => a.sort((x, y) => x.title.localeCompare(y.title, 'ru'))),
    [],
  )
}

export function useProject(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.projects.get(id)) ?? null) : null), [id])
}

export function useEvents(): CalEvent[] {
  return (
    useLiveQuery(
      () => db.events.filter((e) => !e.deleted).toArray().then((a) => a.sort((x, y) => `${x.date}${x.start}`.localeCompare(`${y.date}${y.start}`))),
      [],
    ) ?? []
  )
}


/** Названия проектов по id — для строк заданий (без отдельного запроса на каждую строку). */
export const ProjectNamesContext = createContext<Map<string, string>>(new Map())
export const useProjectName = (id?: string) => {
  const m = useContext(ProjectNamesContext)
  return id ? m.get(id) : undefined
}
