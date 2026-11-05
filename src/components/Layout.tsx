import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  IconBook,
  IconCalendar,
  IconHome,
  IconPlus,
  IconSettings,
  IconDumbbell,
  IconHeart,
  IconStar,
  IconTasks,
} from './Icons'
import QuickAddSheet from './QuickAddSheet'
import { ProjectNamesContext, useProjects } from '../lib/activities'

type NavItem = { to: string; label: string; short: string; icon: ReactNode }

const NAV: NavItem[] = [
  { to: '/', label: 'Сегодня', short: 'Сегодня', icon: <IconHome /> },
  { to: '/schedule', label: 'Расписание', short: 'Пары', icon: <IconCalendar /> },
  { to: '/tasks', label: 'Задания', short: 'Задания', icon: <IconTasks /> },
  { to: '/study', label: 'Учёба', short: 'Учёба', icon: <IconBook /> },
  { to: '/life', label: 'Жизнь', short: 'Жизнь', icon: <IconHeart /> },
]

/** На компьютере «Жизнь» раскрыта: отдельные пункты. */
const SIDE_LIFE: NavItem[] = [
  { to: '/life/todo', label: 'Мои дела', short: '', icon: <IconTasks /> },
  { to: '/gym', label: 'Зал', short: '', icon: <IconDumbbell /> },
  { to: '/activities', label: 'Активности', short: '', icon: <IconStar /> },
]
const LIFE_PATHS = ['/life', '/gym', '/activities']

export default function Layout() {
  const [addOpen, setAddOpen] = useState(false)
  const projects = useProjects()
  const projectNames = new Map((projects ?? []).map((p) => [p.id, p.title]))
  const location = useLocation()
  const navigate = useNavigate()

  // Ярлык на иконке «Новое задание» открывает …/#/tasks?new=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      setAddOpen(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location, navigate])
  const cls = (base: string) => ({ isActive }: { isActive: boolean }) => (isActive ? `${base} active` : base)

  return (
    <ProjectNamesContext.Provider value={projectNames}>
    <div className="app">
      {/* Компьютер: боковое меню */}
      <aside className="sidebar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          Зачётка
        </div>
        {NAV.slice(0, 4).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={cls('side-link')}>
            {n.icon}
            {n.label}
          </NavLink>
        ))}
        <NavLink to="/life" end className={cls('side-link side-group')}>
          <IconHeart />
          Жизнь
        </NavLink>
        {SIDE_LIFE.map((n) => (
          <NavLink key={n.to} to={n.to} className={cls('side-link side-sub')}>
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
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              isActive || (n.to === '/life' && LIFE_PATHS.some((p) => location.pathname.startsWith(p))) ? 'nav-link active' : 'nav-link'
            }
          >
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
    </ProjectNamesContext.Provider>
  )
}
