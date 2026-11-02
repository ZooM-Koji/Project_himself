// Импорт расписания из .ics-файла — запасной вариант, если РУЗ недоступен
// (например, файл «Скачать» со страницы группы в РУЗ или экспорт из другого календаря).
// Чистые функции — тесты в icsImport.test.ts.

export interface IcsLesson {
  date: string // YYYY-MM-DD (местное время устройства)
  start: string // HH:MM
  end: string
  subject: string
  kind: string
  room: string
  teacher: string
}

export interface IcsResult {
  lessons: IcsLesson[]
  skipped: number // целодневные, отменённые, без времени
}

interface Prop {
  params: Record<string, string>
  value: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const unescapeText = (s: string) => s.replace(/\\([\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))

function parseLine(line: string): [string, Prop] | null {
  // ИМЯ;ПАРАМ=знач;ПАРАМ="зн:ач":ЗНАЧЕНИЕ — двоеточие внутри кавычек не считается
  let inQ = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQ = !inQ
    else if (line[i] === ':' && !inQ) {
      colon = i
      break
    }
  }
  if (colon < 0) return null
  const [name, ...paramParts] = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const p of paramParts) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return [name.toUpperCase(), { params, value: line.slice(colon + 1) }]
}

/** «20261105T082000» (местное), «20261105T052000Z» (UTC) → Date; «20261105» — целый день → null */
function parseDateTime(p: Prop | undefined): Date | null {
  if (!p) return null
  const m = p.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s = '0', z] = m
  return z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s)
}

/** PT1H35M → минуты */
function durationMin(v: string | undefined): number | null {
  const m = v?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m || (!m[1] && !m[2] && !m[3])) return null
  return (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0)
}

function detectKind(text: string): string {
  if (/лекц/i.test(text)) return 'Лекция'
  if (/лаб/i.test(text)) return 'Лабораторная работа'
  if (/практ|семинар/i.test(text)) return 'Практическое занятие'
  if (/консульт/i.test(text)) return 'Консультация'
  if (/экзамен/i.test(text)) return 'Экзамен'
  if (/зач[её]т/i.test(text)) return 'Зачёт'
  return 'Занятие'
}

/** Повторы RRULE (дни/недели) — до 200 раз и не дальше года от первого занятия. */
function expand(start: Date, rrule: string | undefined, exdates: Set<number>): Date[] {
  if (!rrule) return [start]
  const r = Object.fromEntries(rrule.split(';').map((kv) => kv.split('=') as [string, string]))
  const step = r.FREQ === 'DAILY' ? 1 : r.FREQ === 'WEEKLY' ? 7 : 0
  if (!step) return [start]
  const interval = Math.max(1, +(r.INTERVAL ?? 1)) * step
  const count = r.COUNT ? +r.COUNT : 200
  const until = r.UNTIL ? parseDateTime({ params: {}, value: r.UNTIL.length === 8 ? `${r.UNTIL}T235959` : r.UNTIL }) : null
  const limit = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
  const out: Date[] = []
  for (let i = 0; i < Math.min(count, 200); i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * interval, start.getHours(), start.getMinutes())
    if ((until && d > until) || d > limit) break
    if (!exdates.has(d.getTime())) out.push(d)
  }
  return out
}

export function parseIcs(text: string): IcsResult {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const lessons: IcsLesson[] = []
  let skipped = 0
  let ev: Map<string, Prop[]> | null = null
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === 'BEGIN:VEVENT') ev = new Map()
    else if (line === 'END:VEVENT' && ev) {
      const get = (k: string) => ev!.get(k)?.[0]
      const start = parseDateTime(get('DTSTART'))
      if (!start || /CANCELLED/i.test(get('STATUS')?.value ?? '')) {
        skipped++
        ev = null
        continue
      }
      const endProp = parseDateTime(get('DTEND'))
      const len = endProp ? (endProp.getTime() - start.getTime()) / 60000 : (durationMin(get('DURATION')?.value) ?? 95)
      const summary = unescapeText(get('SUMMARY')?.value ?? '').trim()
      const desc = unescapeText(get('DESCRIPTION')?.value ?? '')
      const kind = detectKind(`${summary}\n${desc}`)
      // «Высшая математика (практика)» / «Высшая математика (Лекция)» → без скобок с типом
      const subject = summary.replace(/\s*\((лекц|практ|лаб|семинар|консульт|экзамен|зач)[^)]*\)\s*$/i, '').trim() || 'Без названия'
      const teacher = desc.match(/[А-ЯЁ][а-яё-]+ [А-ЯЁ]\.\s?[А-ЯЁ]\./)?.[0] ?? ''
      const room = unescapeText(get('LOCATION')?.value ?? '').trim()
      const ex = new Set<number>()
      for (const p of ev.get('EXDATE') ?? []) for (const v of p.value.split(',')) {
        const d = parseDateTime({ params: p.params, value: v })
        if (d) ex.add(d.getTime())
      }
      for (const d of expand(start, get('RRULE')?.value, ex)) {
        const e = new Date(d.getTime() + len * 60000)
        lessons.push({ date: isoDate(d), start: hhmm(d), end: hhmm(e), subject, kind, room, teacher })
      }
      ev = null
    } else if (ev) {
      const p = parseLine(line)
      if (p) ev.set(p[0], [...(ev.get(p[0]) ?? []), p[1]])
    }
  }
  lessons.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
  return { lessons, skipped }
}
