// Тесты подсказок по тайм-менеджменту. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTips, type TipLesson, type TipTask } from './tips.ts'
import { dayLoad } from './load.ts'

const NOW = new Date(2026, 10, 3, 10, 0) // вторник, 3 ноября 2026, 10:00
const L = (date: string, start: string, end: string, subject = 'Высшая математика', kind = 'Лекция'): TipLesson => ({ date, start, end, subject, kind })
const T = (o: Partial<TipTask>): TipTask => ({ id: Math.random().toString(36).slice(2), title: 'Задание', subject: '', status: 'todo', createdAt: 0, updatedAt: NOW.getTime(), ...o })
const ids = (tips: { id: string }[]) => tips.map((t) => t.id.split(':')[0])

test('нагрузка: пересекающиеся пары не удваиваются', () => {
  const ls = [L('2026-11-05', '08:20', '09:55'), L('2026-11-05', '08:20', '09:55', 'Иностранный язык')]
  const d = dayLoad('2026-11-05', ls, [], [])
  assert.equal(d.busyMin, 95)
  assert.equal(d.pairs, 1)
  assert.equal(d.level, 'light')
})

test('нагрузка: 3 пары + 2 дедлайна — тяжёлый, 4 пары — тяжёлый и без дедлайнов', () => {
  const ls = ['08:20', '10:10', '12:00', '14:30'].map((s, i) => L('2026-11-05', s, ['09:55', '11:45', '13:35', '16:05'][i]))
  const three = ls.slice(0, 3)
  const two = [{ dueDate: '2026-11-05', status: 'todo' }, { dueDate: '2026-11-05', status: 'doing' }]
  assert.equal(dayLoad('2026-11-05', three, [], two).level, 'heavy')
  assert.equal(dayLoad('2026-11-05', three, [], []).level, 'normal')
  assert.equal(dayLoad('2026-11-05', ls, [], []).level, 'heavy') // 6 ч 20 мин пар
})

test('накладка пар в РУЗ (как 19 ноября)', () => {
  const tips = buildTips(NOW, [L('2026-11-12', '12:00', '13:35'), L('2026-11-12', '12:00', '13:35', 'Цифровая культура', 'Лабораторная работа')], [], [])
  assert.equal(tips[0].id.split(':')[0], 'conflict')
  assert.match(tips[0].text, /«Высшая математика» \(лекция\) и «Цифровая культура» \(лаба\)/)
})

test('просрочено и «завтра срок, а не начато»', () => {
  const tips = buildTips(NOW, [], [], [T({ title: 'Эссе', dueDate: '2026-11-01' }), T({ title: 'Лаба', dueDate: '2026-11-04' }), T({ title: 'Доклад', dueDate: '2026-11-04', status: 'doing' })])
  assert.deepEqual(ids(tips), ['overdue', 'soon'])
  assert.match(tips[1].text, /«Лаба»/) // «Доклад» уже в работе — не ругаем
})

test('окно между парами сегодня — только если ещё не прошло', () => {
  const ls = [L('2026-11-03', '08:20', '09:55'), L('2026-11-03', '12:00', '13:35'), L('2026-11-03', '14:30', '16:05')]
  const tips = buildTips(NOW, ls, [], [T({ title: 'Конспект', dueDate: '2026-11-10' })])
  const w = tips.find((t) => t.id.startsWith('window'))!
  assert.match(w.title, /Сегодня окно 55 мин \(13:35–14:30\)/) // окно 09:55–12:00 уже прошло к 10:00
  assert.match(w.text, /«Конспект»/)
})

test('поздняя репетиция перед парой в 08:20', () => {
  const tips = buildTips(NOW, [L('2026-11-04', '08:20', '09:55')], [{ date: '2026-11-03', start: '19:00', end: '21:30', title: 'Репетиция' }], [])
  const t = tips.find((x) => x.id.startsWith('late'))!
  assert.match(t.text, /«Репетиция» до 21:30, а завтра первая пара в 08:20/)
})

test('давно в работе, без срока, свободный день', () => {
  const old = NOW.getTime() - 7 * 864e5
  const tips = buildTips(NOW, [L('2026-11-04', '08:20', '09:55')], [], [
    T({ title: 'Курсовая', status: 'doing', updatedAt: old, dueDate: '2026-11-20' }),
    T({ title: 'А' }),
    T({ title: 'Б' }),
  ])
  assert.ok(tips.some((t) => t.id.startsWith('stale') && /7 дней/.test(t.title)))
  assert.ok(tips.some((t) => t.id.startsWith('nodue') && /У 2 заданий/.test(t.title)))
  const free = tips.find((t) => t.id.startsWith('free'))!
  assert.match(free.title, /чт, 5 ноя свободный день/i) // ср 4-го — пара, чт 5-го — пусто
})

test('всё спокойно — подсказок нет', () => {
  assert.deepEqual(buildTips(NOW, [L('2026-11-04', '10:10', '11:45')], [], [T({ title: 'X', dueDate: '2026-11-04', status: 'doing' })]), [])
})
