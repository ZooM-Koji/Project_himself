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
import StoChecklist from './screens/StoChecklist'
import GostPage from './screens/GostPage'
import Life from './screens/Life'
import Gym from './screens/Gym'
import WorkoutPage from './screens/WorkoutPage'
import ExercisePage from './screens/ExercisePage'

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
          <Route path="study/sto" element={<StoChecklist />} />
          <Route path="study/gost" element={<GostPage />} />
          <Route path="study/notes/new" element={<NewNote />} />
          <Route path="study/notes/:id" element={<NoteEdit />} />
          <Route path="life" element={<Life />} />
          <Route path="life/todo" element={<Tasks life />} />
          <Route path="gym" element={<Gym />} />
          <Route path="gym/w/:id" element={<WorkoutPage />} />
          <Route path="gym/ex/:id" element={<ExercisePage />} />
          <Route path="activities" element={<Activities />} />
          <Route path="activities/p/:id" element={<ProjectPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
