// Разбор HTML-страницы расписания группы из РУЗ САФУ (ruz.narfu.ru).
//
// Официального API нет, поэтому читаем ту же страницу, что видит браузер.
// Правила разбора сверены с открытым проектом github.com/denizsincar29/schedule
// (автор — Deniz Sincar): колонки дней — <div class="dayofweek">, каждая пара —
// <div class="timetable_sheet …"> (берём «большую» версию, а не мобильную _xs).

const ENTITIES = { nbsp: ' ', ndash: '–', mdash: '—', quot: '"', amp: '&', lt: '<', gt: '>', laquo: '«', raquo: '»' }

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
}

/** Убрать теги, раскодировать, схлопнуть пробелы. */
function text(s) {
  return decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function field(chunk, cls) {
  const m = chunk.match(new RegExp(`<span class="${cls}">([\\s\\S]*?)</span>`))
  return m ? m[1] : ''
}

/**
 * @param {string} html страница ?timetable&group=<oid>
 * @returns {{ title: string, days: string[], lessons: object[] }}
 *   days — все даты-колонки на странице (в том числе пустые дни),
 *   lessons — пары по порядку.
 */
export function parseRuzHtml(html) {
  const h = html.replace(/<!--[\s\S]*?-->/g, '')
  const title = text(h.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '')

  const heads = [...h.matchAll(/<div class="dayofweek[^"]*">([\s\S]*?)<\/div>/g)]
  const days = []
  const lessons = []

  heads.forEach((m, k) => {
    const dm = text(m[1]).match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (!dm) return
    const date = `${dm[3]}-${dm[2]}-${dm[1]}`
    days.push(date)

    const seg = h.slice(m.index + m[0].length, k + 1 < heads.length ? heads[k + 1].index : h.length)
    // Только «большие» карточки: class="timetable_sheet …", не timetable_sheet_xs.
    for (const sm of seg.matchAll(/<div class="timetable_sheet [^"]*">([\s\S]*?)<\/div>/g)) {
      const chunk = sm[1]
      const time = text(field(chunk, 'time_para'))
      if (!time) continue // пустая ячейка-заглушка (только номер пары)
      const [start = '', end = ''] = time.split(/\s*[–—-]\s*/)

      const disc = field(chunk, 'discipline')
      const teachers = [...disc.matchAll(/<nobr>([\s\S]*?)<\/nobr>/g)].map((t) => text(t[1]))
      const subject = text(disc.replace(/\s*\(\s*<nobr>[\s\S]*?<\/nobr>\s*\)\s*/g, ' '))

      const aud = field(chunk, 'auditorium')
      const bm = aud.match(/<b>([\s\S]*?)<\/b>([\s\S]*)$/)
      // «ауд. 108» оставляем как есть, «ауд. Дистанционное обучение» → «Дистанционное обучение»
      const rawRoom = (bm ? text(bm[1]) : text(aud)).replace(/^ауд\.\s*/, '')
      const room = /^\d/.test(rawRoom) ? `ауд. ${rawRoom}` : rawRoom
      const address = bm ? text(bm[2]).replace(/^[\s,]+/, '') : ''

      lessons.push({
        date,
        num: Number(text(field(chunk, 'num_para'))) || 0,
        start: start.padStart(5, '0'),
        end: end.padStart(5, '0'),
        kind: text(field(chunk, 'kindOfWork')),
        subject,
        teacher: teachers.join(', '),
        room,
        address,
        group: text(field(chunk, 'group')),
      })
    }
  })

  lessons.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.num - b.num)
  return { title, days, lessons }
}
