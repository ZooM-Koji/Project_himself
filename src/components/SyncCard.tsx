import { useEffect, useState } from 'react'
import { syncNow, useSyncState } from '../lib/sync'
import { forgetToken, getClientId, hasConfigClientId, redirectUri, setClientId, startLogin } from '../lib/yadisk'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/** Настройки → Синхронизация через Яндекс Диск. */
export default function SyncCard() {
  const st = useSyncState()
  const [clientId, setCid] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getClientId().then(setCid)
  }, [])

  const run = async () => {
    setBusy(true)
    await syncNow()
    setBusy(false)
  }
  const logout = async () => {
    if (confirm('Отключить Яндекс Диск на этом устройстве? Данные на устройстве и на Диске останутся.')) await forgetToken()
  }
  const saveCid = async () => {
    if (!/^[0-9a-f]{32}$/i.test(input.trim())) return alert('ClientID — это 32 символа из цифр и латинских букв a–f.')
    await setClientId(input)
    setCid(input.trim())
  }

  return (
    <div className="card">
      <h2 className="card-title">Синхронизация</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Телефон и компьютер обмениваются данными через твой Яндекс Диск. Приложение видит только свою папку на Диске
        («Приложения»), а не остальные файлы. Фото и файлы пока не синхронизируются — только задания, конспекты, предметы,
        события и т. д.
      </p>

      {clientId === null ? null : !clientId ? (
        <>
          <details className="howto" open>
            <summary>Один раз: зарегистрировать «Зачётку» в Яндексе (2 минуты)</summary>
            <ol>
              <li>
                Открой <a href="https://oauth.yandex.ru/client/new" target="_blank" rel="noreferrer">oauth.yandex.ru/client/new</a> и войди
                в свой Яндекс.
              </li>
              <li>Название — «Зачётка». Платформа — <b>«Веб-сервисы»</b>.</li>
              <li>
                Redirect URI — вставь ровно это:
                <input className="input" readOnly value={redirectUri()} onFocus={(e) => e.target.select()} style={{ marginTop: 6, fontSize: 14 }} />
              </li>
              <li>
                Доступ к данным: <b>«Яндекс Диск REST API» → «Доступ к папке приложения на Диске»</b>. Больше ничего не отмечай.
              </li>
              <li>Создай приложение и скопируй <b>ClientID</b> — вставь его ниже (на каждом устройстве) или пришли Claude, чтобы он прописал его в сайт.</li>
            </ol>
          </details>
          <div className="quick-row" style={{ marginTop: 8 }}>
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="ClientID (32 символа)" />
            <button className="pill small primary" onClick={saveCid}>
              Сохранить
            </button>
          </div>
        </>
      ) : !st?.token ? (
        <>
          <button className="pill primary" onClick={startLogin}>
            Войти через Яндекс
          </button>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Откроется страница Яндекса: там спросят разрешение на папку приложения. Пароль «Зачётка» не видит.
          </p>
          {!hasConfigClientId() && (
            <button className="link-btn" style={{ marginTop: 6 }} onClick={() => (setClientId(''), setCid(''))}>
              Сменить ClientID
            </button>
          )}
        </>
      ) : (
        <>
          <div className="kv">
            <span className="muted">Яндекс Диск</span>
            <b style={{ color: 'var(--ok)' }}>подключён</b>
          </div>
          {st.status && (
            <div className="kv">
              <span className="muted">Последняя синхронизация</span>
              <b>{fmt(st.status.at)}</b>
            </div>
          )}
          {st.status && <p className={`note ${st.status.ok ? 'note-sky' : 'note-warn'}`} style={{ marginTop: 8 }}>{st.status.message}</p>}
          <div className="sheet-actions">
            <button className="pill primary" disabled={busy} onClick={run}>
              {busy ? 'Синхронизирую…' : 'Синхронизировать сейчас'}
            </button>
            <button className="pill" onClick={logout}>
              Отключить
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Синхронизация идёт сама: при открытии приложения и через 20 секунд после изменений. На втором устройстве тоже нажми
            «Войти через Яндекс» — тем же аккаунтом.
          </p>
        </>
      )}
      {st?.status && !st.token && !st.status.ok && <p className="note note-warn" style={{ marginTop: 8 }}>{st.status.message}</p>}
    </div>
  )
}
