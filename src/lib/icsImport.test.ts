// Тесты импорта .ics. Запуск: npm test
process.env.TZ = 'Europe/Moscow' // как на телефоне Максима
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIcs } from './icsImport.ts'
// @ts-expect-error — обычный JS-модуль генератора календаря
import { buildIcs } from '../../scripts/ics.mjs'

test('свой календарь «Зачётки» читается обратно', () => {
  const schedule = {
    fetchedAt: '2026-11-02T04:00:00Z',
    lessons: [
      { date: '2026-11-05', num: 1, start: '08:20', end: '09:55', kind: 'Практическое занятие', subject: 'Высшая математика', teacher: 'Зеленина Л.И.', room: 'ауд. 107', address: 'наб. Северной Двины, 54', group: '' },
      { date: '2026-11-05', num: 3, start: '12:00', end: '13:35', kind: 'Лекция', subject: 'Основы правовой и финансовой грамотности', teacher: 'Ершова И.В.', room: 'ауд. 211', address: '', group: 'Поток "171606, 171607"' },
    ],
  }
  const { lessons, skipped } = parseIcs(buildIcs(schedule, { groupNumber: '171606' }))
  assert.equal(skipped, 0)
  assert.deepEqual(lessons, [
    { date: '2026-11-05', start: '08:20', end: '09:55', subject: 'Высшая математика', kind: 'Практическое занятие', room: 'ауд. 107, наб. Северной Двины, 54', teacher: 'Зеленина Л.И.' },
    { date: '2026-11-05', start: '12:00', end: '13:35', subject: 'Основы правовой и финансовой грамотности', kind: 'Лекция', room: 'ауд. 211', teacher: 'Ершова И.В.' },
  ])
})

const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}END:VCALENDAR\r\n`

test('время в UTC переводится в московское', () => {
  const { lessons } = parseIcs(wrap('BEGIN:VEVENT\r\nDTSTART:20261105T052000Z\r\nDTEND:20261105T065500Z\r\nSUMMARY:История России\r\nEND:VEVENT\r\n'))
  assert.equal(lessons[0].start, '08:20')
  assert.equal(lessons[0].end, '09:55')
  assert.equal(lessons[0].kind, 'Занятие')
})

test('повтор каждую неделю с исключением, длительность, перенос строк', () => {
  const ics = wrap(
    'BEGIN:VEVENT\r\nDTSTART;TZID=Europe/Moscow:20261102T101000\r\nDURATION:PT1H35M\r\n' +
      'RRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE;TZID=Europe/Moscow:20261109T101000\r\n' +
      'SUMMARY:Экономическая теория (Лекц\r\n ия)\r\nLOCATION:ауд. 211\\, корп. 1\r\nEND:VEVENT\r\n',
  )
  const { lessons } = parseIcs(ics)
  assert.deepEqual(lessons.map((l) => l.date), ['2026-11-02', '2026-11-16', '2026-11-23'])
  assert.equal(lessons[0].end, '11:45')
  assert.equal(lessons[0].subject, 'Экономическая теория')
  assert.equal(lessons[0].kind, 'Лекция')
  assert.equal(lessons[0].room, 'ауд. 211, корп. 1')
})

test('целодневные и отменённые пропускаются', () => {
  const ics = wrap(
    'BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261104\r\nSUMMARY:Праздник\r\nEND:VEVENT\r\n' +
      'BEGIN:VEVENT\r\nDTSTART:20261105T082000\r\nDTEND:20261105T095500\r\nSTATUS:CANCELLED\r\nSUMMARY:Отменено\r\nEND:VEVENT\r\n',
  )
  assert.deepEqual(parseIcs(ics), { lessons: [], skipped: 2 })
})
