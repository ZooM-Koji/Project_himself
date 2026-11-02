// «Спросить Claude»: собрать текст задания и передать в приложение Claude
// через системное окно «Поделиться» (или скопировать и открыть claude.ai).
// Без API-ключей: ключ нельзя безопасно хранить в веб-приложении, а API платный.
import { db, type Task } from './db'
import { formatIsoLong } from './dates'
import { STO_SUMMARY } from './sto'

export async function buildClaudePrompt(t: Task, teacher?: string): Promise<string> {
  const subj = t.subject ? await db.subjects.get(t.subject) : undefined
  const lines = [
    'Помоги мне с учебным заданием (1 курс, САФУ, направление «Экономика»).',
    '',
    `Задание: ${t.title}`,
    t.subject && `Предмет: ${t.subject}${teacher ? ` (преподаватель ${teacher})` : ''}`,
    t.dueDate && `Срок: ${formatIsoLong(t.dueDate)}${t.dueTime ? `, ${t.dueTime}` : ''}`,
    t.notes && `Мои заметки к заданию:\n${t.notes}`,
    subj?.requirements && `Требования преподавателя по предмету:\n${subj.requirements}`,
    t.links.length > 0 && `Материалы:\n${t.links.map((l) => `- ${l.url}`).join('\n')}`,
    '',
    `Если это письменная работа — оформление по СТО САФУ: ${STO_SUMMARY}.`,
    '',
    'Сначала задай уточняющие вопросы, если чего-то не хватает, и предложи план. ' +
      'В конце коротко перечисли, с чем именно ты помог, — это нужно для раздела об использовании ИИ.',
  ]
  // пустые/ненужные строки (false, undefined) выкидываем, лишние пустые строки схлопываем
  return lines.filter((l): l is string => typeof l === 'string').join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export type AskResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** Поделиться (Android → выбрать Claude). Фото/PDF задания прикладываем, если система умеет. */
export async function askClaude(t: Task, teacher?: string): Promise<AskResult> {
  const text = await buildClaudePrompt(t, teacher)
  const files = (await db.files.where({ ownerType: 'task', ownerId: t.id }).toArray())
    .filter((f) => /^(image\/|application\/pdf)/.test(f.type))
    .map((f) => new File([f.blob], f.name, { type: f.type }))
  if (navigator.share) {
    try {
      if (files.length && navigator.canShare?.({ files })) await navigator.share({ text, files })
      else await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // не вышло — пробуем копированием
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    window.open('https://claude.ai/new', '_blank', 'noopener')
    return 'copied'
  } catch {
    return 'failed'
  }
}
