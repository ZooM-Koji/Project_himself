// Ссылки быстрого доступа: библиотеки (ЭБС) и свои сайты.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type QuickLink } from './db'

export type { QuickLink }

/** Стандартные — те, что назвал Максим. Постоянные id: на разных устройствах это одни и те же записи. */
export const DEFAULT_LINKS: QuickLink[] = [
  { id: 'lib:elibrary', title: 'eLIBRARY', url: 'https://elibrary.ru/', hint: 'Научная электронная библиотека', order: 1, updatedAt: 0, deleted: false },
  { id: 'lib:lan', title: 'Лань', url: 'https://e.lanbook.com/', hint: 'ЭБС «Лань»', order: 2, updatedAt: 0, deleted: false },
  { id: 'lib:znanium', title: 'Znanium', url: 'https://znanium.ru/', hint: 'ЭБС Znanium', order: 3, updatedAt: 0, deleted: false },
  { id: 'lib:cyberleninka', title: 'КиберЛенинка', url: 'https://cyberleninka.ru/', hint: 'Научные статьи в открытом доступе', order: 4, updatedAt: 0, deleted: false },
]

/** Стандартные + свои; сохранённая запись (изменённая или удалённая) важнее стандартной. */
export function useQuickLinks(): QuickLink[] {
  const rows = useLiveQuery(() => db.quickLinks.toArray(), []) ?? []
  const byId = new Map(DEFAULT_LINKS.map((l) => [l.id, l]))
  for (const r of rows) byId.set(r.id, r)
  return [...byId.values()].filter((l) => !l.deleted).sort((a, b) => a.order - b.order)
}

export async function saveQuickLink(l: Omit<QuickLink, 'updatedAt' | 'deleted'> & { deleted?: boolean }) {
  await db.quickLinks.put({ ...l, deleted: l.deleted ?? false, updatedAt: Date.now() })
}

export const removeQuickLink = (l: QuickLink) => saveQuickLink({ ...l, deleted: true })

export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
