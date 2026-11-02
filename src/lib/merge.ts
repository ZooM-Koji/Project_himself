// Слияние данных двух устройств: по каждой записи остаётся версия с бо́льшим updatedAt.
// Удаления тоже переносятся (это просто запись с deleted: true и свежим updatedAt).
// Только чистые функции — проверяются тестами (merge.test.ts).

export interface Rec {
  id: string
  updatedAt: number
}
export type Tables = Record<string, Rec[]>

export interface MergeResult {
  merged: Tables
  /** Что записать на это устройство (пришло с Диска новее или новое) */
  toWrite: Tables
  pulled: number // сколько записей пришло
  pushed: number // сколько записей на Диске устарело или отсутствует
}

export function mergeTables(local: Tables, remote: Tables | null): MergeResult {
  const merged: Tables = {}
  const toWrite: Tables = {}
  let pulled = 0
  let pushed = 0
  const names = new Set([...Object.keys(local), ...Object.keys(remote ?? {})])
  for (const name of names) {
    const map = new Map<string, Rec>()
    const remoteById = new Map((remote?.[name] ?? []).map((r) => [r.id, r]))
    for (const r of local[name] ?? []) map.set(r.id, r)
    for (const r of remote?.[name] ?? []) {
      const cur = map.get(r.id)
      if (!cur || r.updatedAt > cur.updatedAt) {
        map.set(r.id, r)
        ;(toWrite[name] ??= []).push(r)
        pulled++
      }
    }
    for (const r of local[name] ?? []) {
      const rr = remoteById.get(r.id)
      if (!rr || r.updatedAt > rr.updatedAt) pushed++
    }
    merged[name] = [...map.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  return { merged, toWrite, pulled, pushed }
}

/** JSON с ключами по алфавиту — чтобы одинаковые данные давали одинаковую строку. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}

/** Отпечаток данных: если совпадает с файлом на Диске — загружать заново не нужно. */
export function tablesHash(t: Tables | null): string {
  if (!t) return 'none'
  const sorted: Tables = {}
  for (const name of Object.keys(t).sort()) {
    if (!t[name]?.length) continue
    sorted[name] = [...t[name]].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  const s = stable(sorted)
  let h1 = 0x811c9dc5
  let h2 = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = (Math.imul(h2, 31) + c) >>> 0
  }
  return `${h1.toString(16)}-${h2.toString(16)}-${s.length}`
}
