import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconSettings } from './Icons'

/** Заголовок экрана. На телефоне справа — шестерёнка «Настройки». */
export default function PageHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {right ?? (
        <Link to="/settings" className="icon-btn only-mobile" aria-label="Настройки">
          <IconSettings size={20} />
        </Link>
      )}
    </header>
  )
}
