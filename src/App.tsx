import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Today from './screens/Today'
import Schedule from './screens/Schedule'
import Tasks from './screens/Tasks'
import Study from './screens/Study'
import Activities from './screens/Activities'
import Settings from './screens/Settings'
import SubjectPage from './screens/SubjectPage'
import NoteEdit from './screens/NoteEdit'
import NotesList from './screens/NotesList'
import NewNote from './screens/NewNote'
import ProjectPage from './screens/ProjectPage'

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
          <Route path="study/s/:name" element={<SubjectPage />} />
          <Route path="study/notes" element={<NotesList />} />
          <Route path="study/notes/new" element={<NewNote />} />
          <Route path="study/notes/:id" element={<NoteEdit />} />
          <Route path="activities" element={<Activities />} />
          <Route path="activities/p/:id" element={<ProjectPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
