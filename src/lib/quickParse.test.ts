// Тесты быстрого ввода. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuick } from './quickParse.ts'

const NOW = new Date(2026, 10, 1, 21, 0) // воскресенье, 1 ноября 2026
const SUBJECTS = [
  'Цифровая культура',
  'Прикладная физическая культура и спорт',
  'Иностранный язык',
  'Высшая математика',
  'Экономическая теория',
  'История России',
]
const p = (s: string) => parseQuick(s, NOW, SUBJECTS)

test('пример из ТЗ: «конспект по страхованию до пт»', () => {
  assert.deepEqual(p('конспект по страхованию до пт'), {
    title: 'Конспект по страхованию',
    dueDate: '2026-11-06',
    dueTime: undefined,
    subject: undefined,
  })
})

test('сегодня / завтра / послезавтра', () => {
  assert.equal(p('эссе сегодня').dueDate, '2026-11-01')
  assert.equal(p('эссе завтра').dueDate, '2026-11-02')
  assert.equal(p('эссе на послезавтра').dueDate, '2026-11-03')
  assert.equal(p('эссе на послезавтра').title, 'Эссе')
})

test('дни недели в разных формах', () => {
  assert.equal(p('доклад к понедельнику').dueDate, '2026-11-02')
  assert.equal(p('доклад в среду').dueDate, '2026-11-04')
  assert.equal(p('доклад до пятницы').dueDate, '2026-11-06')
  assert.equal(p('доклад вс').dueDate, '2026-11-08') // сегодня вс → следующее
  assert.equal(p('найти среднюю величину').dueDate, undefined) // «среднюю» — не среда
})

test('числа и месяцы', () => {
  assert.equal(p('реферат 15.11').dueDate, '2026-11-15')
  assert.equal(p('реферат к 3 декабря').dueDate, '2026-12-03')
  assert.equal(p('реферат к 3 декабря').title, 'Реферат')
  assert.equal(p('реферат 10.01.27').dueDate, '2027-01-10')
  assert.equal(p('реферат 1.09').dueDate, '2027-09-01') // сентябрь прошёл — следующий год
  assert.equal(p('реферат 31.02').dueDate, undefined)
})

test('через N дней / неделю', () => {
  assert.equal(p('прочитать хрестоматию через 3 дня').dueDate, '2026-11-04')
  assert.equal(p('прочитать хрестоматию через 3 дня').title, 'Прочитать хрестоматию')
  assert.equal(p('проект через неделю').dueDate, '2026-11-08')
  assert.equal(p('проект через 2 недели').dueDate, '2026-11-15')
})

test('время', () => {
  const r = p('сдать эссе завтра в 18:00')
  assert.equal(r.dueDate, '2026-11-02')
  assert.equal(r.dueTime, '18:00')
  assert.equal(r.title, 'Сдать эссе')
})

test('предмет угадывается по слову и по прозвищу', () => {
  assert.equal(p('лаба по цифровой культуре завтра').subject, 'Цифровая культура')
  assert.equal(p('англ эссе до чт').subject, 'Иностранный язык')
  assert.equal(p('матан дз').subject, 'Высшая математика')
  assert.equal(p('физра справка').subject, 'Прикладная физическая культура и спорт')
  assert.equal(p('купить тетради').subject, undefined)
})

test('без даты — только название', () => {
  assert.deepEqual(p('  прочитать главу 3  '), { title: 'Прочитать главу 3', dueDate: undefined, dueTime: undefined, subject: undefined })
})
