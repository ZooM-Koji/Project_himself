// Зал: упражнения, расчёты и советы по прогрессии. Чистые функции — тесты в gym.test.ts.
// Советы — общие правила силовых тренировок (двойная прогрессия, разгрузка при застое,
// 10–20 рабочих подходов на группу мышц в неделю), не медицинские рекомендации.

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'abs' | 'cardio'

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  abs: 'Пресс',
  cardio: 'Кардио',
}

export interface Exercise {
  id: string
  name: string
  group: MuscleGroup
  /** weight — с отягощением; bodyweight — свой вес (вес — дополнительный); time — секунды (планка) */
  kind: 'weight' | 'bodyweight' | 'time'
  /** Диапазон повторений для двойной прогрессии */
  reps: [number, number]
  /** Шаг прибавки веса, кг */
  step: number
  custom?: boolean
}

const E = (id: string, name: string, group: MuscleGroup, kind: Exercise['kind'], reps: [number, number], step: number): Exercise => ({ id: `ex:${id}`, name, group, kind, reps, step })

/** Базовые упражнения (постоянные id — одинаковые на всех устройствах). */
export const DEFAULT_EXERCISES: Exercise[] = [
  E('bench', 'Жим штанги лёжа', 'chest', 'weight', [5, 8], 2.5),
  E('db-bench', 'Жим гантелей лёжа', 'chest', 'weight', [8, 12], 2),
  E('incline', 'Жим на наклонной скамье', 'chest', 'weight', [6, 10], 2.5),
  E('dips', 'Отжимания на брусьях', 'chest', 'bodyweight', [6, 12], 2.5),
  E('pushups', 'Отжимания от пола', 'chest', 'bodyweight', [10, 25], 0),
  E('flyes', 'Разводка гантелей', 'chest', 'weight', [10, 15], 1),
  E('pullups', 'Подтягивания', 'back', 'bodyweight', [5, 12], 2.5),
  E('row', 'Тяга штанги в наклоне', 'back', 'weight', [6, 10], 2.5),
  E('lat', 'Тяга верхнего блока', 'back', 'weight', [8, 12], 2.5),
  E('cable-row', 'Тяга горизонтального блока', 'back', 'weight', [8, 12], 2.5),
  E('deadlift', 'Становая тяга', 'back', 'weight', [3, 6], 5),
  E('squat', 'Приседания со штангой', 'legs', 'weight', [5, 8], 5),
  E('leg-press', 'Жим ногами', 'legs', 'weight', [8, 12], 10),
  E('lunges', 'Выпады', 'legs', 'weight', [8, 12], 2),
  E('rdl', 'Румынская тяга', 'legs', 'weight', [6, 10], 5),
  E('leg-ext', 'Разгибания ног', 'legs', 'weight', [10, 15], 2.5),
  E('calves', 'Подъёмы на носки', 'legs', 'weight', [10, 20], 5),
  E('ohp', 'Жим штанги стоя', 'shoulders', 'weight', [5, 8], 2.5),
  E('db-press', 'Жим гантелей сидя', 'shoulders', 'weight', [8, 12], 2),
  E('raises', 'Махи гантелями в стороны', 'shoulders', 'weight', [12, 20], 1),
  E('curl', 'Подъём штанги на бицепс', 'biceps', 'weight', [8, 12], 2.5),
  E('hammer', 'Молотки', 'biceps', 'weight', [8, 12], 1),
  E('skull', 'Французский жим', 'triceps', 'weight', [8, 12], 2.5),
  E('pushdown', 'Разгибания на блоке', 'triceps', 'weight', [10, 15], 2.5),
  E('plank', 'Планка', 'abs', 'time', [30, 90], 0),
  E('crunch', 'Скручивания', 'abs', 'bodyweight', [12, 25], 0),
  E('leg-raise', 'Подъём ног в висе', 'abs', 'bodyweight', [8, 15], 0),
  E('run', 'Бег / дорожка (минуты)', 'cardio', 'time', [10, 40], 0),
]

export interface SetEntry {
  w: number // кг (для свого веса — дополнительный, обычно 0)
  r: number // повторения (для time — секунды или минуты)
  done: boolean
}
export interface WorkoutItem {
  exerciseId: string
  sets: SetEntry[]
  note?: string
}
export interface WorkoutLike {
  id: string
  date: string // YYYY-MM-DD
  items: WorkoutItem[]
  deleted?: boolean
}

