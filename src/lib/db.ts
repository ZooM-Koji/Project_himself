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
  stoChecks?: string[] // отмеченные пункты чек-листа СТО (этап 4)
  area?: 'life' // личное дело (не учёба): показывается в «Жизнь → Мои дела», а не в «Заданиях»
  list?: string // список личных дел: «Дом», «Покупки»…
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

export type ProjectKind = 'council' | 'school' | 'event' | 'rehearsal' | 'other'

/** Проект внеучебки: студсовет, «Школа актива», мероприятие, репетиции… */
export interface Project {
  id: string
  title: string
  kind: ProjectKind
  color?: string // ключ из SUBJECT_COLORS
  notes: string // Markdown
  archived?: boolean
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Событие: репетиция, выступление, мастер-класс, собрание… Может быть без проекта. */
export interface CalEvent {
  id: string
  projectId?: string
  title: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end?: string // HH:MM; нет — считаем 1 час
  place: string
  notes: string
  seriesId?: string // для повторов «каждую неделю»: все события серии
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Запись списка литературы (ГОСТ Р 7.0.100–2018). taskId — для какой работы ('' — общий список). */
export interface Reference {
  id: string
  taskId: string
  text: string // готовая запись
  data: Record<string, unknown> // поля формы — чтобы можно было поправить
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Пара, добавленная вручную (консультация, отработка) или из .ics-файла (запасной вариант). */
export interface ManualLesson {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string
  subject: string
  kind: string
  room: string
  teacher: string
  notes: string
  source: 'manual' | 'ics'
  createdAt: number
  updatedAt: number
  deleted: boolean
}

/** Своё упражнение (или изменённое стандартное — тот же id). Стандартные — в src/lib/gym.ts. */
export interface GymExerciseRec {
  id: string
  name: string
  group: string
  kind: 'weight' | 'bodyweight' | 'time'
  reps: [number, number]
  step: number
  custom?: boolean
  updatedAt: number
  deleted: boolean
}

/** Тренировка: упражнения с подходами — одной записью (так проще синхронизировать). */
export interface Workout {
  id: string
  date: string // YYYY-MM-DD
  title: string
  items: { exerciseId: string; sets: { w: number; r: number; done: boolean }[]; note?: string }[]
  note: string
  createdAt: number
  updatedAt: number
  deleted: boolean
}

export interface BodyEntry {
  id: string
  date: string
  weight: number // кг
  updatedAt: number
  deleted: boolean
}

export interface GymGoal {
  id: string
  exerciseId: string
  target: number // кг (лучший подход по расчётному максимуму) или повторы для своего веса
  createdAt: number
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
  projects!: Table<Project, string>
  events!: Table<CalEvent, string>
  refs!: Table<Reference, string>
  manualLessons!: Table<ManualLesson, string>
  gymExercises!: Table<GymExerciseRec, string>
  workouts!: Table<Workout, string>
  bodyLog!: Table<BodyEntry, string>
  gymGoals!: Table<GymGoal, string>

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
    // v4 (этап 3): внеучебка — проекты и события. Только новые таблицы.
    this.version(4).stores({
      projects: 'id',
      events: 'id, date, projectId, seriesId',
    })
    // v5 (этап 4): список литературы. Новое поле Task.stoChecks индекса не требует.
    this.version(5).stores({
      refs: 'id, taskId',
    })
    // v6 (доделка этапа 1): пары вручную и из .ics.
    this.version(6).stores({
      manualLessons: 'id, date, source',
    })
    // v7: «Жизнь → Зал». Только новые таблицы.
    this.version(7).stores({
      gymExercises: 'id',
      workouts: 'id, date',
      bodyLog: 'id, date',
      gymGoals: 'id',
    })
  }
}

export const db = new ZachetkaDB()

// Правка всегда «новее» той версии, которую правят — даже если часы на устройстве отстают
// (иначе при синхронизации запись с «будущим» временем перебила бы свежую правку).
for (const t of [db.tasks, db.scheduleRules, db.subjects, db.notes, db.quickLinks, db.projects, db.events, db.refs, db.manualLessons, db.gymExercises, db.workouts, db.bodyLog, db.gymGoals] as Table<{ updatedAt: number }, string>[]) {
  t.hook('updating', (mods, _key, obj) => {
    const next = (mods as { updatedAt?: unknown }).updatedAt
    if (typeof next === 'number' && typeof obj.updatedAt === 'number' && next <= obj.updatedAt) return { updatedAt: obj.updatedAt + 1 }
  })
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}

export async function kvSet(key: string, value: unknown) {
  await db.kv.put({ key, value, updatedAt: Date.now() })
}
