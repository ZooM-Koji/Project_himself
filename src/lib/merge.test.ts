// Тесты слияния для синхронизации. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeTables, tablesHash } from './merge.ts'

const r = (id: string, updatedAt: number, extra: Record<string, unknown> = {}) => ({ id, updatedAt, ...extra })

test('первый раз: на Диске пусто — всё уходит туда, ничего не приходит', () => {
  const m = mergeTables({ tasks: [r('a', 1), r('b', 2)] }, null)
  assert.equal(m.pulled, 0)
  assert.equal(m.pushed, 2)
  assert.deepEqual(m.merged.tasks.map((x) => x.id), ['a', 'b'])
})

test('новее побеждает — в обе стороны', () => {
  const local = { tasks: [r('a', 5, { title: 'телефон' }), r('b', 1, { title: 'старое' })] }
  const remote = { tasks: [r('a', 3, { title: 'комп' }), r('b', 9, { title: 'новое с компа' }), r('c', 4)] }
  const m = mergeTables(local, remote)
  const byId = Object.fromEntries(m.merged.tasks.map((x) => [x.id, x]))
  assert.equal((byId.a as { title: string }).title, 'телефон')
  assert.equal((byId.b as { title: string }).title, 'новое с компа')
  assert.deepEqual(m.toWrite.tasks.map((x) => x.id).sort(), ['b', 'c'])
  assert.equal(m.pulled, 2)
  assert.equal(m.pushed, 1) // «a» на Диске устарело
})

test('удаление переносится как обычное обновление', () => {
  const m = mergeTables({ notes: [r('n', 2, { deleted: false })] }, { notes: [r('n', 7, { deleted: true })] })
  assert.equal((m.merged.notes[0] as { deleted: boolean }).deleted, true)
})

test('одинаковое время — оставляем своё (никакой «пляски» туда-обратно)', () => {
  const m = mergeTables({ tasks: [r('a', 5, { v: 1 })] }, { tasks: [r('a', 5, { v: 2 })] })
  assert.equal(m.pulled, 0)
  assert.equal(m.pushed, 0)
})

test('новые таблицы с одной стороны не теряются', () => {
  const m = mergeTables({ tasks: [r('a', 1)] }, { tasks: [r('a', 1)], events: [r('e', 1)] })
  assert.deepEqual(Object.keys(m.merged).sort(), ['events', 'tasks'])
  assert.equal(m.toWrite.events.length, 1)
})

test('отпечаток не зависит от порядка записей и ключей', () => {
  const a = { tasks: [r('a', 1, { x: 1, y: 2 }), r('b', 2)], notes: [] }
  const b = { tasks: [r('b', 2), { y: 2, updatedAt: 1, x: 1, id: 'a' }] }
  assert.equal(tablesHash(a), tablesHash(b))
  assert.notEqual(tablesHash(a), tablesHash({ tasks: [r('a', 1, { x: 1, y: 3 }), r('b', 2)] }))
})
