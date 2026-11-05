import { useState } from 'react'
import { GROUP_NUMBER } from '../config'
import group from '../group.json'
import { groupLabel, isWholeGroup, seriesKey, useSchedule } from '../lib/schedule'

/** Адрес файла календаря на сайте (собирается при каждой публикации). */
export const calendarUrl = () => new URL(`${import.meta.env.BASE_URL}calendar/${GROUP_NUMBER}.ics`, location.origin).href
/** webcal:// — так подписку понимают календарные приложения (ICSx⁵, Samsung, Apple) */
export const webcalUrl = () => calendarUrl().replace(/^https?:/, 'webcal:')
/** Ссылка «подписаться» в Google Календаре — открывает Google с готовым адресом */
export const googleSubscribeUrl = () => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl())}`

const configGroups: Record<string, string> = (group as { calendar?: { myGroups?: Record<string, string> } }).calendar?.myGroups ?? {}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Подписка на календарь для виджета Google Календаря.
 * Если выбор потоков в приложении не совпадает с тем, что знает календарь на сайте, —
 * даём готовый текст, который Максим пересылает Claude.
 */
export default function CalendarCard() {
  const s = useSchedule()
  const [copied, setCopied] = useState<'url' | 'claude' | null>(null)
  const url = calendarUrl()

  // Серии (предмет + тип), где есть параллельные потоки/подгруппы.
  const altSeries = new Map<string, Set<string>>()
  for (const l of s.file?.lessons ?? []) {
    if (isWholeGroup(l)) continue
    altSeries.set(seriesKey(l), (altSeries.get(seriesKey(l)) ?? new Set()).add(l.group))
  }
  const multi = [...altSeries].filter(([, g]) => g.size > 1).map(([k]) => k)
  const chosen = new Map(s.rules.filter((r) => r.kind === 'mine').map((r) => [r.target, r.group ?? '']))
  const notChosen = multi.filter((k) => !chosen.has(k))
  const differs = [...chosen].filter(([k, g]) => configGroups[k] !== g)

  const claudeText =
    'Зачётка → календарь: пропиши мои потоки в src/group.json → calendar.myGroups:\n' +
    JSON.stringify(Object.fromEntries(chosen), null, 2)

  const doCopy = async (what: 'url' | 'claude') => {
    if (await copy(what === 'url' ? url : claudeText)) {
      setCopied(what)
      setTimeout(() => setCopied(null), 2500)
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Календарь и виджет</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Пары можно видеть в Google Календаре и в его виджете на рабочем столе — расписание там обновляется само.
      </p>
      <div className="quick-row">
        <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Адрес календаря" />
        <button className="pill small" onClick={() => doCopy('url')}>
          {copied === 'url' ? 'Готово' : 'Копировать'}
        </button>
      </div>

      {(differs.length > 0 || notChosen.length > 0) && (
        <div className="note note-warn" style={{ marginTop: 12 }}>
          {differs.length > 0 ? (
            <>
              <b>Календарь пока не знает твои потоки</b> ({differs.map(([k, g]) => `${k.split('|')[0]}: ${groupLabel(g)}`).join('; ')}). Там
              такие пары помечены «поток не выбран». Скопируй текст и отправь его Claude — он внесёт выбор в настройки сайта.
              <button className="pill small primary" style={{ marginTop: 8 }} onClick={() => doCopy('claude')}>
                {copied === 'claude' ? 'Скопировано' : 'Скопировать для Claude'}
              </button>
            </>
          ) : null}
          {notChosen.length > 0 && (
            <p style={{ marginTop: differs.length ? 8 : 0 }}>
              Ещё не выбраны: {notChosen.map((k) => k.split('|')[0] + ` (${k.split('|')[1].toLowerCase()})`).join(', ')}. Выбери в «Парах» — нажми на
              карточку «выбери свою».
            </p>
          )}
        </div>
      )}

      <div className="sheet-actions">
        <a className="pill primary small" href={googleSubscribeUrl()} target="_blank" rel="noreferrer noopener">
          Подписаться в Google Календаре
        </a>
        <a className="pill small" href={webcalUrl()}>
          Открыть в приложении-календаре
        </a>
      </div>

      <details className="howto">
        <summary>Как поставить виджет на телефон — по шагам</summary>
        <ol>
          <li>
            <b>Подписаться (один раз, лучше с компьютера).</b> Открой «Зачётку» на компьютере → «Настройки» → кнопка «Подписаться в
            Google Календаре» → войди в тот же Google-аккаунт, что на телефоне → «Добавить». Слева в «Других календарях» появится
            «Пары {GROUP_NUMBER}». С телефона: в Chrome ⋮ → «Версия для ПК», потом нажми эту кнопку. В приложении Google Календаря
            на телефоне подписаться по ссылке нельзя — так устроил Google.
          </li>
          <li>
            <b>Включить на телефоне (без этого календарь пустой!).</b> Приложение Google Календарь → ☰ меню → внизу «Настройки» →
            нажми на свой аккаунт или «Показать больше» → «Пары {GROUP_NUMBER}» → включи <b>«Синхронизация»</b>. Потом в ☰ меню
            поставь галочку у «Пары {GROUP_NUMBER}».
          </li>
          <li>
            <b>Виджет.</b> Долгое нажатие на пустом месте рабочего стола → «Виджеты» → «Google Календарь» → <b>«Расписание»</b>.
          </li>
        </ol>
        <p className="muted" style={{ fontSize: 13 }}>
          Если и после этого пусто — подожди час: Google загружает новую подписку не сразу. Проверить можно на компьютере на
          calendar.google.com: если там пары видны, дело в шаге 2 на телефоне.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Другой путь без Google: приложение <b>ICSx⁵</b> (бесплатно в F-Droid) — нажми «Открыть в приложении-календаре», оно
          подпишется прямо с телефона и будет обновлять каждый час; виджет — любой календарный.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Google обновляет подписки сам, но редко: от нескольких часов до суток (ускорить это нельзя). Поэтому срочные замены
          смотри в «Зачётке» — там пометка «изменено» появляется сразу. В календарь попадают только пары, без заданий.
        </p>
      </details>
    </div>
  )
}
