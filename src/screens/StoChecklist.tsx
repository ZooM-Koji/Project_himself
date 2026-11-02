import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import { IconBack } from '../components/Icons'
import { db, kvGet, kvSet } from '../lib/db'
import { STO_ITEMS } from '../lib/sto'
import { updateTask, useTasks } from '../lib/tasks'

const FREE_KEY = 'sto.free' // галочки без привязки к заданию (только на этом устройстве)

export default function StoChecklist() {
  const [params, setParams] = useSearchParams()
  const taskId = params.get('task') ?? ''
  const tasks = (useTasks() ?? []).filter((t) => t.status !== 'done' || t.id === taskId)
  const task = useLiveQuery(() => (taskId ? db.tasks.get(taskId) : undefined), [taskId])
  const free = useLiveQuery(() => kvGet<string[]>(FREE_KEY), []) ?? []
  const checked = new Set(taskId ? (task?.stoChecks ?? []) : free)

  const toggle = async (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    if (taskId) await updateTask(taskId, { stoChecks: [...next] })
    else await kvSet(FREE_KEY, [...next])
  }
  const reset = async () => {
    if (!confirm('Снять все галочки?')) return
    if (taskId) await updateTask(taskId, { stoChecks: [] })
    else await kvSet(FREE_KEY, [])
  }

  const groups = [...new Set(STO_ITEMS.map((i) => i.group))]
  const done = STO_ITEMS.filter((i) => checked.has(i.id)).length
  const pct = Math.round((done / STO_ITEMS.length) * 100)

  return (
    <>
      <header className="page-head">
        <Link to="/study" className="icon-btn" aria-label="Назад">
          <IconBack size={20} />
        </Link>
        <h1 style={{ flex: 1, fontSize: 22 }}>Оформление по СТО</h1>
      </header>

      <div className="card stack" style={{ gap: 10 }}>
        <label className="field">
          <span>Для какой работы</span>
          <select className="input" value={taskId} onChange={(e) => setParams(e.target.value ? { task: e.target.value } : {}, { replace: true })}>
            <option value="">— без привязки —</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.subject ? ` (${t.subject})` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className={`load ${pct === 100 ? 'load-free' : 'load-normal'}`} style={pct === 100 ? { color: 'var(--ok)' } : undefined}>
          <div className="load-bar" style={{ flex: 1 }}>
            <i style={{ width: `${pct}%`, background: pct === 100 ? 'var(--ok)' : undefined }} />
          </div>
          <span>
            {done} из {STO_ITEMS.length}
            {pct === 100 ? ' — можно сдавать' : ''}
          </span>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g}>
          <h2 className="section-title">{g}</h2>
          <div className="card">
            {STO_ITEMS.filter((i) => i.group === g).map((i) => (
              <label key={i.id} className={`check-row${checked.has(i.id) ? ' on' : ''}`}>
                <input type="checkbox" checked={checked.has(i.id)} onChange={() => toggle(i.id)} />
                <span className="cbx" aria-hidden="true">
                  {checked.has(i.id) ? '✓' : ''}
                </span>
                <span>
                  <b>{i.text}</b>
                  {i.hint && <span className="muted check-hint">{i.hint}</span>}
                  {i.general && <span className="muted check-hint">Общее требование — сверь с методичкой кафедры.</span>}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      <p className="muted" style={{ fontSize: 13, margin: '14px 4px' }}>
        Цифры (поля, шрифт, интервалы) — из СТО САФУ 2026. Если у преподавателя свои требования — впиши их в карточку предмета.
      </p>
      <button className="pill" onClick={reset}>
        Снять все галочки
      </button>
    </>
  )
}
