// Тесты «Зала»: расчёты и советы. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES, e1rm, formatSet, gymTips, history, suggestNext, tonnage, type WorkoutLike } from './gym.ts'

const ex = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === `ex:${id}`)!
const S = (w: number, r: number, done = true) => ({ w, r, done })
const W = (date: string, exerciseId: string, sets: ReturnType<typeof S>[], id = date): WorkoutLike => ({ id, date, items: [{ exerciseId, sets }] })

test('расчётный максимум (Эпли)', () => {
  assert.equal(e1rm(100, 1), 100)
  assert.equal(e1rm(60, 10), 80)
  assert.equal(e1rm(0, 12), 12) // свой вес — считаем повторы
})

test('история: только сделанные подходы, лучший подход', () => {
  const h = history('ex:bench', [W('2026-11-01', 'ex:bench', [S(60, 8), S(60, 8), S(70, 3, false)]), W('2026-11-03', 'ex:squat', [S(80, 5)])])
  assert.equal(h.length, 1)
  assert.equal(h[0].sets.length, 2)
  assert.equal(h[0].best, 76)
})

test('двойная прогрессия: верх диапазона → прибавить вес', () => {
  const s = suggestNext(ex('bench'), history('ex:bench', [W('2026-11-01', 'ex:bench', [S(60, 8), S(60, 8), S(60, 9)])]))
  assert.equal(s.kind, 'up')
  assert.equal(s.weight, 62.5)
  assert.match(s.text, /62,5 кг/)
})

test('внутри диапазона — тот же вес, +1 повтор; ниже — сбавить', () => {
  const same = suggestNext(ex('bench'), history('ex:bench', [W('2026-11-01', 'ex:bench', [S(60, 7), S(60, 6), S(60, 6)])]))
  assert.equal(same.kind, 'same')
  assert.equal(same.reps, 7)
  const down = suggestNext(ex('squat'), history('ex:squat', [W('2026-11-01', 'ex:squat', [S(100, 5), S(100, 3)])]))
  assert.equal(down.kind, 'down')
  assert.equal(down.weight, 95)
})

test('застой три тренировки → разгрузка −10 %', () => {
  const ws = ['01', '03', '05', '08'].map((d, i) => W(`2026-11-${d}`, 'ex:bench', i === 0 ? [S(80, 6)] : [S(80, 5), S(80, 5)]))
  const s = suggestNext(ex('bench'), history('ex:bench', ws))
  assert.equal(s.kind, 'deload')
  assert.equal(s.weight, 72.5)
})

test('свой вес: подтягивания', () => {
  assert.equal(suggestNext(ex('pullups'), history('ex:pullups', [W('2026-11-01', 'ex:pullups', [S(0, 12), S(0, 12), S(0, 13)])])).kind, 'up')
  const s = suggestNext(ex('pullups'), history('ex:pullups', [W('2026-11-01', 'ex:pullups', [S(0, 8), S(0, 7)])]))
  assert.equal(s.reps, 8)
})

test('советы: давно не было группы, мало подходов', () => {
  const now = new Date(2026, 10, 20)
  const ws = [W('2026-11-05', 'ex:squat', [S(80, 6), S(80, 6), S(80, 6)], 'a'), W('2026-11-18', 'ex:bench', [S(60, 8), S(60, 8)], 'b')]
  const tips = gymTips(now, ws, DEFAULT_EXERCISES)
  assert.ok(tips.some((t) => t.id.startsWith('forgot') && /ноги/.test(t.text)))
  assert.ok(tips.some((t) => t.id.startsWith('few') && /грудь/.test(t.text)))
  assert.deepEqual(gymTips(now, [], DEFAULT_EXERCISES).map((t) => t.id), ['first'])
})

test('тоннаж', () => {
  assert.equal(tonnage(W('2026-11-01', 'ex:bench', [S(60, 8), S(60, 8), S(70, 3, false)])), 960)
})

test('показ подхода', () => {
  assert.equal(formatSet(ex('bench'), { w: 62.5, r: 5 }), '62,5×5')
  assert.equal(formatSet(ex('pullups'), { w: 0, r: 8 }), '8 повт.')
  assert.equal(formatSet(ex('pullups'), { w: 10, r: 6 }), '+10×6')
  assert.equal(formatSet(ex('plank'), { w: 0, r: 60 }), '60')
})
