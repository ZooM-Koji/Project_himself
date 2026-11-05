import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconBack } from '../components/Icons'
import Sparkline from '../components/Sparkline'
import { db } from '../lib/db'
import { formatIsoLong } from '../lib/dates'
import { formatSet, GROUP_LABEL, history, suggestNext } from '../lib/gym'
import { useExercises, useWorkouts } from '../lib/gymData'

const fmt = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',')

export default function ExercisePage() {
  const id = decodeURIComponent(useParams().id ?? '')
  const ex = useExercises().find((e) => e.id === id)
  const workouts = useWorkouts() ?? []
  const [edit, setEdit] = useState(false)
  if (!ex) return null
  const h = history(id, workouts)
  const sug = suggestNext(ex, h)
  const best = h.reduce((a, s) => (s.best > (a?.best ?? 0) ? s : a), h[0])
  const isTime = ex.kind === 'time'

  const saveRange = async (lo: number, hi: number, step: number) => {
    await db.gymExercises.put({ ...ex, reps: [lo, hi], step, updatedAt: Date.now(), deleted: false })
    setEdit(false)
  }

  return (
    <>
      <header className="page-head">
        <Link to="/gym" className="icon-btn" aria-label="Назад в зал">
          <IconBack size={20} />
        </Link>
        <h1 style={{ flex: 1, fontSize: 22 }}>{ex.name}</h1>
      </header>
      <div className="card stack" style={{ gap: 8 }}>
        <div className="quick-preview" style={{ marginTop: 0 }}>
          <span className="chip">{GROUP_LABEL[ex.group]}</span>
          {!isTime && (
            <span className="chip chip-muted">
              диапазон {ex.reps[0]}–{ex.reps[1]} повт.{ex.step ? ` · шаг ${fmt(ex.step)} кг` : ''}
            </span>
          )}
          {!isTime && (
            <button className="link-btn" onClick={() => setEdit(!edit)}>
              Изменить
            </button>
          )}
        </div>
        {edit && <RangeEditor lo={ex.reps[0]} hi={ex.reps[1]} step={ex.step} onSave={saveRange} />}
        <p className={`wi-sug sug-${sug.kind}`}>{sug.text}</p>
        {best && (
          <p className="muted">
            Лучший подход: <b>{formatSet(ex, best.top)}</b> ({formatIsoLong(best.date).toLowerCase()})
            {!isTime && best.top.w > 0 && ` · расчётный максимум на 1 повтор ≈ ${fmt(best.best)} кг`}
          </p>
        )}
      </div>

      {h.length >= 2 && (
        <>
          <h2 className="section-title">{isTime ? 'Время' : ex.kind === 'bodyweight' && !h.some((s) => s.top.w) ? 'Повторы' : 'Расчётный максимум, кг'}</h2>
          <div className="card">
            <Sparkline values={h.map((s) => s.best)} labels={h.map((s) => s.date.split('-').reverse().slice(0, 2).join('.'))} />
          </div>
        </>
      )}

      <h2 className="section-title">История</h2>
      <div className="card">
        {h.length === 0 ? (
          <p className="muted">Пока нет записей — добавь упражнение в тренировку.</p>
        ) : (
          [...h].reverse().map((s) => (
            <Link key={s.workoutId} to={`/gym/w/${s.workoutId}`} className="row-link">
              <span className="row-text">
                <span className="row-title">{formatIsoLong(s.date)}</span>
                <div className="muted" style={{ fontSize: 13 }}>
                  {s.sets.map((x) => formatSet(ex, x)).join(', ')}
                </div>
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  )
}

function RangeEditor({ lo, hi, step, onSave }: { lo: number; hi: number; step: number; onSave: (lo: number, hi: number, step: number) => void }) {
  const [a, setA] = useState(String(lo))
  const [b, setB] = useState(String(hi))
  const [s, setS] = useState(String(step).replace('.', ','))
  const ok = +a > 0 && +b >= +a
  return (
    <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      <label className="field">
        <span>Повт. от</span>
        <input className="input" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} />
      </label>
      <label className="field">
        <span>до</span>
        <input className="input" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} />
      </label>
      <label className="field">
        <span>Шаг, кг</span>
        <input className="input" inputMode="decimal" value={s} onChange={(e) => setS(e.target.value)} />
      </label>
      <button className="pill small primary" disabled={!ok} onClick={() => onSave(+a, +b, parseFloat(s.replace(',', '.')) || 0)}>
        Сохранить
      </button>
    </div>
  )
}
