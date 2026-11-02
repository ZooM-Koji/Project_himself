import { useState } from 'react'
import { addProject, KIND_LABEL, updateProject, type Project, type ProjectKind } from '../lib/activities'
import Sheet from './Sheet'

export default function ProjectEditor({ project, onClose, onCreated }: { project?: Project; onClose: () => void; onCreated?: (id: string) => void }) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [kind, setKind] = useState<ProjectKind>(project?.kind ?? 'council')
  const [notes, setNotes] = useState(project?.notes ?? '')

  const save = async () => {
    if (!title.trim()) return
    if (project) await updateProject(project.id, { title: title.trim(), kind, notes })
    else {
      const id = await addProject(title.trim(), kind)
      if (notes.trim()) await updateProject(id, { notes })
      onCreated?.(id)
    }
    onClose()
  }

  return (
    <Sheet title={project ? 'Проект' : 'Новый проект'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Название</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Студсовет ВШЭУиП, «Школа актива», Посвят…" autoFocus={!project} />
        </label>
        <div className="field">
          <span>Тип</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => (
              <button key={k} type="button" className={`pill small${kind === k ? ' active' : ''}`} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Заметки (можно Markdown: списки, ссылки)</span>
          <textarea className="input" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'Кто отвечает, контакты, чат…\n- [ ] купить реквизит'} />
        </label>
      </div>
      <div className="sheet-actions">
        <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!title.trim()} onClick={save}>
          Сохранить
        </button>
      </div>
    </Sheet>
  )
}
