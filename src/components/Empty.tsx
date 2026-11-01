import type { ReactNode } from 'react'

export default function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="card empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
    </div>
  )
}
