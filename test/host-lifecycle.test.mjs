import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { request } from 'node:http'
import * as fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import * as crypto from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import * as activity from '../lib/activity.js'
import * as security from '../lib/security.js'
import { fixture } from './helpers/host-fixture.mjs'

// Exercise the actual host closure, substituting only process launching and time.
// No capability is exported by production code and no real helper is spawned.
const source = (await readFile(new URL('../lib/index.js', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '').replace(/^export \{.*\r?\n/gm, '')
  .replace(/^export /gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../lib/index.js', import.meta.url).href))

function harness(t) {
  const previous = process.env.DSH_PET_ELECTRON_PATH
  process.env.DSH_PET_ELECTRON_PATH = process.execPath
  t.after(() => { if (previous === undefined) delete process.env.DSH_PET_ELECTRON_PATH; else process.env.DSH_PET_ELECTRON_PATH = previous })
  let time = 100_000, watchdog, alive = 0, peak = 0
  const children = []
  const spawn = (_exe, _args, options) => {
    const child = new EventEmitter()
    Object.assign(child, { options, exitCode: null, signalCode: null, stderr: new EventEmitter(), kills: [], hold: false })
    child.close = () => {
      if (child.exitCode !== null) return
      alive--; child.exitCode = 0; child.emit('exit', 0); child.emit('close', 0)
    }
    child.kill = signal => { child.kills.push(signal || 'SIGTERM'); if (!child.hold) queueMicrotask(child.close); return true }
    children.push(child); peak = Math.max(peak, ++alive)
    return child
  }
  const context = vm.createContext({ ...fs, ...crypto, ...activity, ...security, homedir, join, fileURLToPath, spawn,
    process, URL, Buffer, console,
    Date: class extends Date { static now() { return time } },
    setTimeout, clearTimeout, setInterval: callback => { watchdog = callback; return { unref() {} } }, clearInterval() {},
  })
  vm.runInContext(source + '\nglobalThis.testApply = apply', context)
  return { apply: context.testApply, children, peak: () => peak, advance: ms => { time += ms }, watch: () => watchdog() }
}
const helper = child => ({ authorization: 'Bearer ' + child.options.env.DSH_CAPYREP_TOKEN })
const flush = () => new Promise(resolve => setImmediate(resolve))

test('hide/show waits for the old helper and rotates the capability before replacement readiness', { timeout: 10_000 }, async t => {
  const h = harness(t), f = await fixture(t, { desktopEnabled: false }, {}, undefined, h.apply)
  await f.post('/desktop/show', {})
  const old = h.children[0]; old.hold = true
  assert.equal((await f.post('/desktop/heartbeat', {}, helper(old))).status, 200)
  assert.equal((await f.get('/state')).desktop, true)
  const hiding = f.post('/desktop/hide', {})
  // Observe the stop in progress before issuing the racing show.
  while (!old.kills.length) await flush()
  const showing = f.post('/desktop/show', {})
  while (!(await f.get('/state')).desktopEnabled) await flush()
  assert.equal(h.children.length, 1, 'no replacement while shutdown still owns the old process')
  assert.equal((await f.post('/desktop/heartbeat', {}, helper(old))).status, 403)
  old.close()
  assert.equal((await hiding).status, 200); assert.equal((await showing).status, 200)
  assert.equal(h.children.length, 2); assert.equal(h.peak(), 1)
  const next = h.children[1]
  assert.notEqual(helper(old).authorization, helper(next).authorization)
  assert.equal((await f.get('/state')).desktop, false, 'the new renderer must earn its own readiness')
  assert.equal((await f.post('/desktop/heartbeat', {}, helper(old))).status, 403)
  assert.equal((await f.post('/desktop/heartbeat', {}, helper(next))).status, 200)
})

test('an old helper request authorized before shutdown cannot finish after capability rotation', { timeout: 10_000 }, async t => {
  const h = harness(t), f = await fixture(t, { desktopEnabled: false }, {}, undefined, h.apply)
  await f.post('/desktop/show', {})
  const arrived = new Promise(resolve => f.server.once('request', resolve))
  let upload
  const response = new Promise((resolve, reject) => {
    upload = request(f.base + '/dsh-capyreporter/desktop/heartbeat', { method: 'POST', headers: { ...helper(h.children[0]), 'content-type': 'application/json' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) })
    upload.on('error', reject); upload.write('{')
  })
  t.after(() => upload.destroy())
  await arrived
  await f.post('/desktop/hide', {}); await f.post('/desktop/show', {})
  upload.end('}')
  assert.equal(await response, 403)
  assert.equal((await f.get('/state')).desktop, false, 'an old in-flight heartbeat must not mark the replacement ready')
  assert.equal((await f.post('/desktop/heartbeat', {}, helper(h.children.at(-1)))).status, 200)
})

test('dispose joins a pending stop and a racing show never starts after disposal', { timeout: 10_000 }, async t => {
  const h = harness(t), f = await fixture(t, { desktopEnabled: false }, {}, undefined, h.apply)
  await f.post('/desktop/show', {})
  const old = h.children[0]; old.hold = true
  const hiding = f.post('/desktop/hide', {})
  while (!old.kills.length) await flush()
  const showing = f.post('/desktop/show', {})
  while (!(await f.get('/state')).desktopEnabled) await flush()
  let finished = false
  const disposal = f.dispose().then(() => { finished = true })
  await flush()
  assert.equal(finished, false, 'disposal waits for the already-stopping child')
  assert.equal(old.kills.length, 1, 'all callers share one shutdown')
  old.close(); await disposal; await hiding; await showing
  assert.equal(h.children.length, 1)
})

test('desktop commands survive reads and only a matching browser acknowledgement clears them', { timeout: 10_000 }, async t => {
  const h = harness(t), f = await fixture(t, { desktopEnabled: false }, {}, undefined, h.apply)
  await f.post('/desktop/show', {})
  const headers = helper(h.children[0])
  assert.equal((await f.post('/desktop/navigate', { settings: true }, headers)).status, 200)
  const first = (await f.get('/state')).navigate
  assert.equal(first.kind, 'settings'); assert.ok(first.id)
  assert.deepEqual((await f.get('/state')).navigate, first, 'a lost response or activity failure cannot consume the request')
  assert.equal((await (await f.raw('/state', { headers })).json()).navigate, null, 'helper polling never takes browser commands')
  assert.equal((await f.post('/navigate/ack', { id: first.id }, headers)).status, 403)
  assert.equal((await f.post('/navigate/ack', {})).status, 400)
  await f.post('/desktop/navigate', { sessionId: 'new-session' }, headers)
  const newer = (await f.get('/state')).navigate
  await f.post('/navigate/ack', { id: first.id })
  assert.deepEqual((await f.get('/state')).navigate, newer, 'a delayed acknowledgement cannot clear a newer click')
  await f.post('/navigate/ack', { id: newer.id })
  assert.equal((await f.get('/state')).navigate, null)
  await f.post('/desktop/navigate', { settings: true }, headers)
  h.advance(30_001)
  assert.equal((await f.get('/state')).navigate, null, 'unacknowledged requests still expire')
})

test('watchdog distinguishes cold-start failure from a renderer that stopped responding', { timeout: 10_000 }, async t => {
  const h = harness(t), f = await fixture(t, { desktopEnabled: false }, {}, undefined, h.apply)
  await f.post('/desktop/show', {})
  h.advance(60_001); h.watch(); await flush()
  assert.match((await f.get('/state')).desktopError, /did not become ready/)
  await f.post('/desktop/show', {})
  await f.post('/desktop/heartbeat', {}, helper(h.children.at(-1)))
  h.advance(20_001); h.watch(); await flush()
  assert.match((await f.get('/state')).desktopError, /stopped responding/)
})
