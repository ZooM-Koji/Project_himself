/** Маленький график: точки по порядку, подписи — первое и последнее значение. */
export default function Sparkline({ values, labels, unit = '', height = 90 }: { values: number[]; labels?: string[]; unit?: string; height?: number }) {
  if (values.length < 2) return <p className="muted" style={{ fontSize: 13 }}>Для графика нужно хотя бы две записи.</p>
  const W = 300
  const H = height
  const pad = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [pad + (i * (W - 2 * pad)) / (values.length - 1), H - pad - ((v - min) * (H - 2 * pad)) / span] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const fmt = (v: number) => `${String(Math.round(v * 10) / 10).replace('.', ',')}${unit}`
  return (
    <div className="spark">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`от ${fmt(values[0])} до ${fmt(values[values.length - 1])}`}>
        <path d={`${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} className="spark-fill" />
        <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={values.length > 30 ? 0 : 3} className="spark-dot" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="spark-labels">
        <span>
          {labels?.[0]} · {fmt(values[0])}
        </span>
        <span>
          макс {fmt(max)} · мин {fmt(min)}
        </span>
        <span>
          {labels?.[labels.length - 1]} · <b>{fmt(values[values.length - 1])}</b>
        </span>
      </div>
    </div>
  )
}
