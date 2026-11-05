// «Зал»: работа с базой (тренировки, упражнения, вес тела, цели).
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BodyEntry, type GymGoal, type Workout } from './db'
import { DEFAULT_EXERCISES, history, suggestNext, type Exercise, type MuscleGroup } from './gym'
import { isoDate } from './schedule'

export type { Workout }

/** Стандартные упражнения + свои; запись в базе (изменённая/удалённая) важнее стандартной. */
export function useExercises(): Exercise[] {
  const rows = useLiveQuery(() => db.gymExercises.toArray(), []) ?? []
  const byId = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]))
  for (const r of rows) {
    if (r.deleted) byId.delete(r.id)
    else byId.set(r.id, { ...r, group: r.group as MuscleGroup })
  }
  return [...byId.values()]
}

export async function addExercise(e: Omit<Exercise, 'id' | 'custom'>): Promise<string> {
  const id = `my:${crypto.randomUUID()}`
  await db.gymExercises.put({ ...e, id, custom: true, updatedAt: Date.now(), deleted: false })
  return id
}

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => db.workouts.filter((w) => !w.deleted).toArray().then((a) => a.sort((x, y) => y.date.localeCompare(x.date) || y.createdAt - x.createdAt)), [])
}

export function useWorkout(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.workouts.get(id)) ?? null) : null), [id])
}

/**
 * «Повторить прошлую»: те же упражнения и подходы, но вес сразу по совету
 * (прибавить / сбавить / разгрузка) — чтобы не исправлять вручную.
 */
export function withSuggestedWeights(last: Workout, all: Workout[], exercises: Exercise[]): Workout {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return {
    ...last,
    items: last.items.map((it) => {
      const ex = byId.get(it.exerciseId)
      if (!ex || ex.kind === 'time') return it
      const sug = suggestNext(ex, history(it.exerciseId, all))
      if (sug.weight === undefined || sug.kind === 'same') return it
      const top = Math.max(...it.sets.map((s) => s.w))
      return { ...it, sets: it.sets.map((s) => (s.w === top ? { ...s, w: sug.weight!, r: sug.reps ?? s.r } : s)) }
    }),
  }
}

/** Новая тренировка (сегодня). copyFrom — повторить упражнения прошлой (подходы не отмечены). */
export async function startWorkout(copyFrom?: Workout): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.workouts.add({
    id,
    date: isoDate(new Date()),
    title: copyFrom?.title ?? '',
    items: (copyFrom?.items ?? []).map((i) => ({ exerciseId: i.exerciseId, sets: i.sets.filter((s) => s.r > 0).map((s) => ({ ...s, done: false })) })),
    note: '',
    createdAt: now,
    updatedAt: now,
    deleted: false,
  })
  return id
}

export async function saveWorkout(id: string, patch: Partial<Workout>) {
  await db.workouts.update(id, { ...patch, updatedAt: Date.now() })
}

export const deleteWorkout = (id: string) => saveWorkout(id, { deleted: true })

/**
 * Изменить упражнения тренировки от свежей версии из базы (в транзакции).
 * Иначе быстрые правки подряд перезаписывали бы друг друга старой копией.
 */
export async function editItems(id: string, fn: (items: Workout['items']) => Workout['items']) {
  await db.transaction('rw', db.workouts, async () => {
    const cur = await db.workouts.get(id)
    if (cur) await db.workouts.update(id, { items: fn(cur.items), updatedAt: Date.now() })
  })
}

export function useBodyLog(): BodyEntry[] {
  return useLiveQuery(() => db.bodyLog.filter((b) => !b.deleted).toArray().then((a) => a.sort((x, y) => x.date.localeCompare(y.date))), []) ?? []
}

/** Вес тела за день: одна запись на дату (повторный ввод в тот же день — заменяет). */
export async function logBodyWeight(weight: number, date = isoDate(new Date())) {
  const same = await db.bodyLog.where({ date }).filter((b) => !b.deleted).first()
  if (same) await db.bodyLog.update(same.id, { weight, updatedAt: Date.now() })
  else await db.bodyLog.add({ id: crypto.randomUUID(), date, weight, updatedAt: Date.now(), deleted: false })
}

export function useGoals(): GymGoal[] {
  return useLiveQuery(() => db.gymGoals.filter((g) => !g.deleted).toArray(), []) ?? []
}

export async function addGoal(exerciseId: string, target: number) {
  const now = Date.now()
  await db.gymGoals.add({ id: crypto.randomUUID(), exerciseId, target, createdAt: now, updatedAt: now, deleted: false })
}

export const deleteGoal = (id: string) => db.gymGoals.update(id, { deleted: true, updatedAt: Date.now() })
