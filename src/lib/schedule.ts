// Расписание из РУЗ: загрузка data/schedule.json, хранение копии, поиск изменений,
// правила «моя группа» / «скрыть пару».
import { useLiveQuery } from 'dexie-react-hooks'
import { GROUP_NUMBER } from '../config'
import { db, kvGet, kvSet, type ManualLesson, type ScheduleRule } from './db'

export interface RuzLesson {
  date: string // YYYY-MM-DD
  num: number
  start: string // HH:MM
  end: string
  kind: string
  subject: string
  teacher: string
  room: string
  address: string
  group: string // поток/подгруппа, как в РУЗ; '' — вся группа
  manualId?: string // пара добавлена вручную / из .ics (id в таблице manualLessons)
}

export interface ScheduleFile {
  version: number
  group: string
  oid: number
  source: string
  fetchedAt: string
  hash: string
  range: { from: string; to: string }
  lessons: RuzLesson[]
}

export type ChangeKind = 'new' | 'changed'

export interface ShownLesson {
  lesson: RuzLesson
  id: string
  change?: ChangeKind
  /** для «изменено» — как было раньше */
  before?: RuzLesson
}

/** Элемент дня: обычная пара, выбор из параллельных групп или убранная пара. */
export type DayItem =
  | { type: 'lesson'; start: string; end: string; item: ShownLesson }
  | { type: 'choice'; start: string; end: string; options: ShownLesson[] }
  | { type: 'removed'; start: string; end: string; lesson: RuzLesson }

// ---------- ключи ----------

export const lessonId = (l: RuzLesson) => `${l.date}|${l.start}|${l.subject}|${l.group}`
/** «Серия» — предмет + тип занятия: у неё одна «моя группа». */
export const seriesKey = (l: RuzLesson) => `${l.subject}|${l.kind}`
const slotKey = (l: RuzLesson) => `${l.date}|${l.num}|${l.group}`

/** Пара для всей группы (или общего потока с нашей группой) — её никогда не прячем правилом «моя группа». */
export function isWholeGroup(l: RuzLesson): boolean {
  if (!l.group) return true
  return new RegExp(`${GROUP_NUMBER}(?!_)`).test(l.group)
}

/** «Поток "ВШЭУиП_№1(э)"» → «ВШЭУиП_№1(э)» */
export function groupLabel(g: string): string {
  return g.replace(/^(Поток|Подгруппа)\s*/, '').replace(/^"|"$/g, '').trim() || 'вся группа'
}

// ---------- загрузка ----------

const K_CURRENT = 'schedule.current'
const K_PREVIOUS = 'schedule.previous'
const K_CHECKED = 'schedule.checkedAt'

export type SyncResult = 'updated' | 'same' | 'offline' | 'missing'

let syncing: Promise<SyncResult> | null = null

