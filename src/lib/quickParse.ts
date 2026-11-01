// Быстрый ввод задания одной строкой:
//   «конспект по страхованию до пт» → { title: 'Конспект по страхованию', dueDate: пятница }
// Понимает: сегодня / завтра / послезавтра, дни недели (пн, в пятницу, к понедельнику),
// 15.11, 15.11.2026, 15 ноября, через 3 дня / через неделю, время «в 18:00».
// Предмет угадывается по похожему слову из списка предметов (не угадали — пусто).
// «к следующей паре / практике / лекции / лабе» — срок = начало ближайшей такой пары
// по предмету из расписания (нужен список пар, см. lessons).

export interface QuickResult {
  title: string
  dueDate?: string // YYYY-MM-DD
  dueTime?: string // HH:MM
  subject?: string
  /** Было «к следующей паре»: что нашли в расписании. */
  pair?: {
    kind?: string // какой тип искали: «лекция», «практика»…
    found?: { date: string; start: string; kind: string }
    problem?: 'no-subject' | 'not-found'
  }
}

/** Пара из расписания — ровно то, что нужно для поиска «следующей». */
export interface PairRef {
  date: string
  start: string
  subject: string
  kind: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// Индекс дня недели JS (вс = 0) по началу слова.
const WEEKDAYS: [RegExp, number][] = [
  [/^(пн|пон|понедельник[а-я]*)$/, 1],
  [/^(вт|вторник[а-я]*)$/, 2],
  [/^(ср|сред[аеуы]?)$/, 3],
  [/^(чт|чет|четверг[а-я]*)$/, 4],
  [/^(пт|пят|пятниц[а-я]*)$/, 5],
  [/^(сб|суб|суббот[а-я]*)$/, 6],
  [/^(вс|воскр|воскресень[а-я]*)$/, 0],
]

const MONTHS: [RegExp, number][] = [
  [/^янв/, 1], [/^фев/, 2], [/^мар/, 3], [/^апр/, 4], [/^ма[яй]/, 5], [/^июн/, 6],
  [/^июл/, 7], [/^авг/, 8], [/^сен/, 9], [/^окт/, 10], [/^ноя/, 11], [/^дек/, 12],
]

// Короткие народные названия → слово из официального названия предмета.
const ALIASES: [RegExp, string][] = [
  [/^(англ|инглиш|ин\.?яз|иняз)/, 'иностранный'],
  [/^(физр|физкульт)/, 'физическая'],
  [/^(матан|вышмат|матем)/, 'математика'],
  [/^(стат)/, 'статистика'],
  [/^(экон)/, 'экономическая'],
]

// Предлоги, которые стоят перед датой: «до пт», «к 15.11», «на завтра», «в пятницу».
const PREP = /^(до|к|ко|на|в|во)$/

// «к следующей паре»: прилагательное (необязательно) + слово-пара.
const NEXT_ADJ = /^(след\.?|следующ[а-я]*|ближайш[а-я]*|очередн[а-я]*)$/
const PAIR_WORDS: [RegExp, string | undefined, RegExp | undefined][] = [
  [/^(пар[аеуы]|заняти[еяю])$/, undefined, undefined],
  [/^(лекци[июя])$/, 'лекция', /лекц/i],
  [/^(практик[еиау]|практическ[а-я]*|семинар[уа]?)$/, 'практика', /практ|семинар/i],
  [/^(лаб[еуы]?|лабораторн[а-я]*|лабе)$/, 'лабораторная', /лаб/i],
]

/**
 * Ближайшая пара по предмету позже «сейчас» (и, если задано, нужного типа / на нужную дату).
 * lessons — пары с учётом выбора групп.
 */
export function findNextPair(
  lessons: PairRef[],
  now: Date,
  subject: string,
  kind?: RegExp,
  onDate?: string,
): PairRef | undefined {
  const nowKey = `${iso(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  return lessons
    .filter((l) => l.subject === subject && (!kind || kind.test(l.kind)))
    .filter((l) => (onDate ? l.date === onDate : `${l.date}T${l.start}` > nowKey))
    .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`))[0]
}

/**
 * Разбор строки. now — «сейчас» (для тестов), subjects — названия предметов,
 * lessons — пары из расписания (для «к следующей паре»).
 */
