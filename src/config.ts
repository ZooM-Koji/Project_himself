// Настройки группы лежат в src/group.json — их читает и приложение,
// и скрипт загрузки расписания (scripts/fetch-schedule.mjs).
// Чтобы сменить группу — поменять там oid и номер.
import group from './group.json'

export const USER_NAME = group.userName
export const GROUP_NUMBER = group.groupNumber
export const INSTITUTE = group.institute
/** Внутренний номер группы в РУЗ САФУ (ruz.narfu.ru/?timetable&group=…) */
export const GROUP_OID = group.oid
