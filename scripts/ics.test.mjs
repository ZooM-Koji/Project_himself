// Тесты файла календаря. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIcs, calendarEvents } from './ics.mjs'

const L = (o) => ({ num: 1, start: '08:20', end: '09:55', kind: 'Практическое занятие', teacher: 'Иванова И.И.', room: 'ауд. 107', address: 'наб. Северной Двины, 54', group: '', ...o })
const schedule = {
  fetchedAt: '2026-11-02T04:09:36.000Z',
  lessons: [
    L({ date: '2026-11-05', subject: 'Высшая математика' }),
    L({ date: '2026-11-05', num: 3, start: '12:00', end: '13:35', kind: 'Лекция', subject: 'Теория управления', group: 'Поток "171606, 171607, 171608, 171609"' }),
    L({ date: '2026-11-06', subject: 'Иностранный язык', group: 'Поток "ВШЭУиП_№1(э)"', room: 'ауд. 113' }),
    L({ date: '2026-11-06', subject: 'Иностранный язык', group: 'Поток "ВШЭУиП_№2(э)"', room: 'ауд. 110' }),
    L({ date: '2026-11-06', subject: 'Иностранный язык', group: 'Поток "ВШЭУиП_№3(э)"', room: 'ауд. 421' }),
    L({ date: '2026-11-07', subject: 'Цифровая культура', kind: 'Лабораторная работа', group: 'Подгруппа 171606_ЦК_02' }),
  ],
}
const SER = 'Иностранный язык|Практическое занятие'

test('без выбора: параллельные пары — одно событие «поток не выбран»', () => {
  const ev = calendarEvents(schedule, '171606')
  assert.equal(ev.length, 4)
  const eng = ev.find((e) => e.subject === 'Иностранный язык')
  assert.equal(eng.alternatives, 3)
  // одиночная подгруппа без выбора остаётся как есть
  assert.equal(ev.find((e) => e.subject === 'Цифровая культура').alternatives, 0)
})

test('с выбором: только мой поток', () => {
  const ev = calendarEvents(schedule, '171606', { [SER]: 'Поток "ВШЭУиП_№2(э)"', 'Цифровая культура|Лабораторная работа': 'Поток "171606_ЦК_01"' })
  const eng = ev.filter((e) => e.subject === 'Иностранный язык')
  assert.equal(eng.length, 1)
  assert.equal(eng[0].room, 'ауд. 110')
  assert.equal(ev.filter((e) => e.subject === 'Цифровая культура').length, 0) // подгруппа 02 — не моя
  assert.equal(ev.filter((e) => e.subject === 'Теория управления').length, 1) // общий поток — всегда
})

test('формат .ics: CRLF, московское время, экранирование, перенос строк', () => {
  const ics = buildIcs(schedule, { groupNumber: '171606', myGroups: { [SER]: 'Поток "ВШЭУиП_№1(э)"' } })
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'))
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  assert.ok(!/[^\r]\n/.test(ics), 'только CRLF')
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 4)
  assert.ok(ics.includes('DTSTART;TZID=Europe/Moscow:20261105T082000'))
  assert.ok(ics.includes('SUMMARY:Высшая математика (практика)'))
  assert.equal(ics.match(/TRIGGER:-PT15M/g).length, 4) // напоминание за 15 минут у каждой пары
  assert.ok(ics.includes('LOCATION:ауд. 107\\, наб. Северной Двины\\, 54'))
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `длинная строка: ${line}`)
})

test('id событий стабильны между сборками', () => {
  const a = buildIcs(schedule, { groupNumber: '171606' }).match(/UID:.*/g)
  const b = buildIcs({ ...schedule, fetchedAt: '2026-11-09T00:00:00Z' }, { groupNumber: '171606' }).match(/UID:.*/g)
  assert.deepEqual(a, b)
  assert.equal(new Set(a).size, a.length)
})
