// Мелкие помощники для дат и русских окончаний.

/** Правильное окончание: plural(3, ['задание', 'задания', 'заданий']) → «задания» */
export function plural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1]
  return forms[2]
}

/** Первая буква заглавная, остальное как есть. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «Воскресенье, 1 ноября» */
export function formatLongDate(d: Date): string {
  return capitalize(d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }))
}

/** «Ноябрь 2026» */
export function formatMonth(d: Date): string {
  return capitalize(d.toLocaleDateString('ru-RU', { month: 'long' })) + ' ' + d.getFullYear()
}

/** Понедельник той недели, в которую попадает дата (00:00). */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const shift = (r.getDay() + 6) % 7 // пн = 0 … вс = 6
  r.setDate(r.getDate() - shift)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

export function greeting(d: Date): string {
  const h = d.getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Привет'
  return 'Добрый вечер'
}

/** «2026-11-02» → Date (местная полночь) */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** «Понедельник, 2 ноября» */
export function formatIsoLong(iso: string): string {
  return formatLongDate(fromIso(iso))
}

/** 85 → «1 ч 25 мин» */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}
