// Файлы и фото: хранятся в IndexedDB на устройстве, работают без интернета.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type StoredFile } from './db'

export type { StoredFile }

export const MAX_FILE_MB = 50
const MAX_SIDE = 1600 // фото больше — уменьшаем (хватает, чтобы читать доску и тетрадь)

/** Уменьшить фото и пережать в JPEG. Если не вышло или стало больше — оставляем как было. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * k)
    canvas.height = Math.round(bmp.height * k)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    return out && out.size < file.size ? out : file
  } catch {
    return file
  }
}

/** Попросить браузер не удалять данные при нехватке места (важно, когда есть файлы). */
export async function askPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    /* не поддерживается — ничего страшного */
  }
}

export interface AddFilesResult {
  added: number
  tooBig: string[]
}

export async function addFiles(ownerType: StoredFile['ownerType'], ownerId: string, list: FileList | File[]): Promise<AddFilesResult> {
  const res: AddFilesResult = { added: 0, tooBig: [] }
  for (const f of Array.from(list)) {
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      res.tooBig.push(f.name)
      continue
    }
    const blob = await shrinkImage(f)
    const shrunk = blob !== f
    const now = Date.now()
    await db.files.add({
      id: crypto.randomUUID(),
      ownerType,
      ownerId,
      name: shrunk ? f.name.replace(/\.\w+$/, '') + '.jpg' : f.name || 'файл',
      type: blob.type || f.type || 'application/octet-stream',
      size: blob.size,
      blob,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    })
    res.added++
  }
  if (res.added) void askPersistentStorage()
  return res
}

/** Удаляем по-настоящему: файл занимает место, а в синхронизацию JSON он всё равно не входит. */
export const deleteFile = (id: string) => db.files.delete(id)

export function useFiles(ownerType: StoredFile['ownerType'], ownerId: string | undefined): StoredFile[] {
  return (
    useLiveQuery(
      () => (ownerId ? db.files.where({ ownerType, ownerId }).filter((f) => !f.deleted).sortBy('createdAt') : []),
      [ownerType, ownerId],
    ) ?? []
  )
}

/** Открыть файл: картинки и PDF — в новой вкладке, остальное — скачать. */
export function openFile(f: StoredFile) {
  const url = URL.createObjectURL(f.blob)
  if (/^(image\/|application\/pdf|text\/)/.test(f.type)) {
    window.open(url, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}
