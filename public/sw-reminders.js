/* Дополнение к service worker «Зачётки»: утренняя сводка и нажатия на уведомления.
 * Подключается через workbox.importScripts (vite.config.ts). Обычный JS: здесь нет сборки.
 * Логика сводки повторяет src/lib/reminders.ts → digest() и src/lib/schedule.ts → applyRules(). */
/* eslint-disable */
;(function () {
  var DIGEST_TAG = 'zachetka-digest'

  function openDb() {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open('zachetka')
      rq.onsuccess = function () { res(rq.result) }
      rq.onerror = function () { rej(rq.error) }
    })
  }
  function all(db, store) {
    return new Promise(function (res) {
      if (!db.objectStoreNames.contains(store)) return res([])
      var g = db.transaction(store).objectStore(store).getAll()
      g.onsuccess = function () { res(g.result || []) }
      g.onerror = function () { res([]) }
    })
  }
  function kv(db, key) {
    return new Promise(function (res) {
      var g = db.transaction('kv').objectStore('kv').get(key)
      g.onsuccess = function () { res(g.result ? g.result.value : undefined) }
      g.onerror = function () { res(undefined) }
    })
  }
  function kvPut(db, key, value) {
    return new Promise(function (res) {
      var tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put({ key: key, value: value, updatedAt: Date.now() })
      tx.oncomplete = function () { res() }
      tx.onerror = function () { res() }
    })
  }
  function pad(n) { return String(n).padStart(2, '0') }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function plural(n, f) { return n % 10 === 1 && n % 100 !== 11 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2] }

  function visibleLessons(file, rules, manual) {
    var groupNo = (file && file.group) || ''
    var hidden = {}, mine = {}
    rules.filter(function (r) { return !r.deleted }).forEach(function (r) {
      if (r.kind === 'hide') hidden[r.target] = 1
      if (r.kind === 'mine') mine[r.target] = r.group
    })
    var whole = function (l) { return !l.group || new RegExp(groupNo + '(?!_)').test(l.group) }
    var list = ((file && file.lessons) || []).filter(function (l) {
      if (hidden[l.date + '|' + l.start + '|' + l.subject + '|' + l.group]) return false
      var my = mine[l.subject + '|' + l.kind]
      return my === undefined || whole(l) || l.group === my
    })
    return list.concat(manual.filter(function (m) { return !m.deleted }))
  }

  function digest(now, lessons, events, tasks) {
    var later = now.getHours() >= 15
    var target = later ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : now
    var day = iso(target)
    var ls = lessons.filter(function (l) { return l.date === day }).sort(function (a, b) { return a.start < b.start ? -1 : 1 })
    var starts = ls.map(function (l) { return l.start }).filter(function (s, i, a) { return a.indexOf(s) === i })
    var evs = events.filter(function (e) { return !e.deleted && e.date === day })
    var open = tasks.filter(function (t) { return !t.deleted && t.status !== 'done' })
    var due = open.filter(function (t) { return t.dueDate === day })
    var overdue = open.filter(function (t) { return t.dueDate && t.dueDate < iso(now) }).length
    if (!starts.length && !evs.length && !due.length && !overdue) return null
    var parts = [
      starts.length ? starts.length + ' ' + plural(starts.length, ['пара', 'пары', 'пар']) + ' с ' + starts[0] : 'пар нет',
      evs.length ? evs.length + ' ' + plural(evs.length, ['событие', 'события', 'событий']) : '',
      due.length ? due.length + ' ' + plural(due.length, ['срок', 'срока', 'сроков']) + ' сдачи' : '',
    ].filter(Boolean)
    var body = [
      ls.length ? 'Первая: ' + ls[0].subject + (ls[0].room ? ', ' + ls[0].room : '') : '',
      due.length ? 'Сдать: ' + due.map(function (t) { return '«' + t.title + '»' }).join(', ') : '',
      overdue ? 'Просрочено: ' + overdue : '',
    ].filter(Boolean).join('. ')
    return { id: 'digest:' + day, title: (later ? 'Завтра' : 'Сегодня') + ': ' + parts.join(', '), body: body || 'Хорошего дня!' }
  }

  async function runDigest() {
    var db = await openDb()
    var settings = (await kv(db, 'notify.settings')) || {}
    if (!settings.enabled || settings.digest === false) return
    var now = new Date()
    var file = await kv(db, 'schedule.current')
    var lessons = visibleLessons(file, await all(db, 'scheduleRules'), await all(db, 'manualLessons'))
    var d = digest(now, lessons, await all(db, 'events'), await all(db, 'tasks'))
    if (!d) return
    var last = await kv(db, 'notify.lastDigest')
    if (last === d.id) return // уже показывали эту сводку
    await kvPut(db, 'notify.lastDigest', d.id)
    var base = self.registration.scope
    await self.registration.showNotification(d.title, { body: d.body, tag: d.id, icon: base + 'icon-192.png', badge: base + 'icon-192.png', data: { url: base + '#/' } })
  }

  self.addEventListener('periodicsync', function (e) {
    if (e.tag === DIGEST_TAG) e.waitUntil(runDigest().catch(function () {}))
  })

  // Нажали на уведомление — открыть (или показать уже открытую) «Зачётку» на нужном экране.
  self.addEventListener('notificationclick', function (e) {
    e.notification.close()
    var url = (e.notification.data && e.notification.data.url) || self.registration.scope
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) {
            list[i].navigate && list[i].navigate(url)
            return list[i].focus()
          }
        }
        return self.clients.openWindow(url)
      }),
    )
  })
})()
