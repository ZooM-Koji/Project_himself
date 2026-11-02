import { useLiveQuery } from 'dexie-react-hooks'
import { eventEnd, useEvents } from './activities'
import { kvGet, kvSet } from './db'
import { useSchedule } from './schedule'
import { useTasks } from './tasks'
import { buildTips, type Tip } from './tips'

const K = 'tips.dismissed'

/** Скрыть подсказку (хранится только на этом устройстве). */
export async function dismissTip(id: string) {
  const cur = (await kvGet<string[]>(K)) ?? []
  await kvSet(K, [...cur.filter((x) => x !== id), id].slice(-300))
}

export function useTips(now: Date): Tip[] {
  const { lessons } = useSchedule()
  const events = useEvents()
  const tasks = useTasks() ?? []
  const dismissed = new Set(useLiveQuery(() => kvGet<string[]>(K), []) ?? [])
  return buildTips(
    now,
    lessons,
    events.map((e) => ({ date: e.date, start: e.start, end: eventEnd(e), title: e.title })),
    tasks,
  ).filter((t) => !dismissed.has(t.id))
}
