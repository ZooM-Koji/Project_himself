// Файл календаря (.ics) из расписания — для подписки в Google Календаре и виджета на телефоне.
//
// Какие пары попадают:
// - пары всей группы (или общего потока с группой) — всегда;
// - пары параллельных потоков/подгрупп (английский, физкультура, ЦК…) — только «мои»,
//   заданные в src/group.json → calendar.myGroups { "Предмет|Тип занятия": "поток как в РУЗ" };
// - если поток ещё не выбран — одно событие «поток не выбран» вместо 7 одинаковых.
// Логика та же, что в приложении (src/lib/schedule.ts: isWholeGroup, seriesKey).

const pad = (n) => String(n).padStart(2, '0')
const plural = (n, f) => (n % 10 === 1 && n % 100 !== 11 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2])

export const seriesKey = (l) => `${l.subject}|${l.kind}`
export const isWholeGroup = (l, groupNumber) => !l.group || new RegExp(`${groupNumber}(?!_)`).test(l.group)
const groupLabel = (g) => g.replace(/^(Поток|Подгруппа)\s*/, '').replace(/^"|"$/g, '').trim()

function shortKind(kind) {
  const k = kind.toLowerCase()
  if (k.includes('лекц')) return 'лекция'
  if (k.includes('лаб')) return 'лаба'
  if (k.includes('практ')) return 'практика'
  return k
}

/** Экранирование текста по RFC 5545. */
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Перенос длинных строк: не длиннее 75 байт, продолжение начинается с пробела. */
function fold(line) {
  const out = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch)
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

const dt = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`

function utcStamp(iso) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/** Короткий стабильный id события (чтобы календарь обновлял, а не дублировал события). */
function uid(s) {
  let h1 = 0x811c9dc5
  let h2 = 0
  for (const ch of s) {
    const c = ch.codePointAt(0)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = (Math.imul(h2, 31) + c) >>> 0
  }
  return `${h1.toString(16)}${h2.toString(16)}@zachetka`
}

/** Какие пары показать в календаре. Возвращает события (в т. ч. «поток не выбран»). */
export function calendarEvents(schedule, groupNumber, myGroups = {}) {
  const events = []
  const alts = new Map() // невыбранные параллельные пары: date|start|series → [пары]
  for (const l of schedule.lessons) {
    if (isWholeGroup(l, groupNumber)) {
      events.push({ ...l, alternatives: 0 })
      continue
    }
    const mine = myGroups[seriesKey(l)]
    if (mine !== undefined) {
      if (l.group === mine) events.push({ ...l, alternatives: 0 })
      continue
    }
    const k = `${l.date}|${l.start}|${seriesKey(l)}`
    alts.set(k, [...(alts.get(k) ?? []), l])
  }
  for (const group of alts.values()) {
    if (group.length === 1) events.push({ ...group[0], alternatives: 0 })
    else events.push({ ...group[0], room: '', address: '', teacher: '', group: '', alternatives: group.length, options: group })
  }
  return events.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
}

export function buildIcs(schedule, { groupNumber, myGroups = {} }) {
  const stamp = utcStamp(schedule.fetchedAt)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zachetka//Schedule//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`Пары ${groupNumber}`)}`,
    'X-WR-TIMEZONE:Europe/Moscow',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    // Москва: UTC+3 круглый год (без перехода на летнее время с 2014 года)
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Moscow',
    'BEGIN:STANDARD',
    'DTSTART:20141026T020000',
    'TZOFFSETFROM:+0400',
    'TZOFFSETTO:+0300',
    'TZNAME:MSK',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
  for (const e of calendarEvents(schedule, groupNumber, myGroups)) {
    const summary = `${e.subject} (${shortKind(e.kind)})`
    const desc = e.alternatives
      ? `Поток не выбран — ${e.alternatives} ${plural(e.alternatives, ['вариант', 'варианта', 'вариантов'])}:\n` +
        e.options.map((o) => `${groupLabel(o.group)}: ${[o.room, o.teacher].filter(Boolean).join(', ')}`).join('\n')
      : [e.kind, e.teacher, e.group ? groupLabel(e.group) : '', e.num ? `${e.num} пара` : ''].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid(`${e.date}|${e.start}|${e.subject}|${e.group}|${e.alternatives}`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Moscow:${dt(e.date, e.start)}`,
      `DTEND;TZID=Europe/Moscow:${dt(e.date, e.end)}`,
      `SUMMARY:${esc(e.alternatives ? `${summary} — поток не выбран` : summary)}`,
      ...(e.room || e.address ? [`LOCATION:${esc([e.room, e.address].filter(Boolean).join(', '))}`] : []),
      `DESCRIPTION:${esc(desc)}`,
      'TRANSP:OPAQUE',
      // Напоминание за 15 минут (ICSx⁵ и большинство календарей его покажут;
      // Google для подписок использует свои «уведомления по умолчанию» календаря)
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(summary)}`,
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
