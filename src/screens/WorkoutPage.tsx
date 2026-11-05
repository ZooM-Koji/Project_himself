import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ExercisePicker from '../components/ExercisePicker'
import { IconBack, IconTimer, IconTrash } from '../components/Icons'
import { formatIsoLong } from '../lib/dates'
import { e1rm, formatSet, history, suggestNext, tonnage, type Exercise } from '../lib/gym'
import { deleteWorkout, editItems, saveWorkout, useExercises, useWorkout, useWorkouts, type Workout } from '../lib/gymData'

type Item = Workout['items'][number]
const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) && v >= 0 ? v : 0
}
const fmt = (x: number) => String(x).replace('.', ',')
const REST = 90

export default function WorkoutPage() {
  const { id } = useParams()
  const w = useWorkout(id)
  const all = useWorkouts() ?? []
  const exercises = useExercises()
  const navigate = useNavigate()
  const [picker, setPicker] = useState(false)
  const [rest, setRest] = useState<number | null>(null)

  // таймер отдыха
  useEffect(() => {
    if (rest === null) return
    if (rest <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200])
      } catch {
        /* нет вибрации — ничего страшного */
      }
      setRest(null)
      return
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000)
    return () => clearTimeout(t)
  }, [rest])

  if (w === undefined) return null
  if (w === null || w.deleted)
    return (
      <div className="card empty" style={{ marginTop: 24 }}>
        <h3>Тренировка не найдена</h3>
        <Link to="/gym" className="link-btn">
          В зал
        </Link>
      </div>
    )

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const others = all.filter((x) => x.id !== w.id && x.date <= w.date)
  // все правки — функцией от свежих данных (см. editItems)
  const updateItem = (i: number, fn: (it: Item) => Item) => editItems(w.id, (items) => items.map((x, j) => (j === i ? fn(x) : x)))

  const addExercise = (exerciseId: string) => {
    setPicker(false)
    const ex = byId.get(exerciseId)
    const prev = history(exerciseId, others)
    const sug = ex ? suggestNext(ex, prev) : undefined
    const last = prev[prev.length - 1]
    // сразу 3 подхода с весом из совета (или прошлым)
    const weight = sug?.weight ?? last?.top.w ?? 0
    const reps = sug?.reps ?? last?.top.r ?? 0
    void editItems(w.id, (items) => [...items, { exerciseId, sets: Array.from({ length: 3 }, () => ({ w: weight, r: reps, done: false })) }])
  }

  const remove = async () => {
    if (confirm('Удалить тренировку?')) {
      await deleteWorkout(w.id)
      navigate('/gym')
    }
  }

  const doneSets = w.items.reduce((s, i) => s + i.sets.filter((x) => x.done).length, 0)

  return (
    <>
      <header className="page-head">
        <Link to="/gym" className="icon-btn" aria-label="Назад в зал">
          <IconBack size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <input className="note-title" style={{ fontSize: 20 }} value={w.title} onChange={(e) => saveWorkout(w.id, { title: e.target.value })} placeholder="Тренировка (например, «Верх»)" />
          <input type="date" className="date-plain" value={w.date} onChange={(e) => e.target.value && saveWorkout(w.id, { date: e.target.value })} aria-label="Дата" />
        </div>
        <button className="icon-btn" aria-label="Удалить тренировку" onClick={remove}>
          <IconTrash size={18} />
        </button>
      </header>

      <div className="stack">
        {w.items.map((it, i) => {
          const ex = byId.get(it.exerciseId)
          return <ItemCard key={i} it={it} ex={ex} others={others} onChange={(fn) => updateItem(i, fn)} onRemove={() => editItems(w.id, (items) => items.filter((_, j) => j !== i))} onDone={() => setRest(REST)} />
        })}
        {!w.items.length && <p className="muted" style={{ textAlign: 'center', margin: '14px 0' }}>Добавь первое упражнение — подходы заполню по прошлой тренировке.</p>}
        <button className="pill primary" style={{ justifyContent: 'center' }} onClick={() => setPicker(true)}>
          + Упражнение
        </button>
        <label className="field">
          <span>Заметка (самочувствие, сон, что учесть)</span>
          <textarea className="input" rows={2} value={w.note} onChange={(e) => saveWorkout(w.id, { note: e.target.value })} />
        </label>
        <p className="muted" style={{ textAlign: 'center' }}>
          {formatIsoLong(w.date)} · подходов сделано: {doneSets} · тоннаж: {Math.round(tonnage(w))} кг
        </p>
        <button className="pill" style={{ justifyContent: 'center' }} onClick={() => navigate('/gym')}>
          Готово
        </button>
      </div>

      {rest !== null && (
        <button className="rest-timer" onClick={() => setRest(null)} aria-label="Остановить таймер отдыха">
          <IconTimer size={18} /> Отдых {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
        </button>
      )}
      {picker && <ExercisePicker onPick={addExercise} onClose={() => setPicker(false)} />}
    </>
  )
}

