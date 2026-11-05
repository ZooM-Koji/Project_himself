import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconChevron, IconDumbbell } from '../components/Icons'
import PageHead from '../components/PageHead'
import Sheet from '../components/Sheet'
import Sparkline from '../components/Sparkline'
import { formatIsoLong, plural } from '../lib/dates'
import { formatSet, GROUP_LABEL, gymTips, history, tonnage, workSets } from '../lib/gym'
import { addGoal, deleteGoal, logBodyWeight, startWorkout, useBodyLog, useExercises, useGoals, useWorkouts, withSuggestedWeights } from '../lib/gymData'
import { isoDate } from '../lib/schedule'

const fmt = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',')

export default function Gym() {
  const navigate = useNavigate()
  const workouts = useWorkouts()
  const exercises = useExercises()
  const body = useBodyLog()
  const goals = useGoals()
  const [weight, setWeight] = useState('')
  const [goalSheet, setGoalSheet] = useState(false)
  const [showAll, setShowAll] = useState(false)
  if (!workouts) return null

  const now = new Date()
  const last = workouts[0]
  const tips = gymTips(now, workouts, exercises)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const weekAgo = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  const thisWeek = workouts.filter((w) => w.date >= weekAgo && w.items.some((i) => workSets(i).length)).length

  // упражнения, по которым есть история, — свежие сверху
  const progress = [...new Set(workouts.flatMap((w) => w.items.map((i) => i.exerciseId)))]
    .map((id) => ({ id, ex: byId.get(id), h: history(id, workouts) }))
    .filter((x) => x.ex && x.h.length)
    .sort((a, b) => b.h[b.h.length - 1].date.localeCompare(a.h[a.h.length - 1].date))

  const go = async (copy?: (typeof workouts)[number]) => navigate(`/gym/w/${await startWorkout(copy && withSuggestedWeights(copy, workouts, exercises))}`)
  const saveWeight = async () => {
    const v = parseFloat(weight.replace(',', '.'))
    if (v > 20 && v < 400) {
      await logBodyWeight(v)
      setWeight('')
    }
  }
  const month = body.filter((b) => b.date >= isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)))
  const shown = showAll ? workouts : workouts.slice(0, 5)

  return (
    <>
      <PageHead title="Зал" back="/life" />
      <div className="card gym-start">
        <p className="muted">
          {last ? `Последняя: ${formatIsoLong(last.date).toLowerCase()}` : 'Тренировок пока нет'} · на этой неделе: {thisWeek}
        </p>
        <div className="sheet-actions" style={{ marginTop: 10 }}>
          <button className="pill primary" onClick={() => go()}>
            <IconDumbbell size={18} /> Начать тренировку
          </button>
          {last && last.items.length > 0 && (
            <button className="pill" onClick={() => go(last)}>
              Повторить прошлую{last.title ? ` («${last.title}»)` : ''}
            </button>
          )}
        </div>
      </div>

      {tips.length > 0 && (
        <>
          <h2 className="section-title">Советы</h2>
          <div className="stack" style={{ gap: 8 }}>
            {tips.map((t) => (
              <div key={t.id} className="card tip tip-info">
                <p style={{ color: 'var(--text)' }}>{t.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {progress.length > 0 && (
        <>
          <h2 className="section-title">Прогресс по упражнениям</h2>
          <div className="card">
            {progress.map(({ id, ex, h }) => {
              const first = h[0].best
              const lastB = h[h.length - 1]
              const diff = lastB.best - first
              return (
                <Link key={id} to={`/gym/ex/${encodeURIComponent(id)}`} className="row-link">
                  <span className="row-text">
                    <span className="row-title">{ex!.name}</span>
                    <div className="muted" style={{ fontSize: 13 }}>
                      последний лучший: {formatSet(ex, lastB.top)} · тренировок: {h.length}
                    </div>
                  </span>
                  {h.length > 1 && <span className={`trend ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{diff > 0 ? `+${fmt(diff)}` : fmt(diff)}</span>}
                  <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
                </Link>
              )
            })}
          </div>
        </>
      )}

      <h2 className="section-title">
        Цели
        <button className="link-btn" onClick={() => setGoalSheet(true)}>
          + Цель
        </button>
      </h2>
      <div className="card">
        {goals.length === 0 ? (
          <p className="muted">Например: «Жим лёжа — 80 кг». Прогресс считается по расчётному максимуму на 1 повтор.</p>
        ) : (
          goals.map((g) => {
            const ex = byId.get(g.exerciseId)
            const h = history(g.exerciseId, workouts)
            const best = Math.max(0, ...h.map((x) => x.best))
            const pct = Math.min(100, Math.round((best / g.target) * 100))
            return (
              <div key={g.id} className="goal-row">
                <div className="wi-head">
                  <b>
                    {ex?.name ?? 'Упражнение'} — {fmt(g.target)}
                    {ex?.kind === 'weight' ? ' кг' : ''}
                  </b>
                  <button className="link-btn" style={{ color: 'var(--text-2)' }} onClick={() => confirm('Убрать цель?') && deleteGoal(g.id)}>
                    ✕
                  </button>
                </div>
                <div className={`load ${pct >= 100 ? 'load-free' : 'load-normal'}`}>
                  <div className="load-bar" style={{ flex: 1 }}>
                    <i style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : undefined }} />
                  </div>
                  <span>{pct >= 100 ? 'достигнута!' : `${pct}% · сейчас ${fmt(best)}`}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <h2 className="section-title">Вес тела</h2>
      <div className="card stack" style={{ gap: 10 }}>
        <div className="quick-row">
          <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveWeight()} placeholder={body.length ? `Сегодня, кг (было ${fmt(body[body.length - 1].weight)})` : 'Сегодня, кг'} />
          <button className="pill small primary" onClick={saveWeight}>
            Записать
          </button>
        </div>
        {month.length >= 2 && (
          <p className="muted" style={{ fontSize: 13 }}>
            За 30 дней: {month[month.length - 1].weight - month[0].weight >= 0 ? '+' : ''}
            {fmt(month[month.length - 1].weight - month[0].weight)} кг
          </p>
        )}
        {body.length > 0 && <Sparkline values={body.slice(-60).map((b) => b.weight)} labels={body.slice(-60).map((b) => b.date.split('-').reverse().slice(0, 2).join('.'))} unit=" кг" />}
      </div>

      <h2 className="section-title">История</h2>
      {workouts.length === 0 ? (
        <div className="card">
          <p className="muted">Здесь появятся тренировки. Нажми «Начать тренировку» — добавляй упражнения и отмечай подходы прямо в зале.</p>
        </div>
      ) : (
        <div className="card">
          {shown.map((w) => {
            const names = w.items.map((i) => byId.get(i.exerciseId)?.name).filter(Boolean)
            const groups = [...new Set(w.items.map((i) => byId.get(i.exerciseId)?.group).filter(Boolean))] as (keyof typeof GROUP_LABEL)[]
            const sets = w.items.reduce((s, i) => s + workSets(i).length, 0)
            return (
              <Link key={w.id} to={`/gym/w/${w.id}`} className="row-link">
                <span className="row-text">
                  <span className="row-title">
                    {formatIsoLong(w.date)}
                    {w.title ? ` · ${w.title}` : ''}
                  </span>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {groups.map((g) => GROUP_LABEL[g]).join(', ') || 'пусто'} · {sets} {plural(sets, ['подход', 'подхода', 'подходов'])}
                    {tonnage(w) ? ` · ${Math.round(tonnage(w))} кг` : ''}
                  </div>
                  {names.length > 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {names.slice(0, 4).join(', ')}
                      {names.length > 4 ? '…' : ''}
                    </div>
                  )}
                </span>
                <IconChevron size={18} style={{ color: 'var(--text-2)' }} />
              </Link>
            )
          })}
          {workouts.length > 5 && (
            <button className="link-btn" style={{ marginTop: 8 }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Свернуть' : `Все тренировки (${workouts.length})`}
            </button>
          )}
        </div>
      )}

      <p className="muted" style={{ fontSize: 12, margin: '16px 4px' }}>
        Советы — общие правила силовых тренировок (прогрессия веса, разгрузка, объём), не медицинские рекомендации. Если что-то болит —
        лучше к врачу или тренеру.
      </p>

      {goalSheet && <GoalSheet onClose={() => setGoalSheet(false)} />}
    </>
  )
}

function GoalSheet({ onClose }: { onClose: () => void }) {
  const exercises = useExercises().filter((e) => e.kind !== 'time')
  const [exId, setExId] = useState(exercises[0]?.id ?? '')
  const [target, setTarget] = useState('')
  const v = parseFloat(target.replace(',', '.'))
  const ex = exercises.find((e) => e.id === exId)
  return (
    <Sheet title="Новая цель" onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Упражнение</span>
          <select className="input" value={exId} onChange={(e) => setExId(e.target.value)}>
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{ex?.kind === 'bodyweight' ? 'Цель — повторов за подход' : 'Цель — вес на 1 повтор, кг'}</span>
          <input className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={ex?.kind === 'bodyweight' ? '15' : '80'} />
        </label>
      </div>
      <div className="sheet-actions">
        <button
          className="pill primary"
          disabled={!(v > 0)}
          onClick={async () => {
            await addGoal(exId, v)
            onClose()
          }}
        >
          Сохранить
        </button>
      </div>
    </Sheet>
  )
}