/** Расчётный максимум на 1 повтор (формула Эпли). Для упражнений без веса — просто повторы. */
export function e1rm(w: number, r: number): number {
  if (r <= 0) return 0
  if (w <= 0) return r
  return r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10
}

/** Засчитанные подходы: отмеченные «сделано», а если ничего не отмечено — все с повторами. */
export function workSets(item: WorkoutItem): SetEntry[] {
  const done = item.sets.filter((s) => s.done && s.r > 0)
  return done.length ? done : item.sets.filter((s) => s.r > 0)
}

export interface Session {
  date: string
  workoutId: string
  sets: SetEntry[]
  best: number // лучший e1RM за тренировку
  top: SetEntry // лучший подход
}

/** История упражнения: по одной записи на тренировку, от старых к новым. */
export function history(exerciseId: string, workouts: WorkoutLike[]): Session[] {
  const out: Session[] = []
  for (const w of [...workouts].filter((x) => !x.deleted).sort((a, b) => a.date.localeCompare(b.date))) {
    const sets = w.items.filter((i) => i.exerciseId === exerciseId).flatMap(workSets)
    if (!sets.length) continue
    const top = sets.reduce((a, b) => (e1rm(b.w, b.r) > e1rm(a.w, a.r) ? b : a))
    out.push({ date: w.date, workoutId: w.id, sets, best: e1rm(top.w, top.r), top })
  }
  return out
}

const fmtKg = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',')

export interface Suggestion {
  kind: 'start' | 'up' | 'same' | 'down' | 'deload'
  text: string
  weight?: number
  reps?: number
}

/**
 * Совет на следующую тренировку по «двойной прогрессии»:
 * все рабочие подходы на верхней границе диапазона → прибавить вес на шаг;
 * какой-то подход ниже нижней границы → чуть сбавить вес; иначе — тот же вес, +1 повтор.
 * Три тренировки подряд без роста лучшего результата → разгрузка (−10 %).
 */
export function suggestNext(ex: Exercise, sessions: Session[]): Suggestion {
  if (!sessions.length) return { kind: 'start', text: `Начни с веса, который поднимаешь ${ex.reps[1]} раз с запасом в 2 повтора. Техника важнее веса.` }
  const last = sessions[sessions.length - 1]
  const [lo, hi] = ex.reps

  if (sessions.length >= 4) {
    const prevBest = Math.max(...sessions.slice(0, -3).map((s) => s.best))
    const recent = Math.max(...sessions.slice(-3).map((s) => s.best))
    if (recent <= prevBest && ex.kind === 'weight') {
      const w = Math.round((last.top.w * 0.9) / 2.5) * 2.5
      return { kind: 'deload', weight: w, text: `Три тренировки без роста — похоже на застой. Сделай лёгкую неделю: ${fmtKg(w)} кг (−10 %), потом возвращайся. Помогают сон, еда и смена диапазона повторений.` }
    }
  }

  if (ex.kind === 'time') {
    const t = Math.max(...last.sets.map((s) => s.r))
    return { kind: 'up', reps: t + (ex.group === 'cardio' ? 2 : 5), text: `В прошлый раз ${t}. Попробуй немного дольше: ${t + (ex.group === 'cardio' ? 2 : 5)}.` }
  }

  const working = last.sets.filter((s) => s.w === last.top.w)
  const minReps = Math.min(...working.map((s) => s.r))

  if (ex.kind === 'bodyweight' && last.top.w === 0) {
    if (minReps >= hi) {
      return ex.step
        ? { kind: 'up', weight: ex.step, text: `Все подходы по ${hi}+ — пора добавить вес: пояс или рюкзак на ${fmtKg(ex.step)} кг.` }
        : { kind: 'up', text: `Все подходы по ${hi}+ — усложни вариант или добавь подход.` }
    }
    return { kind: 'same', reps: minReps + 1, text: `Свой вес: добей до ${minReps + 1}+ повторов в каждом подходе (цель — ${hi}).` }
  }

  if (minReps >= hi) {
    const w = last.top.w + ex.step
    return { kind: 'up', weight: w, reps: lo, text: `Все подходы на ${fmtKg(last.top.w)} кг по ${hi}+ — прибавь вес: ${fmtKg(w)} кг на ${lo}–${hi} повторов.` }
  }
  if (minReps < lo) {
    const w = Math.max(0, last.top.w - ex.step)
    return { kind: 'down', weight: w, reps: lo, text: `Был подход меньше ${lo} повторов. Оставь ${fmtKg(last.top.w)} кг и попробуй ещё раз, а если снова не выйдет — ${fmtKg(w)} кг.` }
  }
  return { kind: 'same', weight: last.top.w, reps: minReps + 1, text: `Тот же вес ${fmtKg(last.top.w)} кг — постарайся сделать на 1 повтор больше (до ${hi}), потом прибавим.` }
}

