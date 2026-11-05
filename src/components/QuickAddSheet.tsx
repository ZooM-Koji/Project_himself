import { useState } from 'react'
import { useSubjects, useTasks, type TaskDraft } from '../lib/tasks'
import QuickTaskInput from './QuickTaskInput'
import Sheet from './Sheet'
import TaskEditor from './TaskEditor'
import EventEditor from './EventEditor'
import ManualLessonEditor from './ManualLessonEditor'
import PasteScheduleSheet from './PasteScheduleSheet'

/** Кнопка «+»: быстрое задание одной строкой (или подробная форма). */
export default function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const subjects = useSubjects(useTasks())
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [added, setAdded] = useState(0)
  const [event, setEvent] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [paste, setPaste] = useState(false)
  const [life, setLife] = useState(false)

  if (draft) return <TaskEditor draft={life ? { ...draft, area: 'life', list: draft.list ?? '' } : draft} subjects={subjects} onClose={onClose} />
  if (event) return <EventEditor onClose={onClose} />
  if (lesson) return <ManualLessonEditor onClose={onClose} />
  if (paste) return <PasteScheduleSheet onClose={onClose} />

  return (
    <Sheet title={life ? 'Новое дело' : 'Новое задание'} onClose={onClose}>
      <div className="segmented" style={{ marginBottom: 10 }}>
        <button className={!life ? 'on' : ''} onClick={() => setLife(false)}>
          Учёба
        </button>
        <button className={life ? 'on' : ''} onClick={() => setLife(true)}>
          Личное
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Напиши одной строкой — срок и предмет я пойму сам: «эссе по истории к 15 ноября», «лаба по цифровой культуре завтра».
      </p>
      <QuickTaskInput key={String(life)} subjects={subjects} autoFocus onAdded={() => setAdded((n) => n + 1)} onMore={setDraft} life={life ? { list: '' } : undefined} />
      {added > 0 && <p className="note note-sky" style={{ marginTop: 10 }}>Добавлено: {added}. Можно ввести ещё.</p>}
      <div className="sheet-actions">
        <button className="pill" onClick={() => setEvent(true)}>
          + Событие (репетиция, собрание…)
        </button>
        <button className="pill" onClick={() => setPaste(true)}>
          + Расписание из сообщения
        </button>
        <button className="pill" onClick={() => setLesson(true)}>
          + Пара вручную
        </button>
      </div>
    </Sheet>
  )
}
