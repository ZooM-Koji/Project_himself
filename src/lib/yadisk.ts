// Яндекс Диск: вход (OAuth, «неявный» способ — без серверов и секретов) и файл синхронизации.
// Доступ только к папке приложения на Диске (cloud_api:disk.app_folder): остальные файлы
// Максима приложение не видит. Файл лежит в «Приложения/<название приложения>/».
import group from '../group.json'
import { kvGet, kvSet } from './db'

const API = 'https://cloud-api.yandex.net/v1/disk'
export const SYNC_PATH = 'app:/zachetka-sync.json'
const K_TOKEN = 'sync.yandexToken'
const K_CLIENT = 'sync.yandexClientId'
const LS_STATE = 'zachetka.oauthState'
const LS_HANDOFF = 'zachetka.oauthToken' // oauth.html кладёт сюда токен, приложение забирает

export const redirectUri = () => new URL(`${import.meta.env.BASE_URL}oauth.html`, location.origin).href

const configClientId = (group as { sync?: { yandexClientId?: string } }).sync?.yandexClientId ?? ''

export async function getClientId(): Promise<string> {
  return configClientId || ((await kvGet<string>(K_CLIENT)) ?? '')
}
export const setClientId = (id: string) => kvSet(K_CLIENT, id.trim())
export const hasConfigClientId = () => !!configClientId

export const getToken = () => kvGet<string>(K_TOKEN)
export const forgetToken = () => kvSet(K_TOKEN, '')

/** Перейти на страницу входа Яндекса. Вернёмся на oauth.html с токеном в адресе. */
export async function startLogin() {
  const clientId = await getClientId()
  const state = crypto.randomUUID()
  try {
    localStorage.setItem(LS_STATE, state)
  } catch {
    /* без localStorage вход не получится — oauth.html сообщит */
  }
  const u = new URL('https://oauth.yandex.ru/authorize')
  u.searchParams.set('response_type', 'token')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirectUri())
  u.searchParams.set('state', state)
  location.href = u.href
}

/** Если только что вернулись со входа — забрать токен из localStorage в базу. */
export async function takeLoginHandoff(): Promise<boolean> {
  try {
    const t = localStorage.getItem(LS_HANDOFF)
    if (!t) return false
    localStorage.removeItem(LS_HANDOFF)
    await kvSet(K_TOKEN, t)
    return true
  } catch {
    return false
  }
}

export class DiskError extends Error {
  constructor(
    public kind: 'auth' | 'network' | 'cors' | 'quota' | 'server',
    message: string,
  ) {
    super(message)
  }
}

async function api(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' } })
  } catch {
    throw new DiskError('network', 'Нет связи с Яндекс Диском')
  }
  if (res.status === 401 || res.status === 403) throw new DiskError('auth', 'Яндекс просит войти заново')
  if (res.status === 507) throw new DiskError('quota', 'На Яндекс Диске закончилось место')
  return res
}

/** Время изменения файла на Диске (или null, если файла ещё нет). */
export async function remoteModified(token: string): Promise<string | null> {
  const res = await api(token, `/resources?path=${encodeURIComponent(SYNC_PATH)}&fields=modified`)
  if (res.status === 404) return null
  if (!res.ok) throw new DiskError('server', `Яндекс Диск ответил ${res.status}`)
  return ((await res.json()) as { modified: string }).modified
}

/** Скачать файл синхронизации. null — файла ещё нет (первый раз). */
export async function downloadSync(token: string): Promise<{ text: string; modified: string } | null> {
  const modified = await remoteModified(token)
  if (!modified) return null
  const res = await api(token, `/resources/download?path=${encodeURIComponent(SYNC_PATH)}`)
  if (!res.ok) throw new DiskError('server', `Яндекс Диск ответил ${res.status}`)
  const { href } = (await res.json()) as { href: string }
  let file: Response
  try {
    file = await fetch(href) // ссылка уже подписана — без заголовка авторизации
  } catch {
    throw new DiskError('cors', 'Яндекс не дал скачать файл из браузера')
  }
  if (!file.ok) throw new DiskError('server', `Скачивание: ответ ${file.status}`)
  return { text: await file.text(), modified }
}

/** Загрузить файл синхронизации (перезаписать). */
export async function uploadSync(token: string, text: string) {
  const res = await api(token, `/resources/upload?path=${encodeURIComponent(SYNC_PATH)}&overwrite=true`)
  if (!res.ok) throw new DiskError('server', `Яндекс Диск ответил ${res.status}`)
  const { href, method } = (await res.json()) as { href: string; method?: string }
  let put: Response
  try {
    // Без Authorization и своих заголовков: ссылка одноразовая и уже подписана,
    // а лишний заголовок ломает проверку CORS на сервере загрузки.
    put = await fetch(href, { method: method || 'PUT', body: new Blob([text]) })
  } catch {
    throw new DiskError('cors', 'Яндекс не дал загрузить файл из браузера')
  }
  if (put.status === 413 || put.status === 507) throw new DiskError('quota', 'На Яндекс Диске не хватает места')
  if (!put.ok) throw new DiskError('server', `Загрузка: ответ ${put.status}`)
}
