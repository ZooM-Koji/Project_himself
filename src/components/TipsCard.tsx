import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dismissTip, useTips } from '../lib/useTips'

/** «Советы» на главном экране: 3 самые важные подсказки, остальные — по кнопке. */
export default function TipsCard({ now }: { now: Date }) {
  const tips = useTips(now)
  const [all, setAll] = useState(false)
  if (tips.length === 0) return null
  const shown = all ? tips : tips.slice(0, 3)
  return (
    <section className="stack" style={{ gap: 8 }}>
      <h2 className="section-title">
        Советы
        {tips.length > 3 && (
          <button className="link-btn" onClick={() => setAll(!all)}>
            {all ? 'Меньше' : `Все (${tips.length})`}
          </button>
        )}
      </h2>
      {shown.map((t) => (
        <div key={t.id} className={`card tip tip-${t.tone}`}>
          <div className="tip-head">
            <b>{t.title}</b>
            <button className="tip-x" aria-label="Скрыть совет" onClick={() => dismissTip(t.id)}>
              ✕
            </button>
          </div>
          <p>{t.text}</p>
          {t.to && (
            <Link to={t.to} className="link-btn">
              Открыть →
            </Link>
          )}
        </div>
      ))}
    </section>
  )
}
