import { useEffect, useRef, useState } from 'react'
import { addFiles, deleteFile, formatSize, MAX_FILE_MB, openFile, useFiles, type StoredFile } from '../lib/files'
import { IconCamera, IconFile, IconPaperclip } from './Icons'

function Thumb({ f }: { f: StoredFile }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!f.type.startsWith('image/')) return
    const u = URL.createObjectURL(f.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [f])
  return url ? <img className="file-thumb" src={url} alt="" /> : <span className="file-thumb file-icon"><IconFile size={20} /></span>
}

/** Файлы и фото, привязанные к заданию / предмету / конспекту. */
export default function FilesField({ ownerType, ownerId }: { ownerType: StoredFile['ownerType']; ownerId: string }) {
  const files = useFiles(ownerType, ownerId)
  const photoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onPick = async (list: FileList | null, input: HTMLInputElement | null) => {
    if (!list?.length) return
    setBusy(true)
    const r = await addFiles(ownerType, ownerId, list)
    setBusy(false)
    setMsg(r.tooBig.length ? `Слишком большие (больше ${MAX_FILE_MB} МБ), не добавлены: ${r.tooBig.join(', ')}` : null)
    if (input) input.value = ''
  }

  const remove = async (f: StoredFile) => {
    if (confirm(`Удалить файл «${f.name}»?`)) await deleteFile(f.id)
  }

  return (
    <div className="files">
      {files.length > 0 && (
        <div className="file-grid">
          {files.map((f) => (
            <div key={f.id} className="file-item">
              <button type="button" className="file-open" onClick={() => openFile(f)} title="Открыть">
                <Thumb f={f} />
                <span className="file-name">{f.name}</span>
                <span className="file-size">{formatSize(f.size)}</span>
              </button>
              <button type="button" className="file-del" aria-label={`Удалить ${f.name}`} onClick={() => remove(f)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="sheet-actions" style={{ marginTop: files.length ? 10 : 0 }}>
        <button type="button" className="pill small" disabled={busy} onClick={() => photoRef.current?.click()}>
          <IconCamera size={16} /> Фото
        </button>
        <button type="button" className="pill small" disabled={busy} onClick={() => fileRef.current?.click()}>
          <IconPaperclip size={16} /> Файл
        </button>
        {busy && <span className="muted">Сохраняю…</span>}
      </div>
      {/* capture — на телефоне сразу открывается камера */}
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPick(e.target.files, e.target)} />
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files, e.target)} />
      {msg && <p className="muted" style={{ color: 'var(--danger)', marginTop: 6 }}>{msg}</p>}
    </div>
  )
}
