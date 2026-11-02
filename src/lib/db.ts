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

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface TaskLink {
  url: string
  title?: string
}

/**
 * Задание. Предмет пока хранится названием (как в РУЗ);
 * на этапе 2 появится таблица предметов — тогда миграцией добавим subjectId.
 */
export interface Task {
  id: string
  title: string
  subject: string // '' — без предмета
  projectId?: string // этап 3 (внеучебка)
  dueDate?: string // YYYY-MM-DD
  dueTime?: string // HH:MM
  status: TaskStatus
  notes: string
  links: TaskLink[]
  doneAt?: number // когда отмечено «сдано»
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/**
 * Предмет — то, что Максим дописал сам (контакты, требования, ссылки, цвет).
 * Преподаватели, аудитории и пары берутся из расписания на лету.
 * id = name: один и тот же предмет на телефоне и компьютере — одна запись
 * (без дублей при синхронизации). Задания ссылаются на предмет по названию (Task.subject).
 */
export interface Subject {
  id: string // = name
  name: string
  color?: string // ключ цвета из SUBJECT_COLORS
  contacts: string
  requirements: string
  notes: string
  links: TaskLink[]
  custom?: boolean // добавлен вручную, а не из расписания
  updatedAt: number
  deleted: boolean
}

/** Конспект / заметка в Markdown. subject = название предмета ('' — без предмета). */
export interface Note {
  id: string
  subject: string
  projectId?: string // этап 3
  title: string
  body: string
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Файл или фото. Лежит прямо в IndexedDB (работает без интернета). */
export interface StoredFile {
  id: string
  ownerType: 'task' | 'subject' | 'note'
  ownerId: string
  name: string
  type: string
  size: number
  blob: Blob
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Ссылка быстрого доступа (библиотеки и сайты). Стандартные имеют постоянный id. */
export interface QuickLink {
  id: string
  title: string
  url: string
  hint?: string
  order: number
  updatedAt: number
  deleted: boolean
}

class ZachetkaDB extends Dexie {
  kv!: Table<KV, string>
  scheduleRules!: Table<ScheduleRule, string>
  tasks!: Table<Task, string>
  subjects!: Table<Subject, string>
  notes!: Table<Note, string>
  files!: Table<StoredFile, string>
  quickLinks!: Table<QuickLink, string>

  constructor() {
    super('zachetka')
    this.version(1).stores({
      kv: 'key',
      scheduleRules: 'id, kind',
    })
    // v2 (этап 1.5): задания. Старые таблицы не меняются — миграция не нужна.
    this.version(2).stores({
      tasks: 'id, status, dueDate, subject, updatedAt',
    })
    // v3 (этап 2): предметы, конспекты, файлы, ссылки. Новые таблицы — старые данные не трогаем.
    this.version(3).stores({
      subjects: 'id',
      notes: 'id, subject, updatedAt',
      files: 'id, [ownerType+ownerId]',
      quickLinks: 'id, order',
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