/** Скачать data/schedule.json со своего сайта и, если он новый, сохранить. */
export function syncSchedule(): Promise<SyncResult> {
  syncing ??= (async (): Promise<SyncResult> => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/schedule.json`, { cache: 'no-cache' })
      if (res.status === 404) return 'missing'
      if (!res.ok) return 'offline'
      const file = (await res.json()) as ScheduleFile
      if (!file?.hash || !Array.isArray(file.lessons)) return 'offline'
      await kvSet(K_CHECKED, new Date().toISOString())
      const current = await kvGet<ScheduleFile>(K_CURRENT)
      if (current?.hash === file.hash) return 'same'
      await db.transaction('rw', db.kv, async () => {
        if (current) await kvSet(K_PREVIOUS, current)
        await kvSet(K_CURRENT, file)
      })
      return 'updated'
    } catch {
      return 'offline'
    }
  })().finally(() => {
    syncing = null
  })
  return syncing
}

let lastAuto = 0
/** Автообновление: при запуске и когда приложение снова на экране (не чаще раза в 10 минут). */
export function startAutoSync() {
  const run = () => {
    if (Date.now() - lastAuto < 10 * 60_000) return
    lastAuto = Date.now()
    void syncSchedule()
  }
  run()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && run())
}

// ---------- изменения ----------

const FIELDS: (keyof RuzLesson)[] = ['subject', 'kind', 'teacher', 'room', 'address', 'start', 'end']

interface Changes {
  byId: Map<string, { change: ChangeKind; before?: RuzLesson }>
  removed: RuzLesson[]
}

/** Сравнить прошлую и текущую версии. Сравниваем только даты, которые есть в обеих. */
export function diffSchedules(prev: ScheduleFile | undefined, cur: ScheduleFile | undefined): Changes {
  const byId: Changes['byId'] = new Map()
  const removed: RuzLesson[] = []
  if (!prev || !cur) return { byId, removed }

  const inPrev = (d: string) => d >= prev.range.from && d <= prev.range.to
  const inCur = (d: string) => d >= cur.range.from && d <= cur.range.to

  const group = (ls: RuzLesson[]) => {
    const m = new Map<string, RuzLesson[]>()
    for (const l of ls) m.set(slotKey(l), [...(m.get(slotKey(l)) ?? []), l])
    return m
  }
  const prevSlots = group(prev.lessons.filter((l) => inCur(l.date)))
  const curSlots = group(cur.lessons.filter((l) => inPrev(l.date)))
  const same = (a: RuzLesson, b: RuzLesson) => FIELDS.every((f) => a[f] === b[f])

  for (const [key, now] of curSlots) {
    const was = prevSlots.get(key) ?? []
    if (now.length === 1 && was.length === 1) {
      if (!same(now[0], was[0])) byId.set(lessonId(now[0]), { change: 'changed', before: was[0] })
      continue
    }
    // Несколько пар в одной ячейке — сравниваем «целиком»: чего не было — новое, что пропало — убрано.
    for (const l of now) if (!was.some((w) => same(w, l))) byId.set(lessonId(l), { change: 'new' })
    for (const w of was) if (!now.some((l) => same(w, l))) removed.push(w)
  }
  for (const [key, was] of prevSlots) if (!curSlots.has(key)) removed.push(...was)
  return { byId, removed }
}

// ---------- правила ----------

function applyRules(lessons: RuzLesson[], rules: ScheduleRule[]): RuzLesson[] {
  const hidden = new Set(rules.filter((r) => r.kind === 'hide').map((r) => r.target))
  const mine = new Map(rules.filter((r) => r.kind === 'mine').map((r) => [r.target, r.group]))
  return lessons.filter((l) => {
    if (hidden.has(lessonId(l))) return false
    const my = mine.get(seriesKey(l))
    if (my !== undefined && !isWholeGroup(l) && l.group !== my) return false
    return true
  })
}

export async function hideLesson(l: RuzLesson) {
  await db.scheduleRules.put({
    id: `hide:${lessonId(l)}`,
    kind: 'hide',
    target: lessonId(l),
    label: `${l.subject}, ${l.date.split('-').reverse().join('.')} в ${l.start}`,
    updatedAt: Date.now(),
    deleted: false,
  })
}

export async function chooseMyGroup(l: RuzLesson) {
  await db.scheduleRules.put({
    id: `mine:${seriesKey(l)}`,
    kind: 'mine',
    target: seriesKey(l),
    group: l.group,
    label: `${l.subject} (${l.kind.toLowerCase()}): ${groupLabel(l.group)}`,
    updatedAt: Date.now(),
    deleted: false,
  })
}

/** Мягкое удаление правила (для будущей синхронизации). */
export async function removeRule(id: string) {
  await db.scheduleRules.update(id, { deleted: true, updatedAt: Date.now() })
}

// ---------- сборка дня ----------

function buildDay(date: string, lessons: RuzLesson[], changes: Changes): DayItem[] {
  const shown = (l: RuzLesson): ShownLesson => ({ lesson: l, id: lessonId(l), ...changes.byId.get(lessonId(l)) })
  const items: DayItem[] = []

  // Параллельные группы одного предмета в одно время → одна карточка «выбери свою».
  const clusters = new Map<string, RuzLesson[]>()
  for (const l of lessons) {
    const k = isWholeGroup(l) ? `one|${lessonId(l)}` : `alt|${l.start}|${seriesKey(l)}`
    clusters.set(k, [...(clusters.get(k) ?? []), l])
  }
  for (const group of clusters.values()) {
    const { start, end } = group[0]
    if (group.length === 1) items.push({ type: 'lesson', start, end, item: shown(group[0]) })
    else {
      const options = group
        .map(shown)
        .sort((a, b) => a.lesson.group.localeCompare(b.lesson.group, 'ru', { numeric: true }))
      items.push({ type: 'choice', start, end, options })
    }
  }
  for (const r of changes.removed) {
    if (r.date === date) items.push({ type: 'removed', start: r.start, end: r.end, lesson: r })
  }
  return items.sort((a, b) => a.start.localeCompare(b.start))
}

export interface ScheduleView {
  ready: boolean
  file?: ScheduleFile
  checkedAt?: string
  rules: ScheduleRule[]
  /** Есть ли дата в опубликованном диапазоне РУЗ */
  covers: (date: string) => boolean
  day: (date: string) => DayItem[]
  /** Даты с изменениями (для точек в ленте дат) */
  changedDates: Set<string>
  /** Все пары с учётом «моей группы» и скрытых (для «к следующей паре») */
  lessons: RuzLesson[]
}

export function useSchedule(): ScheduleView {
  const data = useLiveQuery(async () => {
    const [file, prev, checkedAt, rules, manual] = await Promise.all([
      kvGet<ScheduleFile>(K_CURRENT),
      kvGet<ScheduleFile>(K_PREVIOUS),
      kvGet<string>(K_CHECKED),
      db.scheduleRules.filter((r) => !r.deleted).toArray(),
      db.manualLessons.filter((m) => !m.deleted).toArray(),
    ])
    return { file, prev, checkedAt, rules, manual }
  }, [])

  const file = data?.file
  const rules = data?.rules ?? []
  const changes = diffSchedules(data?.prev, file)
  const manual = (data?.manual ?? []).map(manualToLesson)
  const visible = [...applyRules(file?.lessons ?? [], rules), ...manual]
  const byDate = new Map<string, RuzLesson[]>()
  for (const l of visible) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l])
  const visibleChanges: Changes = { byId: changes.byId, removed: applyRules(changes.removed, rules) }

  const changedDates = new Set<string>()
  for (const l of visible) if (changes.byId.has(lessonId(l))) changedDates.add(l.date)
  for (const r of visibleChanges.removed) changedDates.add(r.date)

  return {
    ready: data !== undefined,
    file,
    checkedAt: data?.checkedAt,
    rules,
    covers: (d) => (!!file && d >= file.range.from && d <= file.range.to) || manual.some((m) => m.date === d),
    day: (d) => buildDay(d, byDate.get(d) ?? [], visibleChanges),
    changedDates,
    lessons: visible,
  }
}

/** Пара вручную → в общий вид пары. */
export const manualToLesson = (m: ManualLesson): RuzLesson => ({
  date: m.date,
  num: 0,
  start: m.start,
  end: m.end,
  kind: m.kind,
  subject: m.subject,
  teacher: m.teacher,
  room: m.room,
  address: '',
  group: '',
  manualId: m.id,
})

// ---------- время ----------

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Дата в формате YYYY-MM-DD по местному времени. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function itemTitle(it: DayItem): string {
  if (it.type === 'lesson') return it.item.lesson.subject
  if (it.type === 'choice') return it.options[0].lesson.subject
  return it.lesson.subject
}

/** Пары с учётом выбора групп и скрытых — без React (для напоминаний). */
export async function loadVisibleLessons(): Promise<RuzLesson[]> {
  const [file, rules, manual] = await Promise.all([
    kvGet<ScheduleFile>(K_CURRENT),
    db.scheduleRules.filter((r) => !r.deleted).toArray(),
    db.manualLessons.filter((m) => !m.deleted).toArray(),
  ])
  return [...applyRules(file?.lessons ?? [], rules), ...manual.map(manualToLesson)]
}
