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
  const both = ['Социально-экономическая статистика', 'Экономическая теория']
  assert.equal(parseQuick('эссе по экономике', NOW, both).subject, 'Экономическая теория')
  assert.equal(parseQuick('задачи по статистике', NOW, both).subject, 'Социально-экономическая статистика')
})

test('без даты — только название', () => {
  assert.deepEqual(p('  прочитать главу 3  '), { title: 'Прочитать главу 3', dueDate: undefined, dueTime: undefined, subject: undefined })
})

// ---------- «к следующей паре» ----------
const LESSONS = [
  { date: '2026-11-01', start: '08:20', subject: 'История России', kind: 'Лекция' }, // уже прошла (сегодня утром)
  { date: '2026-11-03', start: '19:40', subject: 'История России', kind: 'Лекция' },
  { date: '2026-11-02', start: '10:10', subject: 'Высшая математика', kind: 'Практическое занятие' },
  { date: '2026-11-05', start: '12:00', subject: 'Высшая математика', kind: 'Лекция' },
  { date: '2026-11-06', start: '08:20', subject: 'Высшая математика', kind: 'Практическое занятие' },
  { date: '2026-11-05', start: '10:10', subject: 'Цифровая культура', kind: 'Лабораторная работа' },
]
const pp = (s: string) => parseQuick(s, NOW, [...SUBJECTS, 'Практическая риторика'], LESSONS)

test('«к следующей паре» — ближайшая будущая пара по предмету', () => {
  const r = pp('доклад по истории к следующей паре')
  assert.equal(r.title, 'Доклад по истории')
  assert.equal(r.subject, 'История России')
  assert.equal(r.dueDate, '2026-11-03')
  assert.equal(r.dueTime, '19:40')
  assert.deepEqual(r.pair?.found, { date: '2026-11-03', start: '19:40', kind: 'Лекция' })
})

test('тип занятия: практика / лекция / лаба', () => {
  assert.equal(pp('дз по матану к следующей практике').dueDate, '2026-11-02')
  assert.equal(pp('дз по матану к следующей практике').subject, 'Высшая математика') // не «Практическая риторика»
  assert.equal(pp('конспект к следующей лекции по матану').dueDate, '2026-11-05')
  assert.equal(pp('отчёт к лабе по цифровой культуре').dueDate, '2026-11-05')
  assert.equal(pp('отчёт к лабе по цифровой культуре').title, 'Отчёт по цифровой культуре')
  assert.equal(pp('матан дз к след. паре').dueDate, '2026-11-02')
  assert.equal(pp('матан дз к ближайшему занятию').dueDate, '2026-11-02')
})

test('«к паре в пятницу» — время пары в этот день', () => {
  const r = pp('матан к паре в пятницу')
  assert.equal(r.dueDate, '2026-11-06')
  assert.equal(r.dueTime, '08:20')
})

test('предмет не понятен или пар нет — срок не ставим', () => {
  const a = pp('сделать к следующей паре')
  assert.equal(a.dueDate, undefined)
  assert.equal(a.pair?.problem, 'no-subject')
  assert.equal(a.title, 'Сделать')
  const b = pp('эссе по экономике к следующей паре')
  assert.equal(b.subject, 'Экономическая теория')
  assert.equal(b.pair?.problem, 'not-found')
  assert.equal(b.dueDate, undefined)
})

test('слово «пара» без «к/следующей» — обычный текст', () => {
  const r = pp('пара вопросов по матану')
  assert.equal(r.pair, undefined)
  assert.equal(r.title, 'Пара вопросов по матану')
})
