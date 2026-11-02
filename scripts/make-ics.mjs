#!/usr/bin/env node
// Собирает public/calendar/<группа>.ics из public/data/schedule.json и src/group.json.
// Запускается перед каждой сборкой сайта (npm run build), в git файл не кладём.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIcs, calendarEvents } from './ics.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const group = JSON.parse(readFileSync(join(ROOT, 'src', 'group.json'), 'utf8'))
const src = join(ROOT, 'public', 'data', 'schedule.json')
const out = join(ROOT, 'public', 'calendar', `${group.groupNumber}.ics`)

if (!existsSync(src)) {
  console.log('Нет public/data/schedule.json — календарь не собран.')
  process.exit(0)
}
const schedule = JSON.parse(readFileSync(src, 'utf8'))
const myGroups = group.calendar?.myGroups ?? {}
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, buildIcs(schedule, { groupNumber: group.groupNumber, myGroups }))
const ev = calendarEvents(schedule, group.groupNumber, myGroups)
console.log(`Календарь: ${ev.length} событий (${ev.filter((e) => e.alternatives).length} — «поток не выбран») → ${out.replace(ROOT + '/', '')}`)
