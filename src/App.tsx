import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Today from './screens/Today'
import Schedule from './screens/Schedule'
import Tasks from './screens/Tasks'
import Study from './screens/Study'
import Activities from './screens/Activities'
import Settings from './screens/Settings'

// HashRouter (адреса вида …/#/tasks): GitHub Pages не умеет отдавать
// index.html для любых путей, а с «#» обновление страницы ничего не ломает.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="study" element={<Study />} />
          <Route path="activities" element={<Activities />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
