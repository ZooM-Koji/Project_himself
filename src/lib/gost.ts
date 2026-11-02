// Библиографическая запись по ГОСТ Р 7.0.100–2018 (для списка литературы).
// Без зависимостей — проверяется тестами (gost.test.ts).
//
// Схема (книга 1–3 автора):
//   Иванов, И. И. Заглавие : сведения к заглавию / И. И. Иванов, П. П. Петров ; под редакцией … .
//   – 2-е изд. – Москва : Юрайт, 2023. – 450 с. – (Серия). – ISBN … – Текст : непосредственный.
// 4 и более автора — без «заголовка», в сведениях об ответственности первые три + [и др.].

export type RefKind = 'book' | 'article' | 'web' | 'ebs'

export interface RefData {
  kind: RefKind
  authors: string // по одному в строке (или через «;»)
  title: string
  subtitle?: string // «учебник для вузов», «монография»…
  extra?: string // «под редакцией И. И. Иванова», «перевод с английского …»
  edition?: string // «3-е изд., перераб. и доп.»
  city?: string
  publisher?: string
  year?: string
  pages?: string // книга: «450»; статья: «10-25»
  series?: string
  isbn?: string
  // статья
  journal?: string
  volume?: string
  issue?: string
  electronic?: boolean // статья найдена онлайн
  // электронные
  url?: string
  accessed?: string // ДД.ММ.ГГГГ
  site?: string // для статьи на сайте / название ЭБС
}

export interface Person {
  last: string
  initials: string[] // без точек
}

const INITIALS_RE = /^([A-ZА-ЯЁ]\.\s*)+$/u