export interface GymTip {
  id: string
  text: string
}

/** Советы по всей программе: регулярность, забытые группы мышц, объём за неделю. */
export function gymTips(now: Date, workouts: WorkoutLike[], exercises: Exercise[]): GymTip[] {
  const tips: GymTip[] = []
  const alive = workouts.filter((w) => !w.deleted && w.items.some((i) => workSets(i).length))
  if (!alive.length) return [{ id: 'first', text: 'Начни первую тренировку — дальше я буду подсказывать, когда прибавлять вес.' }]
  const day = (d: string) => Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)).getTime()) / 864e5)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const last = alive.map((w) => w.date).sort().pop()!
  if (day(last) >= 7) tips.push({ id: `gap:${last}`, text: `Последняя тренировка была ${day(last)} дн. назад. Даже короткая тренировка лучше пропуска — начни с привычных весов.` })

  // группы мышц: когда тренировались и сколько подходов за 7 дней
  const lastByGroup = new Map<MuscleGroup, string>()
  const weekSets = new Map<MuscleGroup, number>()
  for (const w of alive) {
    for (const it of w.items) {
      const ex = byId.get(it.exerciseId)
      if (!ex || ex.group === 'cardio') continue
      const n = workSets(it).length
      if (!n) continue
      if ((lastByGroup.get(ex.group) ?? '') < w.date) lastByGroup.set(ex.group, w.date)
      if (day(w.date) < 7) weekSets.set(ex.group, (weekSets.get(ex.group) ?? 0) + n)
    }
  }
  const forgotten = [...lastByGroup].filter(([, d]) => day(d) >= 8 && day(d) <= 45).map(([g]) => GROUP_LABEL[g].toLowerCase())
  if (forgotten.length) tips.push({ id: `forgot:${forgotten.join(',')}`, text: `Давно не было: ${forgotten.join(', ')}. Для роста каждую группу стоит тренировать хотя бы раз в неделю.` })
  const big: MuscleGroup[] = ['chest', 'back', 'legs']
  const few = big.filter((g) => lastByGroup.has(g) && (weekSets.get(g) ?? 0) > 0 && (weekSets.get(g) ?? 0) < 6).map((g) => GROUP_LABEL[g].toLowerCase())
  if (few.length) tips.push({ id: `few:${few.join(',')}`, text: `За неделю мало рабочих подходов на ${few.join(', ')} (меньше 6). Для роста обычно советуют 10–20 подходов на группу в неделю.` })
  const many = [...weekSets].filter(([, n]) => n > 25).map(([g]) => GROUP_LABEL[g].toLowerCase())
  if (many.length) tips.push({ id: `many:${many.join(',')}`, text: `Очень много подходов на ${many.join(', ')} за неделю (больше 25). Следи за восстановлением: сон, еда, день отдыха.` })
  return tips
}

/** Подход для показа: «60×8», свой вес — «8 повт.» или «+10×8», время — «60». */
export function formatSet(ex: Pick<Exercise, 'kind'> | undefined, s: Pick<SetEntry, 'w' | 'r'>): string {
  const w = String(Math.round(s.w * 100) / 100).replace('.', ',')
  if (ex?.kind === 'time') return `${s.r}`
  if (ex?.kind === 'bodyweight') return s.w > 0 ? `+${w}×${s.r}` : `${s.r} повт.`
  return `${w}×${s.r}`
}

/** Тоннаж тренировки: сумма вес × повторы по засчитанным подходам. */
export function tonnage(w: WorkoutLike): number {
  return w.items.reduce((s, i) => s + workSets(i).reduce((a, x) => a + x.w * x.r, 0), 0)
}
