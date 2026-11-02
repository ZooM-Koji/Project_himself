import { useState } from 'react'
import { removeQuickLink, saveQuickLink, type QuickLink } from '../lib/quickLinks'
import { normUrl } from './LinksField'
import Sheet from './Sheet'

/** Добавить / изменить / убрать ссылку быстрого доступа. */
export default function QuickLinkSheet({ link, count, onClose }: { link?: QuickLink; count: number; onClose: () => void }) {
  const [title, setTitle] = useState(link?.title ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const norm = normUrl(url)

  const save = async () => {
    if (!title.trim() || !norm) return
    await saveQuickLink({ id: link?.id ?? `my:${crypto.randomUUID()}`, title: title.trim(), url: norm, hint: link?.hint, order: link?.order ?? count + 1 })
    onClose()
  }
  const remove = async () => {
    if (link && confirm(`Убрать «${link.title}» из быстрого доступа?`)) {
      await removeQuickLink(link)
      onClose()
    }
  }

  return (
    <Sheet title={link ? 'Ссылка' : 'Новая ссылка'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Название</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: СДО САФУ" autoFocus={!link} />
        </label>
        <label className="field">
          <span>Адрес</span>
          <input className="input" value={url} inputMode="url" onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        {url && !norm && <p className="muted" style={{ color: 'var(--danger)' }}>Не похоже на ссылку</p>}
      </div>
      <div className="sheet-actions">
        <button className="pill primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!title.trim() || !norm} onClick={save}>
          Сохранить
        </button>
        {link && (
          <button className="pill" style={{ color: 'var(--danger)' }} onClick={remove}>
            Убрать
          </button>
        )}
      </div>
    </Sheet>
  )
}
