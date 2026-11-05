import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconBack, IconSettings } from './Icons'

/** Заголовок экрана. На телефоне справа — шестерёнка «Настройки»; back — кнопка «назад» (на телефоне). */
export default function PageHead({ title, right, back }: { title: string; right?: ReactNode; back?: string }) {
  return (
    <header className="page-head">
      {back && (
        <Link to={back} className="icon-btn only-mobile" aria-label="Назад">
          <IconBack size={20} />
        </Link>
      )}
      <h1 style={back ? { flex: 1 } : undefined}>{title}</h1>
      {right ?? (
        <Link to="/settings" className="icon-btn only-mobile" aria-label="Настройки">
          <IconSettings size={20} />
        </Link>
      )}
    </header>
  )
}
