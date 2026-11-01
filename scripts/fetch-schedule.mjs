#!/usr/bin/env node
// Скачивает расписание группы из РУЗ САФУ и сохраняет public/data/schedule.json.
//
//   node scripts/fetch-schedule.mjs                 — скачать с ruz.narfu.ru
//   node scripts/fetch-schedule.mjs --file page.html — разобрать сохранённую страницу
//
// Правила (см. CLAUDE.md):
// - если РУЗ недоступен — старый файл не трогаем, выходим без ошибки;
// - если страница пришла, но разобрать её не получилось (поменялась вёрстка) —
//   старый файл не трогаем и выходим с ошибкой, чтобы GitHub прислал письмо;
// - пары не выдумываем: пустой день в РУЗ = пар нет;
// - файл перезаписываем, только если расписание действительно изменилось.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRuzHtml } from './ruz-parse.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data', 'schedule.json')
const group = JSON.parse(readFileSync(join(ROOT, 'src', 'group.json'), 'utf8'))
const URL_PAGE = `https://ruz.narfu.ru/?timetable&group=${group.oid}`
// Честно представляемся: кто качает и где проект.
const USER_AGENT = 'Zachetka-schedule (+https://github.com/ZooM-Koji/Project_himself)'

const warn = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `ВНИМАНИЕ: ${msg}`)
const fail = (msg) => {
  console.log(process.env.GITHUB_ACTIONS ? `::error::${msg}` : `ОШИБКА: ${msg}`)
  process.exit(1)
}

async function download() {
  try {
    const res = await fetch(URL_PAGE, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) })
    if (!res.ok) {
      warn(`РУЗ ответил ${res.status} — оставляю прошлую версию расписания.`)
      process.exit(0)
    }
    return await res.text()
  } catch (e) {
    warn(`РУЗ недоступен (${e.message}) — оставляю прошлую версию расписания.`)
    process.exit(0)
  }
}

const fileArg = process.argv.indexOf('--file')
const html = fileArg > 0 ? readFileSync(process.argv[fileArg + 1], 'utf8') : await download()

const { title, days, lessons } = parseRuzHtml(html)

// Проверки, что это правда наша группа и страница разобралась.
if (!title.includes(group.groupNumber)) fail(`На странице не группа ${group.groupNumber} (заголовок: «${title}»).`)
if (days.length === 0) fail('Не нашёл на странице ни одного дня — похоже, РУЗ поменял вёрстку.')
const broken = lessons.filter((l) => !/^\d\d:\d\d$/.test(l.start) || !/^\d\d:\d\d$/.test(l.end) || !l.subject)
if (broken.length) fail(`Не разобралось пар: ${broken.length} (пример: ${JSON.stringify(broken[0])}).`)

const sortedDays = [...days].sort()
const range = { from: sortedDays[0], to: sortedDays[sortedDays.length - 1] }
const hash = createHash('sha256').update(JSON.stringify({ range, lessons })).digest('hex').slice(0, 16)

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
if (prev?.hash === hash) {
  console.log(`Без изменений: ${lessons.length} пар, ${range.from} — ${range.to}.`)
  process.exit(0)
}

const data = {
  version: 1,
  group: group.groupNumber,
  oid: group.oid,
  source: URL_PAGE,
  fetchedAt: new Date().toISOString(),
  hash,
  range,
  lessons,
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n')
console.log(`Сохранено: ${lessons.length} пар, ${range.from} — ${range.to}${prev ? ' (расписание изменилось)' : ''}.`)
