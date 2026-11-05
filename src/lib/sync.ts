// Синхронизация телефон ↔ компьютер через один JSON-файл на Яндекс Диске.
// Скачать → слить по updatedAt → записать к себе → загрузить, если что-то изменилось.
// Если, пока мы сливали, файл на Диске поменялся (синхронизировалось другое устройство) — повторяем.
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { BACKUP_APP, BACKUP_FORMAT, makeBackup, type Backup } from './backup'
import { db, kvGet, kvSet } from './db'
import { mergeTables, tablesHash, type Tables } from './merge'
import { DiskError, downloadSync, forgetToken, getToken, remoteModified, takeLoginHandoff, uploadSync } from './yadisk'

/** Таблицы, которые синхронизируются (как в резервной копии, без файлов). */
const SYNCED = ['tasks', 'scheduleRules', 'subjects', 'notes', 'quickLinks', 'projects', 'events', 'refs', 'manualLessons', 'gymExercises', 'workouts', 'bodyLog', 'gymGoals'] as const

export interface SyncStatus {
  at: string // когда закончили
  ok: boolean
  message: string
  pulled?: number
  pushed?: number
}

const K_STATUS = 'sync.status'
let running: Promise<SyncStatus> | null = null
// Наши собственные записи в базу не должны запускать новую синхронизацию.
// Событие об изменении приходит не сразу после записи, поэтому окно — 2 секунды.
let ownWritesUntil = 0

async function saveStatus(s: SyncStatus) {
  await kvSet(K_STATUS, s)
  return s
}

async function once(token: string): Promise<SyncStatus> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await downloadSync(token)
    let remoteTables: Tables | null = null
    if (remote) {
      try {
        const data = JSON.parse(remote.text) as Backup
        if (data.app !== BACKUP_APP) throw new Error()
        if (data.format > BACKUP_FORMAT) return saveStatus({ at: new Date().toISOString(), ok: false, message: 'Файл на Диске от более новой версии — обнови приложение' })
        remoteTables = data.tables as unknown as Tables
      } catch {
        return saveStatus({ at: new Date().toISOString(), ok: false, message: 'Файл на Диске повреждён. Удали zachetka-sync.json в папке «Приложения» на Яндекс Диске — он создастся заново из данных этого устройства' })
      }
    }
    const local = (await makeBackup(false)).tables as unknown as Tables
    const pick = (t: Tables | null) => (t ? Object.fromEntries(SYNCED.map((n) => [n, t[n] ?? []])) : null)
    const { merged, toWrite, pulled, pushed } = mergeTables(pick(local)!, pick(remoteTables))

    if (pulled) {
      ownWritesUntil = Date.now() + 2000
      await db.transaction('rw', SYNCED.map((n) => db.table(n)), async () => {
        for (const [name, rows] of Object.entries(toWrite)) await db.table(name).bulkPut(rows)
      })
      ownWritesUntil = Date.now() + 2000
    }

    if (tablesHash(merged) !== tablesHash(pick(remoteTables))) {
      // Кто-то успел обновить файл, пока мы сливали? Тогда начинаем заново.
      const nowModified = await remoteModified(token)
      if (remote && nowModified !== remote.modified) continue
      const file: Backup = { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), tables: merged as unknown as Backup['tables'] }
      await uploadSync(token, JSON.stringify(file))
    }
    const parts = [pulled ? `получено ${pulled}` : '', pushed ? `отправлено ${pushed}` : ''].filter(Boolean)
    return saveStatus({ at: new Date().toISOString(), ok: true, message: parts.length ? `Готово: ${parts.join(', ')}` : 'Всё уже совпадает', pulled, pushed })
  }
  return saveStatus({ at: new Date().toISOString(), ok: false, message: 'Файл на Диске всё время меняется — попробуй через минуту' })
}

/** Синхронизировать сейчас. Возвращает статус (он же сохраняется в базе). */
export function syncNow(): Promise<SyncStatus> {
  running ??= (async () => {
    const token = await getToken()
    if (!token) return { at: new Date().toISOString(), ok: false, message: 'Яндекс Диск не подключён' }
    if (!navigator.onLine) return saveStatus({ at: new Date().toISOString(), ok: false, message: 'Нет интернета — синхронизирую, когда появится' })
    try {
      return await once(token)
    } catch (e) {
      if (e instanceof DiskError && e.kind === 'auth') await forgetToken()
      const msg =
        e instanceof DiskError && e.kind === 'cors'
          ? `${e.message}. Напиши об этом Claude — нужно другое решение.`
          : e instanceof Error
            ? e.message
            : 'Неизвестная ошибка'
      return saveStatus({ at: new Date().toISOString(), ok: false, message: msg })
    }
  })().finally(() => (running = null))
  return running
}

let timer: ReturnType<typeof setTimeout> | undefined
let lastAuto = 0
const AFTER_EDIT_MS = 20_000

/** Автосинхронизация: при запуске, при возврате в приложение, при появлении сети и через 20 с после правок. */
export async function startAutoSync() {
  // Вход в Яндекс в установленном приложении открывается в отдельном окне браузера:
  // токен приходит через localStorage, а окно «Зачётки» уже открыто. Забираем его сразу —
  // при запуске, при возврате в приложение и по событию storage (из другого окна).
  const handoff = async () => {
    if (await takeLoginHandoff()) void syncNow()
  }
  await handoff()
  window.addEventListener('storage', (e) => e.key === 'zachetka.oauthToken' && e.newValue && void handoff())
  window.addEventListener('focus', () => void handoff())
  const soon = (minGap: number) => {
    if (Date.now() - lastAuto < minGap) return
    lastAuto = Date.now()
    void getToken().then((t) => (t ? syncNow() : undefined))
  }
  setTimeout(() => soon(0), 3000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    void handoff()
    soon(2 * 60_000)
  })
  window.addEventListener('online', () => soon(0))
  Dexie.on('storagemutated', (parts) => {
    if (Date.now() < ownWritesUntil) return
    const touched = Object.keys(parts).some((k) => SYNCED.some((t) => k.startsWith(`idb://zachetka/${t}/`)))
    if (!touched) return
    clearTimeout(timer)
    timer = setTimeout(() => void getToken().then((t) => (t ? syncNow() : undefined)), AFTER_EDIT_MS)
  })
}

export function useSyncState() {
  return useLiveQuery(async () => ({ token: !!(await getToken()), status: await kvGet<SyncStatus>(K_STATUS) }), [])
}
