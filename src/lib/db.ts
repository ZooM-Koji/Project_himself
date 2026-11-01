// Хранилище на устройстве (IndexedDB через Dexie). Всё работает без интернета.
// Если когда-нибудь меняем схему — добавляем this.version(N+1) с миграцией, старое не трогаем.
import Dexie, { type Table } from 'dexie'

/** Простое хранилище «ключ → значение» (копии расписания, служебные отметки). */
export interface KV {
  key: string
  value: unknown
  updatedAt: number
}

/**
 * Правило показа пар из РУЗ:
 * - hide — скрыть одну конкретную пару;
 * - mine — «моя группа» для предмета+типа: пары других потоков/подгрупп скрываются.
 */
export interface ScheduleRule {
  id: string
  kind: 'hide' | 'mine'
  /** для hide — id пары, для mine — ключ серии (предмет|тип) */
  target: string
  /** для mine — название моего потока/подгруппы, как в РУЗ */
  group?: string
  /** человекочитаемое описание для экрана настроек */
  label: string
  updatedAt: number
  deleted: boolean
}

class ZachetkaDB extends Dexie {
  kv!: Table<KV, string>
  scheduleRules!: Table<ScheduleRule, string>

  constructor() {
    super('zachetka')
    this.version(1).stores({
      kv: 'key',
      scheduleRules: 'id, kind',
    })
  }
}

export const db = new ZachetkaDB()

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}

export async function kvSet(key: string, value: unknown) {
  await db.kv.put({ key, value, updatedAt: Date.now() })
}
