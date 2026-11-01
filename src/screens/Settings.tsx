import PageHead from '../components/PageHead'
import { GROUP_NUMBER, GROUP_OID, INSTITUTE } from '../config'
import { useTheme, type ThemeChoice } from '../lib/theme'

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

export default function Settings() {
  const [theme, setTheme] = useTheme()

  return (
    <>
      <PageHead title="Настройки" right={<span />} />
      <div className="stack">
        <div className="card">
          <h2 className="section-title" style={{ marginTop: 0, marginBottom: 6 }}>
            Группа
          </h2>
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
          <h2 className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
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
          <h2 className="section-title" style={{ marginTop: 0, marginBottom: 6 }}>
            Данные
          </h2>
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
