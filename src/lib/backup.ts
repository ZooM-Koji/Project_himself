// Резервная копия: все данные в один JSON-файл и обратно.
// При импорте записи сливаются по updatedAt: остаётся более свежая версия
// (так же будет работать синхронизация через Яндекс Диск на этапе 5).
// Файлы и фото — только в «копии с файлами» (внутри JSON в base64), обычная копия лёгкая.
import { db, kvGet, kvSet, type CalEvent, type Reference, type Note, type Project, type QuickLink, type ScheduleRule, type StoredFile, type Subject, type Task } from './db'
import { isoDate } from './schedule'

export const BACKUP_APP = 'zachetka'
export const BACKUP_FORMAT = 1

type FileRecord = Omit<StoredFile, 'blob'> & { data: string } // data — base64

export interface Backup {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  tables: {
    tasks: Task[]
    scheduleRules: ScheduleRule[]
    subjects?: Subject[] // с этапа 2
    notes?: Note[]
    quickLinks?: QuickLink[]
    projects?: Project[] // с этапа 3
    events?: CalEvent[]
    refs?: Reference[] // с этапа 4
    files?: FileRecord[] // только в копии с файлами
  }
}

async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type })
}

/** Все записи, включая мягко удалённые (чтобы удаление тоже переносилось). */
export async function makeBackup(withFiles = false): Promise<Backup> {
  const tables: Backup['tables'] = {
    tasks: await db.tasks.toArray(),
    scheduleRules: await db.scheduleRules.toArray(),
    subjects: await db.subjects.toArray(),
    notes: await db.notes.toArray(),
    quickLinks: await db.quickLinks.toArray(),
    projects: await db.projects.toArray(),
    events: await db.events.toArray(),
    refs: await db.refs.toArray(),
  }
  if (withFiles) {
    tables.files = []
    for (const f of await db.files.toArray()) {
      const { blob, ...meta } = f
      tables.files.push({ ...meta, data: await blobToBase64(blob) })
    }
  }
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), tables }
}

export async function downloadBackup(withFiles = false) {
  const data = await makeBackup(withFiles)
  const blob = new Blob([JSON.stringify(data, null, withFiles ? 0 : 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zachetka-${isoDate(new Date())}${withFiles ? '-s-faylami' : ''}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await kvSet('backup.lastExport', data.exportedAt)
  return { data, size: blob.size }
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
  const t = data.tables ?? ({} as Backup['tables'])
  // В старых копиях (до этапа 2) новых таблиц нет — это нормально.
  const parts = [
    [db.tasks, t.tasks],
    [db.scheduleRules, t.scheduleRules],
    [db.subjects, t.subjects ?? []],
    [db.notes, t.notes ?? []],
    [db.quickLinks, t.quickLinks ?? []],
    [db.projects, t.projects ?? []],
    [db.events, t.events ?? []],
    [db.refs, t.refs ?? []],
  ] as const
  for (const [, rows] of parts) if (!isRecArray(rows)) throw new Error('Файл повреждён: нет списка записей.')
  const files = t.files ?? []
  if (!isRecArray(files)) throw new Error('Файл повреждён: нет списка файлов.')

  const res: ImportResult = { added: 0, updated: 0, skipped: 0 }
  const merge = async (table: (typeof parts)[number][0] | typeof db.files, row: Rec) => {
    const cur = (await table.get(row.id)) as Rec | undefined
    if (!cur) {
      await table.put(row as never)
      res.added++
    } else if (row.updatedAt > cur.updatedAt) {
      await table.put(row as never)
      res.updated++
    } else res.skipped++
  }
  await db.transaction('rw', [db.tasks, db.scheduleRules, db.subjects, db.notes, db.quickLinks, db.projects, db.events, db.refs, db.files], async () => {
    for (const [table, rows] of parts) for (const row of rows as Rec[]) await merge(table, row)
    for (const f of files as unknown as FileRecord[]) {
      const { data: b64, ...meta } = f
      await merge(db.files, { ...meta, blob: base64ToBlob(b64, meta.type) } as unknown as Rec)
    }
  })
  return res
}
