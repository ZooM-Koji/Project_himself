import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addNote } from '../lib/notes'

/** Ярлык «Новый конспект»: создаём пустой конспект и сразу открываем его. */
export default function NewNote() {
  const navigate = useNavigate()
  const done = useRef(false) // StrictMode вызывает эффект дважды — создаём один конспект
  useEffect(() => {
    if (done.current) return
    done.current = true
    addNote('').then((id) => navigate(`/study/notes/${id}`, { replace: true }))
  }, [navigate])
  return null
}
