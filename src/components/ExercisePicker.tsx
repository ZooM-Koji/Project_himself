import { useState } from 'react'
import { GROUP_LABEL, type Exercise, type MuscleGroup } from '../lib/gym'
import { addExercise, useExercises } from '../lib/gymData'
import Sheet from './Sheet'

/** Выбор упражнения: поиск, группы мышц, своё упражнение. */
export default function ExercisePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const all = useExercises()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<MuscleGroup | ''>('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup>('chest')
  const [kind, setKind] = useState<Exercise['kind']>('weight')

  const needle = q.trim().toLowerCase()
  const list = all.filter((e) => (!group || e.group === group) && (!needle || e.name.toLowerCase().includes(needle)))

  const create = async () => {
    if (!name.trim()) return
    const id = await addExercise({ name: name.trim(), group: newGroup, kind, reps: kind === 'time' ? [30, 90] : [8, 12], step: kind === 'weight' ? 2.5 : 0 })
    onPick(id)
  }

  return (
    <Sheet title="Упражнение" onClose={onClose}>
      {!creating ? (
        <>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: жим, присед…" autoFocus />
          <div className="chips" style={{ marginTop: 8 }}>
            <button className={`pill small${!group ? ' active' : ''}`} onClick={() => setGroup('')}>
              Все
            </button>
            {(Object.keys(GROUP_LABEL) as MuscleGroup[]).map((g) => (
              <button key={g} className={`pill small${group === g ? ' active' : ''}`} onClick={() => setGroup(g)}>
                {GROUP_LABEL[g]}
              </button>
            ))}
          </div>
          <div className="picker-list">
            {list.map((e) => (
              <button key={e.id} className="row-link" onClick={() => onPick(e.id)}>
                <span className="row-text">
                  <span className="row-title">{e.name}</span>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {GROUP_LABEL[e.group]}
                    {e.custom ? ' · своё' : ''}
                  </div>
                </span>
              </button>
            ))}
            {!list.length && <p className="muted">Ничего не нашлось — добавь своё.</p>}
          </div>
          <button className="pill" style={{ marginTop: 10 }} onClick={() => (setCreating(true), setName(q))}>
            + Своё упражнение
          </button>
        </>
      ) : (
        <div className="form">
          <label className="field">
            <span>Название</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Тяга гантели одной рукой" autoFocus />
          </label>
          <label className="field">
            <span>Группа мышц</span>
            <select className="input" value={newGroup} onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}>
              {(Object.keys(GROUP_LABEL) as MuscleGroup[]).map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g]}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Что записываем</span>
            <div className="segmented">
              {(
                [
                  ['weight', 'Вес × повторы'],
                  ['bodyweight', 'Свой вес'],
                  ['time', 'Время'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="sheet-actions">
            <button className="pill primary" disabled={!name.trim()} onClick={create}>
              Добавить
            </button>
            <button className="link-btn" onClick={() => setCreating(false)}>
              Назад к списку
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
