import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  IconBook,
  IconCalendar,
  IconHome,
  IconPlus,
  IconSettings,
  IconStar,
  IconTasks,
} from './Icons'
import QuickAddSheet from './QuickAddSheet'

type NavItem = { to: string; label: string; short: string; icon: ReactNode }

const NAV: NavItem[] = [
  { to: '/', label: 'Сегодня', short: 'Сегодня', icon: <IconHome /> },
  { to: '/schedule', label: 'Расписание', short: 'Пары', icon: <IconCalendar /> },
  { to: '/tasks', label: 'Задания', short: 'Задания', icon: <IconTasks /> },
  { to: '/study', label: 'Учёба', short: 'Учёба', icon: <IconBook /> },
  { to: '/activities', label: 'Активности', short: 'Актив', icon: <IconStar /> },
]

export default function Layout() {
  const [addOpen, setAddOpen] = useState(false)
  const cls = (base: string) => ({ isActive }: { isActive: boolean }) => (isActive ? `${base} active` : base)

  return (
    <div className="app">
      {/* Компьютер: боковое меню */}
      <aside className="sidebar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          Зачётка
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={cls('side-link')}>
            {n.icon}
            {n.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <button className="pill primary add-btn" onClick={() => setAddOpen(true)}>
          <IconPlus size={18} /> Добавить
        </button>
        <NavLink to="/settings" className={cls('side-link')}>
          <IconSettings />
          Настройки
        </NavLink>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {/* Телефон: нижняя навигация и кнопка «+» */}
      <nav className="bottom-nav" aria-label="Основное меню">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={cls('nav-link')}>
            <span className="nav-icon">{n.icon}</span>
            {n.short}
          </NavLink>
        ))}
      </nav>
      <button className="fab" aria-label="Быстро добавить" onClick={() => setAddOpen(true)}>
        <IconPlus size={26} />
      </button>

      {addOpen && <QuickAddSheet onClose={() => setAddOpen(false)} />}
    </div>
  )
}
