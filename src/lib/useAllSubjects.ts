import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useSchedule } from './schedule'
import { useSubjectRecords } from './subjects'

/** Все предметы: из расписания, из заданий, из конспектов и добавленные вручную. */
export function useAllSubjects(): string[] {
  const { file } = useSchedule()
  const records = useSubjectRecords()
  const extra = useLiveQuery(async () => {
    const t = await db.tasks.filter((x) => !x.deleted && !!x.subject).toArray()
    const n = await db.notes.filter((x) => !x.deleted && !!x.subject).toArray()
    return [...t.map((x) => x.subject), ...n.map((x) => x.subject)]
  }, [])
  const set = new Set<string>()
  for (const l of file?.lessons ?? []) set.add(l.subject)
  for (const s of records.keys()) set.add(s)
  for (const s of extra ?? []) set.add(s)
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}