export function parseQuick(input: string, now: Date, subjects: string[] = [], lessons: PairRef[] = []): QuickResult {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const words = input.trim().split(/\s+/).filter(Boolean)
  const used = new Set<number>() // индексы слов, ушедших в дату/время
  let due: Date | undefined
  let dueTime: string | undefined
  let pairKind: { label?: string; re?: RegExp } | undefined
  const pairIdx = new Set<number>() // слова фразы «следующей паре»

  const take = (...idx: number[]) => {
    idx.forEach((i) => used.add(i))
    // предлог перед датой тоже убираем из названия
    const first = Math.min(...idx)
    if (first > 0 && PREP.test(words[first - 1].toLowerCase())) used.add(first - 1)
  }

  for (let i = 0; i < words.length; i++) {
    if (used.has(i)) continue
    const w = words[i].toLowerCase().replace(/[.,!?;]+$/, '')
    const next = words[i + 1]?.toLowerCase().replace(/[.,!?;]+$/, '')

    // время: 18:00, 9.30 после «в»
    // «к (следующей) паре / лекции / практике / лабе»
    if (!pairKind) {
      const adj = NEXT_ADJ.test(w)
      const noun = (adj ? next : w) ?? ''
      const pw = PAIR_WORDS.find(([re]) => re.test(noun))
      const prev = words[i - 1]?.toLowerCase()
      if (pw && (adj || (prev && /^(к|ко|до)$/.test(prev)))) {
        pairKind = { label: pw[1], re: pw[2] }
        const idx = adj ? [i, i + 1] : [i]
        idx.forEach((k) => pairIdx.add(k))
        take(...idx)
        continue
      }
    }

    const tm = w.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
    if (tm) {
      dueTime = `${pad(+tm[1])}:${tm[2]}`
      take(i)
      continue
    }
    if (due) continue

    if (w === 'сегодня') (due = today), take(i)
    else if (w === 'завтра') (due = addDays(today, 1)), take(i)
    else if (w === 'послезавтра') (due = addDays(today, 2)), take(i)
    else if (w === 'через' && next) {
      const n = words[i + 2]?.toLowerCase() ?? ''
      const num = Number(next)
      if (/^недел/.test(next)) (due = addDays(today, 7)), take(i, i + 1)
      else if (/^месяц/.test(next)) (due = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())), take(i, i + 1)
      else if (Number.isInteger(num) && num > 0 && /^д(ень|ня|ней)/.test(n)) (due = addDays(today, num)), take(i, i + 1, i + 2)
      else if (Number.isInteger(num) && num > 0 && /^недел/.test(n)) (due = addDays(today, num * 7)), take(i, i + 1, i + 2)
    } else {
      // день недели — ближайший будущий (если сегодня пятница, «до пт» — следующая пятница)
      const wd = WEEKDAYS.find(([re]) => re.test(w))
      if (wd) {
        const diff = (wd[1] - today.getDay() + 7) % 7 || 7
        due = addDays(today, diff)
        take(i)
        continue
      }
      // 15.11 / 15.11.2026 / 15/11
      const dm = w.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/)
      if (dm) {
        due = makeDate(+dm[1], +dm[2], dm[3], today)
        if (due) take(i)
        continue
      }
      // 15 ноября
      const mon = next ? MONTHS.find(([re]) => re.test(next)) : undefined
      if (/^\d{1,2}$/.test(w) && mon) {
        due = makeDate(+w, mon[1], undefined, today)
        if (due) take(i, i + 1)
      }
    }
  }

  // «в» перед временем
  const title = words
    .filter((_, i) => !used.has(i))
    .join(' ')
    .replace(/\s+(в|во|к|до)$/i, '')
    .replace(/[\s,.;—-]+$/, '')
    .trim()

  // Предмет угадываем без слов «следующей паре/практике» (иначе «практике» ≈ «Практическая риторика»).
  const subject = guessSubject(words.filter((_, i) => !pairIdx.has(i)).join(' '), subjects)

  let pair: QuickResult['pair']
  if (pairKind) {
    pair = { kind: pairKind.label }
    if (!subject) pair.problem = 'no-subject'
    else {
      const found = findNextPair(lessons, now, subject, pairKind.re, due ? iso(due) : undefined)
      if (!found) pair.problem = 'not-found'
      else {
        pair.found = { date: found.date, start: found.start, kind: found.kind }
        due = new Date(+found.date.slice(0, 4), +found.date.slice(5, 7) - 1, +found.date.slice(8, 10))
        dueTime ??= found.start
      }
    }
  }

  return {
    title: title ? title.charAt(0).toUpperCase() + title.slice(1) : '',
    dueDate: due ? iso(due) : undefined,
    dueTime,
    subject,
    ...(pair ? { pair } : {}),
  }
}

function makeDate(d: number, m: number, y: string | undefined, today: Date): Date | undefined {
  let year = y ? (y.length === 2 ? 2000 + +y : +y) : today.getFullYear()
  let date = new Date(year, m - 1, d)
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return undefined // 31.02 и т. п.
  // без года и дата давно прошла — значит, следующий год
  if (!y && (today.getTime() - date.getTime()) / 86_400_000 > 60) {
    year += 1
    date = new Date(year, m - 1, d)
  }
  return date
}

const stem = (w: string) => w.toLowerCase().replace(/ё/g, 'е').slice(0, 5)

/**
 * Предмет, у которого больше всего слов совпадает по началу (5 букв) со словами ввода.
 * При равенстве выигрывает тот, у кого совпало первое (главное) слово:
 * «по экономике» → «Экономическая теория», а не «Социально-экономическая статистика».
 */
export function guessSubject(input: string, subjects: string[]): string | undefined {
  const inWords = input
    .toLowerCase()
    .split(/[^а-яёa-z.]+/)
    .filter((w) => w.length >= 4 || ALIASES.some(([re]) => re.test(w)))
    .map((w) => ALIASES.find(([re]) => re.test(w))?.[1] ?? w)
  const inStems = new Set(inWords.map(stem))
  let best: string | undefined
  let bestScore = 0
  for (const s of subjects) {
    const sw = s.split(/[^А-Яа-яЁёA-Za-z]+/).filter((w) => w.length >= 4)
    const matches = sw.filter((w) => inStems.has(stem(w))).length
    const score = matches ? matches * 10 + (inStems.has(stem(sw[0])) ? 1 : 0) : 0
    if (score > bestScore) (best = s), (bestScore = score)
  }
  return best
}
