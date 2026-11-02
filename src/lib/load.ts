// Нагрузка дня: сколько часов занято парами и событиями + сколько дедлайнов.
// Только типы, без базы — чтобы считать и в тестах.

export interface Busy {
  date: string
  start: string
  end: string
}

export interface DueTask {
  dueDate?: string
  status: string
}

export type LoadLevel = 'free' | 'light' | 'normal' | 'heavy'

export interface DayLoad {
  pairs: number
  pairMin: number
  eventMin: number
  busyMin: number
  deadlines: number
  level: LoadLevel
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Пересекающиеся промежутки считаем один раз (две пары в одно время ≠ 3 часа). */
function unionMinutes(spans: [number, number][]): number {
  const s = [...spans].sort((a, b) => a[0] - b[0])
  let total = 0
  let curS = -1
  let curE = -1
  for (const [a, b] of s) {
    if (a > curE) {
      if (curE > curS) total += curE - curS
      curS = a
      curE = b
    } else curE = Math.max(curE, b)
  }
  if (curE > curS) total += curE - curS
  return total
}

/**
 * Уровень: тяжёлый — от 6 ч занятости, или 4+ ч и 2+ дедлайна;
 * обычный — от 3 ч или есть дедлайн; лёгкий — что-то есть; свободный — ничего.
 */
export function dayLoad(date: string, lessons: Busy[], events: Busy[], tasks: DueTask[]): DayLoad {
  const ls = lessons.filter((l) => l.date === date)
  const es = events.filter((e) => e.date === date)
  const span = (x: Busy): [number, number] => [toMin(x.start), toMin(x.end)]
  const pairMin = unionMinutes(ls.map(span))
  const eventMin = unionMinutes(es.map(span))
  const busyMin = unionMinutes([...ls, ...es].map(span))
  const deadlines = tasks.filter((t) => t.dueDate === date && t.status !== 'done').length
  const h = busyMin / 60
  const level: LoadLevel =
    h >= 6 || (h >= 4 && deadlines >= 2) ? 'heavy' : h >= 3 || deadlines > 0 ? 'normal' : busyMin > 0 ? 'light' : 'free'
  return { pairs: new Set(ls.map((l) => l.start)).size, pairMin, eventMin, busyMin, deadlines, level }
}

export const LEVEL_LABEL: Record<LoadLevel, string> = {
  free: 'свободно',
  light: 'лёгкий день',
  normal: 'обычный день',
  heavy: 'тяжёлый день',
}

export function formatHours(min: number): string {
  if (min === 0) return '0 ч'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? (h ? `${h} ч ${m} мин` : `${m} мин`) : `${h} ч`
}
