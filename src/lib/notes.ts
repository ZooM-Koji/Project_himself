// Конспекты и заметки (Markdown).
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Note } from './db'

export type { Note }

export async function addNote(subject: string, title = ''): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.notes.add({ id, subject, title, body: '', createdAt: now, updatedAt: now, deleted: false })
  return id
}

export async function updateNote(id: string, patch: Partial<Note>) {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteNote(id: string) {
  await updateNote(id, { deleted: true })
  await db.files.where({ ownerType: 'note', ownerId: id }).delete()
}

/** Все конспекты (или по предмету), свежие сверху. */
export function useNotes(subject?: string): Note[] | undefined {
  return useLiveQuery(
    () =>
      db.notes
        .filter((n) => !n.deleted && (subject === undefined || n.subject === subject))
        .toArray()
        .then((a) => a.sort((x, y) => y.updatedAt - x.updatedAt)),
    [subject],
  )
}

export function useNote(id: string | undefined): Note | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.notes.get(id)) ?? null) : null), [id])
}

/** Заголовок для списка: свой или первая строка текста. */
export function noteTitle(n: Note): string {
  if (n.title.trim()) return n.title.trim()
  const first = n.body.split('\n').find((l) => l.trim())
  return first ? first.replace(/^#+\s*|[*_`>]/g, '').trim().slice(0, 80) : 'Без названия'
}

/** Короткий отрывок текста без разметки. */
export function noteExcerpt(n: Note): string {
  return n.body
    .replace(/\]\([^)]*\)/g, ']') // [текст](ссылка) → [текст]
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xXхХ]\]\s*)?/gm, '') // маркеры списков и чек-листов
    .replace(/[#*_`>~[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
}
