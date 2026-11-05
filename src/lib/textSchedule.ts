// Расписание из сообщения: «10.11 (пн) 18:00–20:00, актовый зал» → события.
// Понимает: 10.11 / 10.11.2026 / 10 ноября / «10, 12 и 15 ноября»; пн, вторник, по средам;
// сегодня/завтра/послезавтра; 18:00, 18.00, 18:00–20:00, «с 18 до 20», «в 19»; место — что осталось.
// Строка без даты, но со временем, относится к предыдущей дате без времени («Понедельник:» ↵ «18:00»).
// Время, указанное отдельной строкой без даты («Все репетиции 18:00–20:00»), подставляется туда, где времени нет.
// Чистые функции — тесты в textSchedule.test.ts.

export interface ParsedSlot {
  date: string // YYYY-MM-DD
  start: string // HH:MM ('' — время не нашлось)
  end: string // '' — не указано
  place: string
  line: string // исходная строка (для показа)
  warn?: string // например: в сообщении «пн», а эта дата — вторник
}

export interface ParsedSchedule {
  title: string // заголовок сообщения (первая строка без дат), можно поменять
  slots: ParsedSlot[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const MONTHS: [RegExp, number][] = [
  [/^янв/, 1], [/^фев/, 2], [/^мар/, 3], [/^апр/, 4], [/^ма[яй]/, 5], [/^июн/, 6],
  [/^июл/, 7], [/^авг/, 8], [/^сен/, 9], [/^окт/, 10], [/^ноя/, 11], [/^дек/, 12],
]
const WEEKDAYS: [RegExp, number][] = [
  [/^(пн|пон|понедельник[а-я]*)$/, 1],
  [/^(вт|вторник[а-я]*)$/, 2],
  [/^(ср|сред[аеуы]|средам)$/, 3],
  [/^(чт|четверг[а-я]*)$/, 4],
  [/^(пт|пятниц[а-я]*)$/, 5],
  [/^(сб|суббот[а-я]*)$/, 6],
  [/^(вс|воскресень[а-я]*)$/, 0],
]
const MONTH_WORD = /(янв|фев|мар|апр|ма[яй]|июн|июл|авг|сен|окт|ноя|дек)[а-я]*\.?/

function makeDate(d: number, m: number, y: number | undefined, today: Date): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  let year = y ?? today.getFullYear()
  let date = new Date(year, m - 1, d)
  if (date.getMonth() !== m - 1) return null
  if (y === undefined && (today.getTime() - date.getTime()) / 864e5 > 60) {
    year += 1
    date = new Date(year, m - 1, d)
  }
  return date
}

// Граница слова, которая понимает русские буквы (обычный \b в JS — только для латиницы)
const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'
const re = (src: string, flags = '') => new RegExp(src.replace(/\\b</g, B).replace(/\\b>/g, E), `${flags}u`)

const hm = (h: number, m: number) => (h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${pad(h)}:${pad(m)}` : '')

interface LineInfo {
  dates: Date[]
  start: string
  end: string
  rest: string
  wd?: number // день недели, указанный в строке рядом с датой
}

function parseLine(raw: string, today: Date): LineInfo {
  let s = ` ${raw.replace(/[–—−]/g, '-').replace(/ /g, ' ')} `
  const lower = () => s.toLowerCase()
  const dates: Date[] = []
  let start = ''
  let end = ''
  const cut = (m: RegExpExecArray | RegExpMatchArray) => {
    s = s.slice(0, m.index!) + ' ' + s.slice(m.index! + m[0].length)
  }

  // 1) Время с двоеточием и диапазоны «с 18 до 20»
  let m: RegExpExecArray | RegExpMatchArray | null
  const range = re('(?:\\b<с\\s*)?(\\d{1,2})[:.](\\d{2})\\s*(?:-|до|по)\\s*(\\d{1,2})[:.](\\d{2})', 'i')
  const rangeWords = re('\\b<с\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:ч\\.?\\s*)?до\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\b>', 'i')
  // «10.11 18.00-20.00»: диапазон с точками — только если «месяц» не похож на месяц или в строке уже есть дата
  if ((m = lower().match(range)) && (m[0].includes(':') || +m[2] > 12 || +m[2] === 0 || /\d{1,2}\.\d{1,2}/.test(s.slice(0, m.index)))) {
    start = hm(+m[1], +m[2])
    end = hm(+m[3], +m[4])
    cut(m)
  } else if ((m = lower().match(rangeWords))) {
    start = hm(+m[1], +(m[2] ?? 0))
    end = hm(+m[3], +(m[4] ?? 0))
    cut(m)
  }

  // 2) Даты «10, 12 и 15 ноября» / «15 ноября»
  const dayList = new RegExp(`((?:\\d{1,2}\\s*(?:,|и)\\s*)*\\d{1,2})\\s+${MONTH_WORD.source}(?:\\s+(\\d{4}))?`, 'i')
  while ((m = lower().match(dayList))) {
    const mon = MONTHS.find(([re]) => re.test(m![2]))![1]
    for (const d of m[1].split(/\s*(?:,|и)\s*/)) {
      const dt = makeDate(+d, mon, m[3] ? +m[3] : undefined, today)
      if (dt) dates.push(dt)
    }
    cut(m)
  }
  // 3) Даты 10.11 / 10.11.2026 / 10/11 (не время: «месяц» 1–12)
  const dotDate = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?\b/
  while ((m = s.match(dotDate)) && +m[2] >= 1 && +m[2] <= 12) {
    // «19.00», «18.30» и т. п. после уже найденной даты — это время, не дата
    if (dates.length && !m[3]) break
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : undefined
    const dt = makeDate(+m[1], +m[2], y, today)
    if (!dt) break
    dates.push(dt)
    cut(m)
  }
  // 4) Сегодня / завтра / послезавтра
  for (const [w, n] of [['послезавтра', 2], ['завтра', 1], ['сегодня', 0]] as const) {
    const re = new RegExp(`(^|[^а-яё])${w}([^а-яё]|$)`, 'i')
    if ((m = lower().match(re))) {
      dates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n))
      cut(m)
    }
  }
  // 5) Дни недели — ближайший такой день (сегодняшний тоже считается), если даты ещё нет
  const words = lower().split(/[^а-яё]+/).filter(Boolean)
  const wdFound = words.map((w) => WEEKDAYS.find(([re]) => re.test(w))?.[1]).filter((x): x is number => x !== undefined)
  const explicitDate = dates.length > 0
  if (!dates.length) {
    for (const wd of [...new Set(wdFound)]) {
      dates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((wd - today.getDay() + 7) % 7)))
    }
  }
  // убрать слова дней недели из остатка («10.11 (пн)», «по средам»)
  s = s.replace(re('\\(?\\b<(по\\s+)?(пн|вт|ср|чт|пт|сб|вс|пон|понедельник[а-я]*|вторник[а-я]*|сред[аеуы]|средам|четверг[а-я]*|пятниц[а-я]*|суббот[а-я]*|воскресень[а-я]*)\\b>\\.?\\)?', 'gi'), ' ')

  // 6) Одиночное время: 18:00 / 18.00 / «в 19» / «19 ч»
  if (!start) {
    if ((m = s.match(/(\d{1,2}):(\d{2})/))) {
      start = hm(+m[1], +m[2])
      cut(m)
    } else if ((m = s.match(/\b(\d{1,2})\.(\d{2})\b/)) && (dates.length || +m[2] > 12 || +m[2] === 0)) {
      start = hm(+m[1], +m[2])
      cut(m)
    } else if ((m = lower().match(re('\\b<(?:в|к)\\s*(\\d{1,2})\\s*(?:ч\\b>|час[а-я]*|\\b>)')))) {
      start = hm(+m[1], 0)
      cut(m)
    }
  }
  // второе время в строке «18:00 и до 20:00», «до 20:00»
  if (start && !end && (m = lower().match(re('(?:-|\\b<до)\\s*(\\d{1,2})[:.](\\d{2})')))) {
    end = hm(+m[1], +m[2])
    cut(m)
  }

  const rest = s
    .replace(re('\\b<(в|во|с|по|до|на|и|к)\\b>', 'gi'), ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.:;!\-—•*]+|[\s,.:;!\-—•*]+$/g, '')
    .trim()
  return { dates, start, end, rest, wd: explicitDate && new Set(wdFound).size === 1 ? wdFound[0] : undefined }
}

const WD_NAME = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function parseScheduleText(text: string, now: Date): ParsedSchedule {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lines = text
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
  let title = ''
  let defaultTime = null as { start: string; end: string } | null
  const slots: ParsedSlot[] = []
  let waiting: ParsedSlot[] = [] // даты без времени — ждут строку со временем

  lines.forEach((line, i) => {
    const info = parseLine(line, today)
    if (!info.dates.length) {
      if (info.start) {
        if (waiting.length) {
          waiting.forEach((w) => ((w.start = info.start), (w.end = info.end), info.rest && !w.place && (w.place = info.rest)))
          waiting = []
        } else defaultTime ??= { start: info.start, end: info.end }
        if (i === 0 && info.rest) title = info.rest
      } else if (i === 0 || (!slots.length && !title)) {
        title = info.rest || title
      }
      return
    }
    const made: ParsedSlot[] = info.dates.map((d) => ({
      date: iso(d),
      start: info.start,
      end: info.end,
      place: info.rest,
      line,
      // организаторы ошибаются: «10.11 (пн)», а 10.11 — вторник
      ...(info.wd !== undefined && info.wd !== d.getDay() ? { warn: `В сообщении «${WD_SHORT[info.wd]}», а ${iso(d).slice(8)}.${iso(d).slice(5, 7)} — ${WD_NAME[d.getDay()]}. Проверь дату.` } : {}),
    }))
    slots.push(...made)
    waiting = info.start ? [] : made
  })
  if (defaultTime) for (const s of slots) if (!s.start) ((s.start = defaultTime.start), (s.end = s.end || defaultTime.end))
  slots.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
  return { title: title.replace(/[:.!]+$/, '').trim(), slots }
}
