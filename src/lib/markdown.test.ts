// Тесты разбора Markdown для конспектов. Запуск: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBlocks, parseInline } from './markdown.ts'

test('жирный, курсив, код, зачёркнутый', () => {
  assert.deepEqual(parseInline('a **b** *c* `d` ~~e~~'), [
    { t: 'text', v: 'a ' },
    { t: 'b', c: [{ t: 'text', v: 'b' }] },
    { t: 'text', v: ' ' },
    { t: 'i', c: [{ t: 'text', v: 'c' }] },
    { t: 'text', v: ' ' },
    { t: 'code', v: 'd' },
    { t: 'text', v: ' ' },
    { t: 's', c: [{ t: 'text', v: 'e' }] },
  ])
})

test('ссылки: только http/https/mailto', () => {
  assert.deepEqual(parseInline('[Лань](https://e.lanbook.com/book/1)'), [
    { t: 'a', href: 'https://e.lanbook.com/book/1', c: [{ t: 'text', v: 'Лань' }] },
  ])
  assert.deepEqual(parseInline('[жми](javascript:alert(1))')[0], { t: 'text', v: '[жми](javascript:alert(1)' })
  const auto = parseInline('см. https://cyberleninka.ru/article/x.')
  assert.deepEqual(auto[1], { t: 'a', href: 'https://cyberleninka.ru/article/x', c: [{ t: 'text', v: 'https://cyberleninka.ru/article/x' }] })
  assert.deepEqual(auto[2], { t: 'text', v: '.' })
})

test('подчёркивания внутри слов не курсив', () => {
  assert.deepEqual(parseInline('ВШЭУиП_№1_э'), [{ t: 'text', v: 'ВШЭУиП_№1_э' }])
})

test('HTML остаётся текстом', () => {
  assert.deepEqual(parseInline('<img src=x onerror=alert(1)>'), [{ t: 'text', v: '<img src=x onerror=alert(1)>' }])
})

test('блоки: заголовки, списки, чек-лист, цитата, код, абзацы', () => {
  const md = `# Тема 1
Строка один
строка два

- пункт
- [x] сделано
- [ ] не сделано

1. первый
2. второй

> цитата

\`\`\`
код **не** разбирается
\`\`\`
---`
  const b = parseBlocks(md)
  assert.deepEqual(
    b.map((x) => x.t),
    ['h', 'p', 'ul', 'ol', 'quote', 'code', 'hr'],
  )
  assert.equal((b[1] as { lines: unknown[] }).lines.length, 2)
  const ul = b[2] as { items: { check?: boolean }[] }
  assert.deepEqual(ul.items.map((i) => i.check), [undefined, true, false])
  assert.deepEqual(b[5], { t: 'code', v: 'код **не** разбирается' })
})
