import { useState } from 'react'
import type { TaskLink } from '../lib/db'
import { saveSubject, SUBJECT_COLORS, subjectColor, type Subject } from '../lib/subjects'
import LinksField from './LinksField'
import Sheet from './Sheet'

/** Правка того, что Максим знает о предмете сам. */
export default function SubjectEditor({ name, rec, onClose }: { name: string; rec?: Subject; onClose: () => void }) {
  const [contacts, setContacts] = useState(rec?.contacts ?? '')
  const [requirements, setRequirements] = useState(rec?.requirements ?? '')
  const [notes, setNotes] = useState(rec?.notes ?? '')
  const [links, setLinks] = useState<TaskLink[]>(rec?.links ?? [])
  const [pending, setPending] = useState<string | null>(null)
  const [color, setColor] = useState(rec?.color)

  const save = async () => {
    await saveSubject(name, {
      contacts: contacts.trim(),
      requirements: requirements.trim(),
      notes: notes.trim(),
      links: pending ? [...links, { url: pending }] : links,
      color,
    })
    onClose()
  }

  const current = color ? SUBJECT_COLORS[color] : subjectColor(name)

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Контакты преподавателя</span>
          <textarea className="input" rows={2} value={contacts} onChange={(e) => setContacts(e.target.value)} placeholder="Почта, кафедра, часы консультаций…" />
        </label>
        <label className="field">
          <span>Требования</span>
          <textarea
            className="input"
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Зачёт или экзамен, баллы, что нужно сдать для допуска…"
          />
        </label>
        <label className="field">
          <span>Заметка</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="field">
          <span>Материалы — ссылки (Лань, методички, СДО…)</span>
          <LinksField links={links} onChange={setLinks} onPendingChange={setPending} />
        </div>
        <div className="field">
          <span>Цвет</span>
          <div className="color-row">
            {Object.entries(SUBJECT_COLORS).map(([k, c]) => (
              <button
                key={k}
                type="button"
                className={`color-dot${current === c ? ' on' : ''}`}
                style={{ background: c }}
                aria-label={k}
                onClick={() => setColor(k)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="sheet-actions">
        <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}>
          Сохранить
        </button>
      </div>
    </Sheet>
  )
}
