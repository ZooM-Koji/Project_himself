import { useState } from 'react'
import PageHead from '../components/PageHead'
import { GROUP_NUMBER, GROUP_OID, INSTITUTE } from '../config'
import { db } from '../lib/db'
import { removeRule, syncSchedule, useSchedule, type SyncResult } from '../lib/schedule'
import { useTheme, type ThemeChoice } from '../lib/theme'

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

const SYNC_TEXT: Record<SyncResult, string> = {
  updated: 'Загружена новая версия расписания',
  same: 'Расписание не изменилось',
  offline: 'Нет связи — показана сохранённая копия',
  missing: 'На сайте пока нет файла расписания',
}

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '—'
const fmtDate = (iso: string) => iso.split('-').reverse().join('.')

export default function Settings() {
  const [theme, setTheme] = useTheme()
  const s = useSchedule()
  const [sync, setSync] = useState<SyncResult | 'busy' | null>(null)
  const mine = s.rules.filter((r) => r.kind === 'mine')
  const hidden = s.rules.filter((r) => r.kind === 'hide')

  const refresh = async () => {
    setSync('busy')
    setSync(await syncSchedule())
  }
  const showHidden = async () => {
    const now = Date.now()
    await db.scheduleRules.bulkPut(hidden.map((r) => ({ ...r, deleted: true, updatedAt: now })))
  }

  return (
    <>
      <PageHead title="Настройки" right={<span />} />
      <div className="stack">
        <div className="card">
          <h2 className="card-title">Группа</h2>
          <div className="kv">
            <span className="muted">Номер</span>
            <b>{GROUP_NUMBER}</b>
          </div>
          <div className="kv">
            <span className="muted">Школа</span>
            <b>{INSTITUTE}</b>
          </div>
          <div className="kv">
            <span className="muted">Код в РУЗ</span>
            <b>{GROUP_OID}</b>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Расписание</h2>
          <div className="kv">
            <span className="muted">Версия из РУЗ</span>
            <b>{fmt(s.file?.fetchedAt)}</b>
          </div>
          {s.file && (
            <div className="kv">
              <span className="muted">Опубликовано</span>
              <b>
                {fmtDate(s.file.range.from)} – {fmtDate(s.file.range.to)}
              </b>
            </div>
          )}
          <div className="kv">
            <span className="muted">Последняя проверка</span>
            <b>{fmt(s.checkedAt)}</b>
          </div>
          <button className="pill primary" style={{ marginTop: 10 }} disabled={sync === 'busy'} onClick={refresh}>
            {sync === 'busy' ? 'Проверяю…' : 'Проверить обновления'}
          </button>
          {sync && sync !== 'busy' && <p className="muted" style={{ marginTop: 8 }}>{SYNC_TEXT[sync]}</p>}
          <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            Сайт сам скачивает расписание из РУЗ 3 раза в день (6:17, 12:17, 18:17 по Москве).
          </p>
        </div>

        <div className="card">
          <h2 className="card-title">Мои потоки и подгруппы</h2>
          {mine.length === 0 ? (
            <p className="muted">
              Пока не выбраны. Нажми на пару с пометкой «выбери свою» в расписании — и останется только твоя группа.
            </p>
          ) : (
            mine.map((r) => (
              <div key={r.id} className="kv">
                <span>{r.label}</span>
                <button className="link-btn" onClick={() => removeRule(r.id)}>
                  Сбросить
                </button>
              </div>
            ))
          )}
          {hidden.length > 0 && (
            <div className="kv">
              <span>
                Скрыто пар: <b>{hidden.length}</b>
              </span>
              <button className="link-btn" onClick={showHidden}>
                Показать все
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 12 }}>
            Тема
          </h2>
          <div className="segmented" role="radiogroup" aria-label="Тема оформления">
            {THEMES.map((t) => (
              <button
                key={t.value}
                role="radio"
                aria-checked={theme === t.value}
                className={theme === t.value ? 'on' : ''}
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Данные</h2>
          <div className="kv">
            <span>Экспорт и импорт в файл</span>
            <span className="badge">этап 1.5</span>
          </div>
          <div className="kv">
            <span>Синхронизация через Яндекс Диск</span>
            <span className="badge">этап 5</span>
          </div>
        </div>

        <p className="muted" style={{ textAlign: 'center' }}>
          Зачётка · версия {__APP_VERSION__}
        </p>
      </div>
    </>
  )
}
