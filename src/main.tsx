import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './styles.css'
import { initTheme } from './lib/theme'
import { startAutoSync } from './lib/schedule'
import App from './App'

initTheme()
startAutoSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
