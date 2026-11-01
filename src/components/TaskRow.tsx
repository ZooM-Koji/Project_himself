import { formatDue } from '../lib/dates'
import { bucketOf, cycleStatus, STATUS_LABEL, type Task } from '../lib/tasks'
import { IconLink, IconNote } from './Icons'

function StatusIcon({ status }: { status: Task['status'] }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11" fill={status === 'done' ? 'var(--ok)' : 'none'} stroke={status === 'done' ? 'var(--ok)' : status === 'doing' ? 'var(--accent)' : 'var(--text-2)'} strokeWidth="2" />
      {status === 'doing' && <path d="M13 2a11 11 0 0 1 0 22z" fill="var(--accent)" />}
      {status === 'done' && <path d="m8 13.5 3.3 3.3L18.5 9.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

export default function TaskRow({ task, now, onOpen }: { task: Task; now: Date; onOpen: () => void }) {
  const overdue = bucketOf(task, now) === 'overdue'
  return (
    <div className={`task-row${task.status === 'done' ? ' done' : ''}`}>
      <button
        className="task-check"
        onClick={() => cycleStatus(task)}
        aria-label={`Статус: ${STATUS_LABEL[task.status]}. Нажми, чтобы сменить`}
        title={STATUS_LABEL[task.status]}
      >
        <StatusIcon status={task.status} />
      </button>
      <button className="task-body" onClick={onOpen}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {task.dueDate && (
            <span className={overdue ? 'due overdue' : 'due'}>{formatDue(task.dueDate, task.dueTime, now)}</span>
          )}
          {task.subject && <span className="task-subject">{task.subject}</span>}
          {task.status === 'doing' && <span className="badge">в работе</span>}
          {task.notes && <IconNote size={14} />}
          {task.links.length > 0 && <IconLink size={14} />}
        </span>
      </button>
    </div>
  )
}
