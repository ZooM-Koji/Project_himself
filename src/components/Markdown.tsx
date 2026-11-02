import type { ReactNode } from 'react'
import { parseBlocks, type Inline } from '../lib/markdown'

function inl(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return n.v
      case 'b':
        return <strong key={i}>{inl(n.c)}</strong>
      case 'i':
        return <em key={i}>{inl(n.c)}</em>
      case 's':
        return <s key={i}>{inl(n.c)}</s>
      case 'code':
        return <code key={i}>{n.v}</code>
      case 'a':
        return (
          <a key={i} href={n.href} target="_blank" rel="noreferrer noopener">
            {inl(n.c)}
          </a>
        )
    }
  })
}

const lines = (ls: Inline[][]) => ls.flatMap((l, i) => (i ? [<br key={`br${i}`} />, ...inl(l)] : inl(l)))

/** Показ конспекта. Разбор — в lib/markdown.ts (HTML из текста не вставляется). */
export default function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      {parseBlocks(text).map((b, i) => {
        switch (b.t) {
          case 'h':
            return b.level === 1 ? <h2 key={i}>{inl(b.c)}</h2> : b.level === 2 ? <h3 key={i}>{inl(b.c)}</h3> : <h4 key={i}>{inl(b.c)}</h4>
          case 'p':
            return <p key={i}>{lines(b.lines)}</p>
          case 'quote':
            return <blockquote key={i}>{lines(b.lines)}</blockquote>
          case 'code':
            return <pre key={i}>{b.v}</pre>
          case 'hr':
            return <hr key={i} />
          case 'ul':
          case 'ol': {
            const Tag = b.t
            return (
              <Tag key={i} className={b.items.some((x) => x.check !== undefined) ? 'checklist' : undefined}>
                {b.items.map((it, j) => (
                  <li key={j} className={it.check === undefined ? (b.items.some((x) => x.check !== undefined) ? 'plain' : undefined) : it.check ? 'checked' : 'unchecked'}>
                    {it.check !== undefined && <span className="cb">{it.check ? '✓' : ''}</span>}
                    {inl(it.c)}
                  </li>
                ))}
              </Tag>
            )
          }
        }
      })}
    </div>
  )
}
