import { useState } from 'react'
import { checkReminders, notifySupported, permission, registerDigest, requestPermission, saveNotifySettings, showReminder, useNotifySettings } from '../lib/notify'
import type { NotifySettings } from '../lib/reminders'

const ITEMS: [keyof NotifySettings, string][] = [
  ['pairs', 'За 10 минут до пары'],
  ['events', 'За 15 минут до события'],
  ['deadlines', 'Сроки: за час до срока, утром — «сегодня сдать», вечером — «завтра срок, а не начато»'],
  ['digest', 'Утренняя сводка дня (если Chrome разрешит фоновое обновление)'],
]

/** Настройки → Напоминания. Честно про ограничения веб-приложения. */
export default function NotifyCard() {
  const s = useNotifySettings()
  const [perm, setPerm] = useState(permission())
  const [digestState, setDigestState] = useState<string | null>(null)
  if (!s) return null

  const update = async (patch: Partial<NotifySettings>) => {
    const next = { ...s, ...patch }
    await saveNotifySettings(next)
    if ('digest' in patch || 'enabled' in patch) {
      const r = await registerDigest(next.enabled && next.digest)
      setDigestState(r === 'ok' ? null : r === 'denied' ? 'Chrome пока не разрешил фоновое обновление — сводка придёт, когда откроешь приложение.' : 'Этот браузер не умеет фоновое обновление — утренняя сводка недоступна.')
    }
    void checkReminders()
  }

  const enable = async () => {
    const p = await requestPermission()
    setPerm(p)
    if (p === 'granted') await update({ enabled: true })
  }

  const test = () =>
    showReminder({ id: `test:${Date.now()}`, title: 'Проверка: напоминания работают', body: 'Так будут выглядеть напоминания «Зачётки».', url: '#/settings' })

  return (
    <div className="card">
      <h2 className="card-title">Напоминания</h2>
      {!notifySupported() ? (
        <p className="muted">Этот браузер не умеет показывать уведомления.</p>
      ) : perm === 'denied' ? (
        <p className="note note-warn">
          Уведомления запрещены в браузере. Включить: значок замка (или «⋮ → Настройки сайта») → «Уведомления» → «Разрешить».
        </p>
      ) : !s.enabled || perm !== 'granted' ? (
        <button className="pill primary" onClick={enable}>
          Включить напоминания
        </button>
      ) : (
        <>
          {ITEMS.map(([k, label]) => (
            <label key={k} className={`check-row${s[k] ? ' on' : ''}`}>
              <input type="checkbox" checked={!!s[k]} onChange={(e) => update({ [k]: e.target.checked })} />
              <span className="cbx" aria-hidden="true">
                {s[k] ? '✓' : ''}
              </span>
              <span>{label}</span>
            </label>
          ))}
          {digestState && <p className="muted" style={{ fontSize: 13 }}>{digestState}</p>}
          <div className="sheet-actions">
            <button className="pill" onClick={test}>
              Проверить
            </button>
            <button className="pill" onClick={() => update({ enabled: false })}>
              Выключить
            </button>
          </div>
        </>
      )}

      <details className="howto">
        <summary>Почему иногда не приходят и как сделать надёжно</summary>
        <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
          У веб-приложения нет своего сервера, поэтому «Зачётка» напоминает, пока она открыта или недавно была открыта —
          Android усыпляет её в фоне. Надёжные способы:
        </p>
        <ol>
          <li>
            <b>Пары</b> — подпишись на календарь пар (карточка «Календарь и виджет» выше), затем в Google Календаре:
            «Настройки» → календарь «Пары 171606» → «Уведомления» → «За 15 минут». Если пункта нет — приложение ICSx⁵ напомнит
            само (в файле уже есть напоминания за 15 минут).
          </li>
          <li>
            <b>Дедлайны</b> — в карточке задания кнопка «В Google Календарь»: откроется готовое событие со сроком, нажми
            «Сохранить» — напомнит Google.
          </li>
        </ol>
      </details>
    </div>
  )
}
