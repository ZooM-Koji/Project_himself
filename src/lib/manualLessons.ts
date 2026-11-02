// Пары, добавленные вручную или из .ics-файла.
import { db, type ManualLesson } from './db'

export type { ManualLesson }

/** Время пар САФУ (по расписанию РУЗ). */
export const PAIR_SLOTS: [string, string][] = [
  ['08:20', '09:55'],
  ['10:10', '11:45'],
  ['12:00', '13:35'],
  ['14:30', '16:05'],
  ['16:15', '17:50'],
  ['18:00', '19:35'],
  ['19:40', '21:15'],
]

export const MANUAL_KINDS = ['Лекция', 'Практическое занятие', 'Лабораторная работа', 'Консультация', 'Зачёт', 'Экзамен', 'Отработка', 'Другое']

export type ManualDraft = Omit<ManualLesson, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>

export async function addManualLessons(list: ManualDraft[]): Promise<number> {
  const now = Date.now()
  await db.manualLessons.bulkAdd(list.map((m) => ({ ...m, id: crypto.randomUUID(), createdAt: now, updatedAt: now, deleted: false })))
  return list.length
}

export async function updateManualLesson(id: string, patch: Partial<ManualLesson>) {
  await db.manualLessons.update(id, { ...patch, updatedAt: Date.now() })
}

export const deleteManualLesson = (id: string) => updateManualLesson(id, { deleted: true })

/** Убрать все пары, импортированные из .ics (перед повторным импортом). */
export async function deleteIcsLessons(): Promise<number> {
  const now = Date.now()
  const rows = await db.manualLessons.where({ source: 'ics' }).filter((m) => !m.deleted).toArray()
  await db.manualLessons.bulkUpdate(rows.map((r) => ({ key: r.id, changes: { deleted: true, updatedAt: now } })))
  return rows.length
}
