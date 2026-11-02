import { useState } from 'react'
import { useSubjects, useTasks, type TaskDraft } from '../lib/tasks'
import QuickTaskInput from './QuickTaskInput'
import Sheet from './Sheet'
import TaskEditor from './TaskEditor'
import EventEditor from './EventEditor'
import ManualLessonEditor from './ManualLessonEditor'

/** Кнопка «+»: быстрое задание одной строкой (или подробная форма). */
export default function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const subjects = useSubjects(useTasks())
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [added, setAdded] = useState(0)
  const [event, setEvent] = useState(false)
  const [lesson, setLesson] = useState(false)

  if (draft) return <TaskEditor draft={draft} subjects={subjects} onClose={onClose} />
  if (event) return <EventEditor onClose={onClose} />
  if (lesson) return <ManualLessonEditor onClose={onClose} />

  return (
    <Sheet title="Новое задание" onClose={onClose}>
      <p className="muted" style={{ marginBottom: 10 }}>
        Напиши одной строкой — срок и предмет я пойму сам: «эссе по истории к 15 ноября», «лаба по цифровой культуре завтра».
      </p>
      <QuickTaskInput subjects={subjects} autoFocus onAdded={() => setAdded((n) => n + 1)} onMore={setDraft} />
      {added > 0 && <p className="note note-sky" style={{ marginTop: 10 }}>Добавлено: {added}. Можно ввести ещё.</p>}
      <div className="sheet-actions">
        <button className="pill" onClick={() => setEvent(true)}>
          + Событие (репетиция, собрание…)
        </button>
        <button className="pill" onClick={() => setLesson(true)}>
          + Пара вручную
        </button>
      </div>
    </Sheet>
  )
}
