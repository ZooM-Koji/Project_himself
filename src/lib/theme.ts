// Тема: «как в системе», светлая или тёмная. Выбор помним в localStorage —
// это просто настройка внешнего вида, сами данные будут в IndexedDB (этап 1.5).
import { useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'zachetka.theme'

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* хранилище недоступно — берём системную тему */
  }
  return 'system'
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)

  const dark =
    choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15132B' : '#5B3FD9')
}

export function initTheme() {
  applyTheme(read())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(read()))
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(read)
  useEffect(() => {
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      /* ничего страшного */
    }
    applyTheme(theme)
  }, [theme])
  return [theme, setTheme] as const
}
