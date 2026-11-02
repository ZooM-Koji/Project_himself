// Маленький разбор Markdown для конспектов — без библиотек.
// HTML из текста не вставляется никогда: всё превращается в безопасные элементы React.
// Поддерживается: # заголовки, списки (-, *, 1.), чек-листы [ ] / [x], > цитаты,
// ``` код ```, ---, **жирный**, *курсив*, ~~зачёркнутый~~, `код`, [ссылка](url), голые https://…

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b' | 'i' | 's'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'a'; href: string; c: Inline[] }

export type Block =
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'p'; lines: Inline[][] }
  | { t: 'ul' | 'ol'; items: { c: Inline[]; check?: boolean }[] }
  | { t: 'quote'; lines: Inline[][] }
  | { t: 'code'; v: string }
  | { t: 'hr' }

const SAFE_URL = /^(https?:\/\/|mailto:)/i

const INLINE_RE =
  /(\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\s][^*]*)\*|(?<![\p{L}\d])_([^_\s][^_]*)_(?![\p{L}\d])|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?]))/gu

export function parseInline(s: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of s.matchAll(INLINE_RE)) {
    if (m.index! > last) out.push({ t: 'text', v: s.slice(last, m.index) })
    last = m.index! + m[0].length
    if (m[2] ?? m[3]) out.push({ t: 'b', c: parseInline(m[2] ?? m[3]) })
    else if (m[4]) out.push({ t: 's', c: parseInline(m[4]) })
    else if (m[5] ?? m[6]) out.push({ t: 'i', c: parseInline(m[5] ?? m[6]) })
    else if (m[7]) out.push({ t: 'code', v: m[7] })
    else if (m[8]) {
      const href = /^www\./i.test(m[9]) ? `https://${m[9]}` : m[9]
      if (SAFE_URL.test(href)) out.push({ t: 'a', href, c: parseInline(m[8]) })
      else out.push({ t: 'text', v: m[0] }) // javascript: и прочее — просто текст
    } else if (m[10]) out.push({ t: 'a', href: m[10], c: [{ t: 'text', v: m[10] }] })
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) })
  return out
}

const LIST_RE = /^\s*([-*+]|\d+[.)])\s+(.*)$/

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    // ``` код ```
    if (/^\s*```/.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++])
      i++ // закрывающие ```
      blocks.push({ t: 'code', v: code.join('\n') })
      continue
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      blocks.push({ t: 'h', level: h[1].length as 1 | 2 | 3, c: parseInline(h[2].trim()) })
      i++
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ t: 'hr' })
      i++
      continue
    }
    if (/^\s*>/.test(line)) {
      const q: Inline[][] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(parseInline(lines[i++].replace(/^\s*>\s?/, '')))
      blocks.push({ t: 'quote', lines: q })
      continue
    }
    const lm = line.match(LIST_RE)
    if (lm) {
      const ordered = /\d/.test(lm[1])
      const items: { c: Inline[]; check?: boolean }[] = []
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE)
        if (!m || /\d/.test(m[1]) !== ordered) break
        const cb = m[2].match(/^\[([ xXхХ])\]\s*(.*)$/)
        items.push(cb ? { c: parseInline(cb[2]), check: cb[1] !== ' ' } : { c: parseInline(m[2]) })
        i++
      }
      blocks.push({ t: ordered ? 'ol' : 'ul', items })
      continue
    }
    // абзац: строки подряд до пустой строки или начала другого блока
    const p: Inline[][] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|\s*```|\s*>)/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      p.push(parseInline(lines[i++]))
    }
    blocks.push({ t: 'p', lines: p })
  }
  return blocks
}
