// Резервная копия: все данные в один JSON-файл и обратно.
// При импорте записи сливаются по updatedAt: остаётся более свежая версия
// (так же будет работать синхронизация через Яндекс Диск на этапе 5).
import { db, kvGet, kvSet, type ScheduleRule, type Task } from './db'
import { isoDate } from './schedule'

export const BACKUP_APP = 'zachetka'
export const BACKUP_FORMAT = 1

export interface Backup {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  tables: {
    tasks: Task[]
    scheduleRules: ScheduleRule[]
  }
}

/** Все записи, включая мягко удалённые (чтобы удаление тоже переносилось). */
export async function makeBackup(): Promise<Backup> {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    tables: {
      tasks: await db.tasks.toArray(),
      scheduleRules: await db.scheduleRules.toArray(),
    },
  }
}

export async function downloadBackup() {
  const data = await makeBackup()
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zachetka-${isoDate(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await kvSet('backup.lastExport', data.exportedAt)
  return data
}

export const lastExport = () => kvGet<string>('backup.lastExport')

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

type Rec = { id: string; updatedAt: number }

function isRecArray(x: unknown): x is Rec[] {
  return Array.isArray(x) && x.every((r) => r && typeof r.id === 'string' && typeof r.updatedAt === 'number')
}

/** Проверить файл и слить с текущими данными. Бросает Error с понятным текстом. */
export async function importBackup(text: string): Promise<ImportResult> {
  let data: Backup
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Это не JSON-файл.')
  }
  if (data?.app !== BACKUP_APP) throw new Error('Это не резервная копия «Зачётки».')
  if (data.format > BACKUP_FORMAT) throw new Error('Копия из более новой версии приложения — сначала обновите его.')
  const { tasks, scheduleRules } = data.tables ?? {}
  if (!isRecArray(tasks) || !isRecArray(scheduleRules)) throw new Error('Файл повреждён: нет списка записей.')

  const res: ImportResult = { added: 0, updated: 0, skipped: 0 }
  await db.transaction('rw', db.tasks, db.scheduleRules, async () => {
    for (const [table, rows] of [
      [db.tasks, tasks],
      [db.scheduleRules, scheduleRules],
    ] as const) {
      for (const row of rows) {
        const cur = (await table.get(row.id)) as Rec | undefined
        if (!cur) {
          await table.put(row as never)
          res.added++
        } else if (row.updatedAt > cur.updatedAt) {
          await table.put(row as never)
          res.updated++
        } else res.skipped++
      }
    }
  })
  return res
}
