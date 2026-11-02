// Уведомления: пока приложение открыто (или недавно было) — проверяем раз в минуту, что напомнить;
// утренняя сводка — через фоновое обновление Chrome (public/sw-reminders.js), если браузер разрешит.
import { useLiveQuery } from 'dexie-react-hooks'
import { eventEnd } from './activities'
import { db, kvGet, kvSet } from './db'
import { DEFAULT_NOTIFY, dueReminders, type NotifySettings, type Reminder } from './reminders'
import { loadVisibleLessons } from './schedule'

const K_SETTINGS = 'notify.settings'
const K_SENT = 'notify.sent'
export const DIGEST_TAG = 'zachetka-digest'

export async function getNotifySettings(): Promise<NotifySettings> {
  return { ...DEFAULT_NOTIFY, ...((await kvGet<NotifySettings>(K_SETTINGS)) ?? {}) }
}
export const saveNotifySettings = (s: NotifySettings) => kvSet(K_SETTINGS, s)
export function useNotifySettings() {
  return useLiveQuery(getNotifySettings, [])
}

export const notifySupported = () => typeof Notification !== 'undefined'
export const permission = () => (notifySupported() ? Notification.permission : 'denied')

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Показать уведомление (через service worker — так оно работает и на Android). */
export async function showReminder(r: Reminder) {
  if (permission() !== 'granted') return
  const base = import.meta.env.BASE_URL
  const opts: NotificationOptions = { body: r.body, tag: r.id, icon: `${base}icon-192.png`, badge: `${base}icon-192.png`, data: { url: base + r.url } }
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) await reg.showNotification(r.title, opts)
  else new Notification(r.title, opts)
}

async function alreadySent(): Promise<string[]> {
  return (await kvGet<string[]>(K_SENT)) ?? []
}

let queue: Promise<void> = Promise.resolve()

/**
 * Проверить и отправить то, что пора. Каждое напоминание — один раз.
 * Проверки идут строго по очереди: иначе две одновременные (таймер + возврат в приложение)
 * обе не видели бы, что напоминание уже отправлено, и оно пришло бы дважды.
 */
export function checkReminders(now?: Date): Promise<void> {
  queue = queue.then(() => checkOnce(now ?? new Date())).catch(() => {})
  return queue
}

async function checkOnce(now: Date) {
  const s = await getNotifySettings()
  if (!s.enabled || permission() !== 'granted') return
  const [lessons, events, tasks, sent] = await Promise.all([
    loadVisibleLessons(),
    db.events.filter((e) => !e.deleted).toArray(),
    db.tasks.filter((t) => !t.deleted).toArray(),
    alreadySent(),
  ])
  const fresh = dueReminders(
    now,
    s,
    lessons,
    events.map((e) => ({ ...e, end: eventEnd(e) })),
    tasks,
  ).filter((r, i, all) => !sent.includes(r.id) && all.findIndex((x) => x.id === r.id) === i)
  for (const r of fresh) await showReminder(r)
  if (fresh.length) await kvSet(K_SENT, [...sent, ...fresh.map((r) => r.id)].slice(-300))
}

/** Попросить Chrome будить приложение для утренней сводки (только установленное приложение). */
export async function registerDigest(on: boolean): Promise<'ok' | 'unsupported' | 'denied'> {
  try {
    const reg = (await navigator.serviceWorker?.ready) as ServiceWorkerRegistration & {
      periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> }
    }
    if (!reg?.periodicSync) return 'unsupported'
    if (!on) {
      await reg.periodicSync.unregister(DIGEST_TAG)
      return 'ok'
    }
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (st.state !== 'granted') return 'denied'
    await reg.periodicSync.register(DIGEST_TAG, { minInterval: 12 * 60 * 60 * 1000 })
    return 'ok'
  } catch {
    return 'unsupported'
  }
}

let started = false
export function startNotifyTicker() {
  if (started) return
  started = true
  const tick = () => void checkReminders()
  setTimeout(tick, 5000)
  setInterval(tick, 60_000)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick())
}

/** Ссылка «создать событие» в Google Календаре для срока задания. */
export function googleCalendarUrl(t: { title: string; subject: string; dueDate?: string; dueTime?: string; notes?: string }): string | null {
  if (!t.dueDate) return null
  const d = t.dueDate.replace(/-/g, '')
  let dates: string
  if (t.dueTime) {
    // событие «последние полчаса до срока»
    const [h, m] = t.dueTime.split(':').map(Number)
    const startMin = Math.max(0, h * 60 + m - 30)
    const hhmm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}${String(x % 60).padStart(2, '0')}00`
    dates = `${d}T${hhmm(startMin)}/${d}T${hhmm(h * 60 + m)}`
  } else {
    const next = new Date(+t.dueDate.slice(0, 4), +t.dueDate.slice(5, 7) - 1, +t.dueDate.slice(8, 10) + 1)
    dates = `${d}/${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`
  }
  const u = new URL('https://calendar.google.com/calendar/render')
  u.searchParams.set('action', 'TEMPLATE')
  u.searchParams.set('text', `Срок: ${t.title}`)
  u.searchParams.set('dates', dates)
  u.searchParams.set('ctz', 'Europe/Moscow')
  u.searchParams.set('details', [t.subject && `Предмет: ${t.subject}`, t.notes].filter(Boolean).join('\n') + '\n\nИз «Зачётки»')
  return u.href
}
