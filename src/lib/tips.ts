// Подсказки по тайм-менеджменту: простые правила по расписанию, событиям и заданиям.
// Без ИИ и интернета. Только типы, без базы — чтобы проверять тестами.
import { dayLoad, formatHours, toMin, type Busy } from './load.ts'

export interface TipLesson extends Busy {
  subject: string
  kind: string
}
export interface TipEvent extends Busy {
  title: string
}
export interface TipTask {
  id: string
  title: string
  subject: string
  dueDate?: string
  status: 'todo' | 'doing' | 'done'
  createdAt: number
  updatedAt: number
}

export interface Tip {
  id: string // по нему подсказку можно скрыть
  tone: 'danger' | 'warn' | 'info' | 'ok'
  title: string
  text: string
  priority: number
  to?: string // куда ведёт кнопка
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const plural = (n: number, f: [string, string, string]) =>
  n % 10 === 1 && n % 100 !== 11 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2]

function dayName(date: string, today: string, tomorrow: string): string {
  if (date === today) return 'сегодня'
  if (date === tomorrow) return 'завтра'
  const d = new Date(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10))
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`
}

const shortKind = (k: string) => (/лекц/i.test(k) ? 'лекция' : /лаб/i.test(k) ? 'лаба' : /практ/i.test(k) ? 'практика' : k.toLowerCase())
const q = (s: string) => `«${s}»`

export function buildTips(now: Date, lessons: TipLesson[], events: TipEvent[], tasks: TipTask[]): Tip[] {
  const tips: Tip[] = []
  const today = iso(now)
  const tomorrow = iso(plus(now, 1))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const open = tasks.filter((t) => t.status !== 'done').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const day = (n: number) => iso(plus(now, n))
  const name = (d: string) => dayName(d, today, tomorrow)

  // 1. Накладки: две пары (или пара и событие) в одно время — на 14 дней вперёд.
  const horizon = day(14)
  const busy = [
    ...lessons.map((l) => ({ ...l, label: `${q(l.subject)} (${shortKind(l.kind)})` })),
    ...events.map((e) => ({ ...e, label: q(e.title) })),
  ].filter((x) => x.date >= today && x.date <= horizon)
  busy.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
  const seen = new Set<string>()
  for (let i = 0; i < busy.length; i++) {
    for (let j = i + 1; j < busy.length && busy[j].date === busy[i].date; j++) {
      const a = busy[i]
      const b = busy[j]
      if (toMin(b.start) >= toMin(a.end) || a.label === b.label) continue
      const id = `conflict:${a.date}|${a.start}|${a.label}|${b.label}`
      if (seen.has(id)) continue
      seen.add(id)
      tips.push({
        id,
        tone: 'warn',
        title: `Накладка: ${name(a.date)} в ${b.start}`,
        text: `Одновременно ${a.label} и ${b.label}. Уточни у старосты или преподавателя, куда идти.`,
        priority: 100 - Math.min(14, Math.round((Date.parse(a.date) - Date.parse(today)) / 864e5)),
        to: '/schedule',
      })
    }
  }

  // 2. Просрочено.
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today)
  if (overdue.length) {
    tips.push({
      id: `overdue:${overdue.map((t) => t.id).join(',')}`,
      tone: 'danger',
      title: `Просрочено: ${overdue.length} ${plural(overdue.length, ['задание', 'задания', 'заданий'])}`,
      text: `${q(overdue[0].title)}${overdue.length > 1 ? ' и другие' : ''}. Сдай или договорись о переносе — и поставь новый срок, чтобы не висело.`,
      priority: 95,
      to: '/tasks?filter=overdue',
    })
  }

  // 3. Срок сегодня/завтра, а задание не начато.
  for (const t of open.filter((x) => x.status === 'todo' && (x.dueDate === today || x.dueDate === tomorrow)).slice(0, 2)) {
    tips.push({
      id: `soon:${t.id}:${t.dueDate}`,
      tone: 'warn',
      title: `${t.dueDate === today ? 'Сегодня' : 'Завтра'} срок, а ещё не начато`,
      text: `${q(t.title)}${t.subject ? ` (${t.subject})` : ''}. Начни хотя бы на 25 минут — дальше пойдёт легче.`,
      priority: t.dueDate === today ? 90 : 85,
      to: '/tasks',
    })
  }

  // 4. Тяжёлый день впереди (2–6 дней) с дедлайнами — сделать заранее.
  for (let n = 1; n <= 6; n++) {
    const d = day(n)
    const load = dayLoad(d, lessons, events, open)
    if (load.level !== 'heavy') continue
    const due = open.filter((t) => t.dueDate === d || t.dueDate === day(n + 1))
    const what = due[0] ?? open.find((t) => t.dueDate && t.dueDate > d)
    tips.push({
      id: `heavy:${d}`,
      tone: 'warn',
      title: `${name(d).replace(/^./, (c) => c.toUpperCase())} — тяжёлый день`,
      text:
        `${load.pairs} ${plural(load.pairs, ['пара', 'пары', 'пар'])}` +
        (load.eventMin ? ' и события' : '') +
        `, занято ${formatHours(load.busyMin)}` +
        (load.deadlines ? `, ${load.deadlines} ${plural(load.deadlines, ['дедлайн', 'дедлайна', 'дедлайнов'])}` : '') +
        '. ' +
        (what ? `Сделай ${q(what.title)} заранее, пока есть время.` : 'Подготовь всё с вечера накануне.'),
      priority: 75 - n,
      to: '/schedule',
    })
    break // хватит одной такой подсказки
  }

  // 5. Окно между парами сегодня (ещё впереди) или завтра.
  for (const d of [today, tomorrow]) {
    const items = [...lessons, ...events].filter((x) => x.date === d).sort((a, b) => toMin(a.start) - toMin(b.start))
    let found = false
    for (let i = 0; i + 1 < items.length; i++) {
      const endPrev = Math.max(...items.slice(0, i + 1).map((x) => toMin(x.end)))
      const gap = toMin(items[i + 1].start) - endPrev
      if (gap < 40 || gap > 240) continue
      if (d === today && endPrev < nowMin) continue
      const from = `${pad(Math.floor(endPrev / 60))}:${pad(endPrev % 60)}`
      const task = open.find((t) => t.status !== 'done' && t.dueDate) ?? open[0]
      tips.push({
        id: `window:${d}:${from}`,
        tone: 'info',
        title: `${d === today ? 'Сегодня' : 'Завтра'} окно ${formatHours(gap)} (${from}–${items[i + 1].start})`,
        text: task ? `Хватит, чтобы продвинуться в ${q(task.title)}. Мелкие дела в окнах — меньше работы вечером.` : 'Можно спокойно пообедать или пролистать конспект к следующей паре.',
        priority: 60,
      })
      found = true
      break
    }
    if (found) break
  }

  // 6. Поздний вечер перед ранней первой парой.
  for (const d of [today, tomorrow]) {
    const late = events.filter((e) => e.date === d && toMin(e.end) >= 21 * 60).sort((a, b) => toMin(b.end) - toMin(a.end))[0]
    if (!late) continue
    const next = iso(plus(new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)), 1))
    const first = lessons.filter((l) => l.date === next).sort((a, b) => toMin(a.start) - toMin(b.start))[0]
    if (first && toMin(first.start) <= 9 * 60) {
      tips.push({
        id: `late:${d}`,
        tone: 'info',
        title: `${d === today ? 'Сегодня' : 'Завтра'} поздний вечер`,
        text: `${q(late.title)} до ${late.end}, а ${next === tomorrow ? 'завтра' : 'на следующий день'} первая пара в ${first.start}. Собери рюкзак заранее и не засиживайся.`,
        priority: 55,
      })
      break
    }
  }

  // 7. Слишком долго «в работе».
  const stale = open.filter((t) => t.status === 'doing' && now.getTime() - t.updatedAt > 5 * 864e5)
  if (stale.length) {
    const days = Math.floor((now.getTime() - stale[0].updatedAt) / 864e5)
    tips.push({
      id: `stale:${stale[0].id}`,
      tone: 'info',
      title: `${q(stale[0].title)} в работе уже ${days} ${plural(days, ['день', 'дня', 'дней'])}`,
      text: 'Большое задание проще сделать по шагам: запиши в заметку 2–3 маленьких шага и сделай первый сегодня.',
      priority: 50,
      to: '/tasks',
    })
  }

  // 8. Задания без срока.
  const noDue = open.filter((t) => !t.dueDate)
  if (noDue.length >= 2) {
    tips.push({
      id: `nodue:${noDue.length}`,
      tone: 'info',
      title: `У ${noDue.length} ${plural(noDue.length, ['задания', 'заданий', 'заданий'])} нет срока`,
      text: 'Без срока задания откладываются бесконечно. Поставь хотя бы примерный — например, «к следующей паре».',
      priority: 40,
      to: '/tasks',
    })
  }

  // 9. Свободный день впереди — время для большого задания.
  for (let n = 1; n <= 3; n++) {
    const d = day(n)
    if (new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)).getDay() === 0) continue // воскресенье — отдых
    if (dayLoad(d, lessons, events, open).level !== 'free') continue
    const big = open.find((t) => t.dueDate && t.dueDate > d)
    if (!big) break
    tips.push({
      id: `free:${d}`,
      tone: 'ok',
      title: `${name(d).replace(/^./, (c) => c.toUpperCase())} свободный день`,
      text: `Ни пар, ни событий — хорошее время для ${q(big.title)}.`,
      priority: 30,
    })
    break
  }

  return tips.sort((a, b) => b.priority - a.priority)
}
