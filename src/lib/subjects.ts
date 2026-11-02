// Предметы: что известно из расписания + что Максим дописал сам.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Subject } from './db'
import { findNextPair } from './quickParse'
import type { RuzLesson } from './schedule'

export type { Subject }

/** Цвета карточек предметов (в тон теме). */
export const SUBJECT_COLORS: Record<string, string> = {
  violet: '#7b5cf0',
  sky: '#3ec5f0',
  mint: '#22b07d',
  amber: '#f5a524',
  coral: '#ef6f6c',
  pink: '#e05fb0',
  teal: '#14a3a3',
  slate: '#6b7a99',
}

/** Цвет по умолчанию — стабильный по названию. */
export function subjectColor(name: string, s?: Subject): string {
  if (s?.color && SUBJECT_COLORS[s.color]) return SUBJECT_COLORS[s.color]
  const keys = Object.keys(SUBJECT_COLORS)
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SUBJECT_COLORS[keys[h % keys.length]]
}

export const emptySubject = (name: string): Subject => ({
  id: name,
  name,
  contacts: '',
  requirements: '',
  notes: '',
  links: [],
  updatedAt: 0,
  deleted: false,
})

export async function saveSubject(name: string, patch: Partial<Subject>) {
  const cur = (await db.subjects.get(name)) ?? emptySubject(name)
  await db.subjects.put({ ...cur, ...patch, id: name, name, updatedAt: Date.now(), deleted: false })
}

export function useSubjectRecords(): Map<string, Subject> {
  const rows = useLiveQuery(() => db.subjects.filter((s) => !s.deleted).toArray(), []) ?? []
  return new Map(rows.map((s) => [s.id, s]))
}

/** Сводка по предмету из расписания. */
export interface SubjectFacts {
  teachers: { name: string; kinds: string[] }[]
  rooms: string[]
  kinds: string[]
  total: number // пар в опубликованном расписании
  next?: RuzLesson
}

export function subjectFacts(name: string, lessons: RuzLesson[], now: Date): SubjectFacts {
  const mine = lessons.filter((l) => l.subject === name)
  const teachers = new Map<string, Set<string>>()
  const rooms = new Set<string>()
  const kinds = new Set<string>()
  for (const l of mine) {
    for (const t of l.teacher.split(/,\s*/).filter(Boolean)) {
      teachers.set(t, (teachers.get(t) ?? new Set()).add(l.kind))
    }
    if (l.room) rooms.add(l.room)
    kinds.add(l.kind)
  }
  const nextRef = findNextPair(mine, now, name)
  return {
    teachers: [...teachers].map(([n, k]) => ({ name: n, kinds: [...k] })),
    rooms: [...rooms],
    kinds: [...kinds],
    total: mine.length,
    next: nextRef ? mine.find((l) => l.date === nextRef.date && l.start === nextRef.start) : undefined,
  }
}