/** Поле для числа: пока вводишь «62,» — не теряет запятую; сохраняет, когда число введено целиком. */
function NumInput({ value, onCommit, label, decimal }: { value: number; onCommit: (v: number) => void; label: string; decimal?: boolean }) {
  const [text, setText] = useState(value ? fmt(value) : '')
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value ? fmt(value) : '')
  }, [value, focused])
  return (
    <input
      className="input"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder="0"
      aria-label={label}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '')
        setText(t)
        if (/^\d+([.,]\d+)?$/.test(t)) onCommit(decimal ? num(t) : Math.round(num(t)))
        else if (t === '') onCommit(0)
      }}
      onBlur={() => {
        setFocused(false)
        onCommit(decimal ? num(text) : Math.round(num(text)))
      }}
    />
  )
}

function ItemCard({ it, ex, others, onChange, onRemove, onDone }: { it: Item; ex?: Exercise; others: Workout[]; onChange: (fn: (it: Item) => Item) => void; onRemove: () => void; onDone: () => void }) {
  const prev = history(it.exerciseId, others)
  const last = prev[prev.length - 1]
  const best = Math.max(0, ...prev.map((p) => p.best))
  const sug = ex ? suggestNext(ex, prev) : undefined
  const isTime = ex?.kind === 'time'
  const setSet = (j: number, patch: Partial<Item['sets'][number]>) => onChange((cur) => ({ ...cur, sets: cur.sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) }))

  return (
    <div className="card workout-item">
      <div className="wi-head">
        <Link to={`/gym/ex/${encodeURIComponent(it.exerciseId)}`} className="row-title">
          {ex?.name ?? 'Упражнение'}
        </Link>
        <button className="link-btn" style={{ color: 'var(--text-2)' }} onClick={() => confirm('Убрать упражнение из тренировки?') && onRemove()}>
          Убрать
        </button>
      </div>
      {last && (
        <p className="muted wi-last">
          В прошлый раз ({last.date.split('-').reverse().slice(0, 2).join('.')}): {last.sets.map((s) => formatSet(ex, s)).join(', ')}
        </p>
      )}
      {sug && <p className={`wi-sug sug-${sug.kind}`}>{sug.text}</p>}
      <div className={`sets${isTime ? ' time' : ''}`}>
        <div className="set-row set-head">
          <span>#</span>
          {!isTime && <span>{ex?.kind === 'bodyweight' ? '+кг' : 'кг'}</span>}
          <span>{isTime ? 'время' : 'повт.'}</span>
          <span />
        </div>
        {it.sets.map((s, j) => {
          const record = s.done && best > 0 && e1rm(s.w, s.r) > best
          return (
            <div key={j} className={`set-row${s.done ? ' done' : ''}`}>
              <span className="set-n">{j + 1}</span>
              {!isTime && <NumInput value={s.w} decimal label="Вес" onCommit={(v) => setSet(j, { w: v })} />}
              <NumInput value={s.r} label="Повторы" onCommit={(v) => setSet(j, { r: v })} />
              <button
                className={`set-check${s.done ? ' on' : ''}`}
                aria-label={s.done ? 'Отменить подход' : 'Подход сделан'}
                onClick={() => {
                  setSet(j, { done: !s.done })
                  if (!s.done) onDone()
                }}
              >
                ✓
              </button>
              {record && <span className="pr-badge">рекорд!</span>}
            </div>
          )
        })}
      </div>
      <div className="sheet-actions" style={{ marginTop: 8 }}>
        <button className="pill small" onClick={() => onChange((cur) => ({ ...cur, sets: [...cur.sets, { ...(cur.sets[cur.sets.length - 1] ?? { w: 0, r: 0 }), done: false }] }))}>
          + подход
        </button>
        {it.sets.length > 0 && (
          <button className="pill small" onClick={() => onChange((cur) => ({ ...cur, sets: cur.sets.slice(0, -1) }))}>
            − подход
          </button>
        )}
      </div>
    </div>
  )
}
