// Тесты напоминаний. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_NOTIFY, digest, dueReminders, type RLesson, type RTask } from './reminders.ts'

const ON = { ...DEFAULT_NOTIFY, enabled: true }
const L = (date: string, start: string, end: string, subject = 'Высшая математика', room = 'ауд. 107'): RLesson => ({ date, start, end, subject, kind: 'Практическое занятие', room })
const T = (o: Partial<RTask>): RTask => ({ id: 'x', title: 'Эссе', subject: 'История России', status: 'todo', ...o })
const at = (d: string, hhmm: string) => new Date(`${d}T${hhmm}:00`)

test('выключено — ничего', () => {
  assert.deepEqual(dueReminders(at('2026-11-05', '08:12'), DEFAULT_NOTIFY, [L('2026-11-05', '08:20', '09:55')], [], []), [])
})

test('за 10 минут до пары, не раньше', () => {
  const ls = [L('2026-11-05', '08:20', '09:55')]
  assert.equal(dueReminders(at('2026-11-05', '08:05'), ON, ls, [], []).length, 0)
  const r = dueReminders(at('2026-11-05', '08:12'), ON, ls, [], [])
  assert.equal(r[0].title, 'Через 8 мин: Высшая математика')
  assert.equal(r[0].body, 'практика, 08:20–09:55 · ауд. 107')
  assert.equal(dueReminders(at('2026-11-05', '08:20'), ON, ls, [], []).length, 0) // уже началась
})

test('за час до срока со временем', () => {
  const r = dueReminders(at('2026-11-05', '17:30'), ON, [], [], [T({ dueDate: '2026-11-05', dueTime: '18:00' })])
  assert.ok(r.some((x) => x.title === 'Через 30 мин срок: Эссе'))
})

test('утром — сроки сегодня, вечером — завтрашние не начатые', () => {
  const tasks = [T({ id: 'a', dueDate: '2026-11-05' }), T({ id: 'b', title: 'Лаба', dueDate: '2026-11-06' }), T({ id: 'c', title: 'Доклад', dueDate: '2026-11-06', status: 'doing' })]
  const morning = dueReminders(at('2026-11-05', '09:00'), ON, [], [], tasks)
  assert.deepEqual(morning.map((x) => x.id), ['today:2026-11-05'])
  const evening = dueReminders(at('2026-11-05', '20:00'), ON, [], [], tasks)
  assert.equal(evening[0].title, 'Завтра срок, а ещё не начато: 1')
  assert.equal(evening[0].body, '«Лаба»')
})

test('сводка: утром на сегодня, после 15:00 — на завтра', () => {
  const ls = [L('2026-11-05', '10:10', '11:45'), L('2026-11-05', '10:10', '11:45', 'Иностранный язык'), L('2026-11-05', '12:00', '13:35'), L('2026-11-06', '08:20', '09:55', 'История России', 'ауд. 108')]
  const d1 = digest(at('2026-11-05', '07:00'), ls, [], [T({ dueDate: '2026-11-05' })])!
  assert.equal(d1.title, 'Сегодня: 2 пары с 10:10, 1 срок сдачи')
  assert.match(d1.body, /Первая: Высшая математика, ауд. 107\. Сдать: «Эссе»/)
  const d2 = digest(at('2026-11-05', '20:00'), ls, [], [])!
  assert.equal(d2.title, 'Завтра: 1 пара с 08:20')
  assert.equal(digest(at('2026-11-07', '07:00'), ls, [], []), null)
})
