// Проверка разбора РУЗ на сохранённой странице (неделя 26–31.10.2026).
// Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseRuzHtml } from './ruz-parse.mjs'

const html = readFileSync(new URL('./fixtures/ruz-171606-week1.html', import.meta.url), 'utf8')
const { title, days, lessons } = parseRuzHtml(html)

test('страница группы 171606, шесть дней недели', () => {
  assert.match(title, /171606/)
  assert.deepEqual(days, ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
})

test('мобильные дубли и пустые ячейки не попадают в пары', () => {
  const mon = lessons.filter((l) => l.date === '2026-10-26')
  assert.equal(mon.length, 4)
  assert.ok(lessons.every((l) => /^\d\d:\d\d$/.test(l.start) && /^\d\d:\d\d$/.test(l.end)))
})

test('поля пары разбираются целиком', () => {
  const l = lessons.find((x) => x.date === '2026-10-26' && x.num === 2)
  assert.deepEqual(l, {
    date: '2026-10-26',
    num: 2,
    start: '10:10',
    end: '11:45',
    kind: 'Практическое занятие',
    subject: 'Социально-экономическая статистика',
    teacher: 'Вотинова Н.Г.',
    room: 'ауд. 108',
    address: 'наб. Северной Двины, 54, корп. 1',
    group: '',
  })
})

test('аудитория без номера — без слова «ауд.»', () => {
  assert.ok(lessons.some((l) => l.room === 'зал фитнеса'))
  assert.ok(!lessons.some((l) => /^ауд\.\s*[^\d\s]/.test(l.room)))
})

test('параллельные потоки английского — отдельные пары', () => {
  const eng = lessons.filter((l) => l.date === '2026-10-29' && l.num === 1 && l.subject === 'Иностранный язык')
  assert.equal(eng.length, 7)
  assert.equal(new Set(eng.map((l) => l.group)).size, 7)
})
