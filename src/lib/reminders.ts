// Что напомнить прямо сейчас. Чистые функции (тесты — reminders.test.ts).
// Работает, пока приложение открыто или недавно было открыто: у веб-приложения без
// своего сервера нет надёжного «будильника». Надёжные напоминания о парах — через
// Google Календарь (подписка на calendar/171606.ics с VALARM), о дедлайнах — кнопка
// «Напомнить в Google Календаре» у задания.

export interface RLesson {
  date: string
  start: string
  end: string
  subject: string
  kind: string
  room: string
}
export interface REvent {
  id: string
  date: string
  start: string
  title: string
  place: string
}
export interface RTask {
  id: string
  title: string
  subject: string
  dueDate?: string
  dueTime?: string
  status: 'todo' | 'doing' | 'done'
}

export interface NotifySettings {
  enabled: boolean
  pairs: boolean // за 10 минут до пары
  events: boolean // за 15 минут до события
  deadlines: boolean // за час до срока со временем; утром «сегодня срок»; вечером «завтра срок, не начато»
  digest: boolean // утренняя сводка (фоновое обновление Chrome)
}

export const DEFAULT_NOTIFY: NotifySettings = { enabled: false, pairs: true, events: true, deadlines: true, digest: true }

export interface Reminder {
  id: string // по нему не повторяем одно и то же
  title: string
  body: string
  url: string // куда открыть приложение по нажатию
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const shortKind = (k: string) => (/лекц/i.test(k) ? 'лекция' : /лаб/i.test(k) ? 'лаба' : /практ/i.test(k) ? 'практика' : k.toLowerCase())
const plural = (n: number, f: [string, string, string]) =>
  n % 10 === 1 && n % 100 !== 11 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2]

export function dueReminders(now: Date, s: NotifySettings, lessons: RLesson[], events: REvent[], tasks: RTask[]): Reminder[] {
  if (!s.enabled) return []
  const out: Reminder[] = []
  const today = iso(now)
  const tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const nowMin = now.getHours() * 60 + now.getMinutes()

  if (s.pairs) {
    for (const l of lessons) {
      if (l.date !== today) continue
      const left = toMin(l.start) - nowMin
      if (left > 0 && left <= 10) {
        out.push({
          id: `pair:${l.date}:${l.start}:${l.subject}`,
          title: `Через ${left} мин: ${l.subject}`,
          body: [`${shortKind(l.kind)}, ${l.start}–${l.end}`, l.room].filter(Boolean).join(' · '),
          url: '#/schedule',
        })
      }
    }
  }

  if (s.events) {
    for (const e of events) {
      if (e.date !== today) continue
      const left = toMin(e.start) - nowMin
      if (left > 0 && left <= 15) {
        out.push({ id: `event:${e.id}:${e.date}`, title: `Через ${left} мин: ${e.title}`, body: [e.start, e.place].filter(Boolean).join(' · '), url: '#/activities' })
      }
    }
  }

  if (s.deadlines) {
    const open = tasks.filter((t) => t.status !== 'done' && t.dueDate)
    for (const t of open) {
      if (t.dueDate === today && t.dueTime) {
        const left = toMin(t.dueTime) - nowMin
        if (left > 0 && left <= 60) {
          out.push({ id: `due1h:${t.id}:${t.dueDate}${t.dueTime}`, title: `Через ${left} мин срок: ${t.title}`, body: t.subject || 'Задание', url: '#/tasks' })
        }
      }
    }
    // утром (8:00–12:00) — одно уведомление про все сегодняшние сроки
    const todayDue = open.filter((t) => t.dueDate === today)
    if (todayDue.length && nowMin >= 8 * 60 && nowMin < 12 * 60) {
      out.push({
        id: `today:${today}`,
        title: `Сегодня ${todayDue.length} ${plural(todayDue.length, ['срок', 'срока', 'сроков'])} сдачи`,
        body: todayDue.map((t) => `«${t.title}»${t.dueTime ? ` до ${t.dueTime}` : ''}`).join(', '),
        url: '#/tasks',
      })
    }
    // вечером (19:00–22:00) — завтрашние, которые ещё не начаты
    const notStarted = open.filter((t) => t.dueDate === tomorrow && t.status === 'todo')
    if (notStarted.length && nowMin >= 19 * 60 && nowMin < 22 * 60) {
      out.push({
        id: `tomorrow:${tomorrow}`,
        title: `Завтра срок, а ещё не начато: ${notStarted.length}`,
        body: notStarted.map((t) => `«${t.title}»`).join(', '),
        url: '#/tasks',
      })
    }
  }
  return out
}

/** Утренняя сводка на день (сегодня до 15:00, иначе — на завтра). null — сказать нечего. */
export function digest(now: Date, lessons: RLesson[], events: REvent[], tasks: RTask[]): Reminder | null {
  const target = now.getHours() < 15 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const day = iso(target)
  const word = target === now ? 'Сегодня' : 'Завтра'
  const ls = lessons.filter((l) => l.date === day).sort((a, b) => a.start.localeCompare(b.start))
  const starts = [...new Set(ls.map((l) => l.start))]
  const evs = events.filter((e) => e.date === day)
  const due = tasks.filter((t) => t.status !== 'done' && t.dueDate === day)
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < iso(now)).length
  if (!starts.length && !evs.length && !due.length && !overdue) return null
  const parts = [
    starts.length ? `${starts.length} ${plural(starts.length, ['пара', 'пары', 'пар'])} с ${starts[0]}` : 'пар нет',
    evs.length ? `${evs.length} ${plural(evs.length, ['событие', 'события', 'событий'])}` : '',
    due.length ? `${due.length} ${plural(due.length, ['срок', 'срока', 'сроков'])} сдачи` : '',
  ].filter(Boolean)
  const body = [
    ls.length ? `Первая: ${ls[0].subject}${ls[0].room ? `, ${ls[0].room}` : ''}` : '',
    due.length ? `Сдать: ${due.map((t) => `«${t.title}»`).join(', ')}` : '',
    overdue ? `Просрочено: ${overdue}` : '',
  ]
    .filter(Boolean)
    .join('. ')
  return { id: `digest:${day}`, title: `${word}: ${parts.join(', ')}`, body: body || 'Хорошего дня!', url: '#/' }
}