/** «Иванов Иван Иванович», «Иванов И.И.», «И. И. Иванов», «Иванов, И. И.» → { Иванов, [И, И] } */
export function parsePerson(raw: string): Person | null {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (!s) return null
  let last: string
  let rest: string
  if (s.includes(',')) {
    ;[last, rest] = [s.slice(0, s.indexOf(',')).trim(), s.slice(s.indexOf(',') + 1).trim()]
  } else {
    const parts = s.split(' ')
    // «И. И. Иванов» / «И.И. Иванов»
    const lead = parts.slice(0, -1).join(' ')
    if (parts.length > 1 && INITIALS_RE.test(lead)) {
      last = parts[parts.length - 1]
      rest = lead
    } else {
      last = parts[0]
      rest = parts.slice(1).join(' ')
    }
  }
  const initials = rest
    .split(/[.\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
  return { last, initials }
}

const ini = (p: Person) => p.initials.map((i) => `${i}.`).join(' ')
/** Для заголовка записи: «Иванов, И. И.» */
export const headingName = (p: Person) => (p.initials.length ? `${p.last}, ${ini(p)}` : p.last)
/** Для сведений об ответственности: «И. И. Иванов» */
export const respName = (p: Person) => (p.initials.length ? `${ini(p)} ${p.last}` : p.last)

export function parseAuthors(s: string): Person[] {
  return s
    .split(/\n|;/)
    .map(parsePerson)
    .filter((x): x is Person => !!x)
}

const clean = (s?: string) => (s ?? '').trim().replace(/\s+/g, ' ')
/** «10-25» → «10–25» */
const range = (s: string) => s.replace(/\s*[-—–]\s*/g, '–')

/** Соединить области записи через «. – », не удваивая точку. */
function areas(parts: (string | false | undefined)[], dash: string): string {
  const list = parts.map((p) => (p || '').trim()).filter(Boolean)
  let out = ''
  for (const p of list) {
    if (!out) out = p
    else out += (/[.!?]$/.test(out) ? ' ' : '. ') + dash + ' ' + p
  }
  return /[.!?]$/.test(out) ? out : out + '.'
}

/** Заглавие + сведения к заглавию + ответственность: «Заглавие : учебник / И. И. Иванов ; под ред. …» */
function titleBlock(d: RefData, people: Person[]): { head: string; body: string } {
  const head = people.length >= 1 && people.length <= 3 ? headingName(people[0]) : ''
  const respPeople = people.length <= 3 ? people.map(respName).join(', ') : `${people.slice(0, 3).map(respName).join(', ')} [и др.]`
  let body = clean(d.title)
  if (clean(d.subtitle)) body += ` : ${clean(d.subtitle)}`
  const resp = [respPeople, clean(d.extra)].filter(Boolean).join(' ; ')
  if (resp) body += ` / ${resp}`
  return { head, body }
}

/** Выходные данные: «Москва : Юрайт, 2023» */
function imprint(d: RefData): string {
  const city = clean(d.city)
  const pub = clean(d.publisher)
  const year = clean(d.year)
  let s = city
  if (pub) s += (s ? ' : ' : '') + pub
  if (year) s += (s ? ', ' : '') + year
  return s
}

const urlPart = (d: RefData) => (clean(d.url) ? `URL: ${clean(d.url)}${clean(d.accessed) ? ` (дата обращения: ${clean(d.accessed)})` : ''}` : '')

export function formatRef(d: RefData, dash: '–' | '—' = '–'): string {
  const people = parseAuthors(d.authors)
  const { head, body } = titleBlock(d, people)
  const start = head ? `${head} ${body}` : body

  if (d.kind === 'article') {
    const host = [
      `Текст : ${d.electronic ? 'электронный' : 'непосредственный'} // ${clean(d.journal)}`,
      clean(d.year),
      clean(d.volume) && `Т. ${clean(d.volume)}`,
      clean(d.issue) && `№ ${clean(d.issue)}`,
      clean(d.pages) && `С. ${range(clean(d.pages))}`,
      d.electronic && urlPart(d),
    ]
    return areas([start, ...host], dash)
  }

  if (d.kind === 'web') {
    const where = [clean(d.city), clean(d.year)].filter(Boolean).join(', ')
    if (clean(d.site)) {
      // статья / страница на сайте: «… – Текст : электронный // Сайт : сайт. – URL: …»
      return areas([start, `Текст : электронный // ${clean(d.site)}`, where, urlPart(d)], dash)
    }
    return areas([start, where, urlPart(d), 'Текст : электронный'], dash)
  }

  const book = [
    start,
    clean(d.edition),
    imprint(d),
    clean(d.pages) && `${clean(d.pages).replace(/\s*с\.?$/, '')} с`,
    clean(d.series) && `(${clean(d.series)})`,
    clean(d.isbn) && `ISBN ${clean(d.isbn)}`,
  ]
  if (d.kind === 'ebs') {
    return areas([...book, `Текст : электронный // ${clean(d.site)}`, urlPart(d), 'Режим доступа: для авториз. пользователей'], dash)
  }
  return areas([...book, 'Текст : непосредственный'], dash)
}

/** ЭБС и их названия в записи. */
export const EBS: { id: string; label: string; site: string; host: RegExp }[] = [
  { id: 'lan', label: 'Лань', site: 'Лань : электронно-библиотечная система', host: /lanbook/ },
  { id: 'znanium', label: 'Znanium', site: 'Znanium : электронно-библиотечная система', host: /znanium/ },
  { id: 'urait', label: 'Юрайт', site: 'Образовательная платформа Юрайт [сайт]', host: /urait/ },
  { id: 'elibrary', label: 'eLIBRARY', site: 'eLIBRARY.RU : научная электронная библиотека : сайт', host: /elibrary/ },
  { id: 'cyberleninka', label: 'КиберЛенинка', site: 'КиберЛенинка : научная электронная библиотека', host: /cyberleninka/ },
]

/** Подобрать ЭБС по ссылке. */
export const ebsByUrl = (url: string) => EBS.find((e) => e.host.test(url))

/** Ключ сортировки списка: по алфавиту, русские раньше латинских (как принято в списках). */
export function sortRefs(list: string[]): string[] {
  return [...list].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }))
}
