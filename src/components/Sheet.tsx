import { useEffect, type ReactNode } from 'react'

/** Нижний лист (на компьютере — окно по центру). Закрывается тапом по фону или Esc. */
export default function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h2 className="sheet-title">{title}</h2>
        {children}
        <button className="pill" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
