import { test } from 'node:test'
import assert from 'node:assert/strict'
import { request as httpRequest } from 'node:http'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { MAX_BODY_BYTES, validatePng } from '../lib/security.js'
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='

import { fixture } from './helpers/host-fixture.mjs'

test('HTTP route boundary rejects unauthenticated, cross-origin, opaque and non-loopback requests without CORS', async t => {
  const f = await fixture(t)
  const cases = [ {}, { origin: 'https://evil.example' }, { origin: 'null' }, { origin: f.base, 'sec-fetch-site': 'cross-site' }, { origin: f.base, authorization: 'Bearer wrong' } ]
  for (const headers of cases) {
    const response = await fetch(f.base + '/dsh-capyreporter/activity', { headers })
    // Wrong capability never grants helper privileges, but a valid same-origin
    // browser request remains a browser request.
    assert.equal(response.status, headers.authorization ? 200 : 403, JSON.stringify(headers))
    assert.equal(response.headers.get('access-control-allow-origin'), null)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  // Undici rewrites Host; use node:http to actually exercise DNS-rebinding Host.
  const rebinding = await new Promise((resolve, reject) => {
    httpRequest(f.base + '/dsh-capyreporter/state', { headers: { origin: f.base, host: 'evil.example:' + f.port } }, response => { response.resume(); resolve(response.statusCode) }).on('error', reject).end()
  })
  assert.equal(rebinding, 403)
  const response = await fetch(f.base + '/dsh-capyreporter/state', { headers: { referer: f.base + '/settings' } })
  assert.equal(response.status, 200)
})
test('same-origin fetch metadata authorizes reads without Origin or Referer, cross-site does not', async t => {
  const f = await fixture(t)
  // Fetch's forbidden-header rules strip Sec-Fetch-* in undici, so exercise the
  // wire format through node:http like a real browser would send it.
  const rawGet = (path, headers) => new Promise((resolve, reject) => {
    httpRequest(f.base + path, { headers }, response => { response.resume(); resolve(response.statusCode) }).on('error', reject).end()
  })
  assert.equal(await rawGet('/dsh-capyreporter/state', { 'sec-fetch-site': 'same-origin' }), 200)
  assert.equal(await rawGet('/dsh-capyreporter/state', { 'sec-fetch-site': 'same-origin', origin: 'https://evil.example' }), 403)
  for (const site of ['cross-site', 'same-site', 'none']) {
    assert.equal(await rawGet('/dsh-capyreporter/state', { 'sec-fetch-site': site, referer: f.base + '/settings' }), 403, site)
  }
  assert.equal((await f.raw('/desktop/heartbeat', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer wrong' }, body: '{}' })).status, 403)
})
test('all mutations require POST, reads require GET, unknown routes are 404', async t => {
  const f = await fixture(t)
  for (const path of ['/reset', '/enabled', '/dismiss', '/desktop/hide', '/desktop/show', '/scale']) {
    const response = await f.raw(path)
    assert.equal(response.status, 405, path)
    assert.equal(response.headers.get('allow'), 'POST')
  }
  assert.equal((await f.post('/activity', {})).status, 405)
  assert.equal((await f.raw('/missing')).status, 404)
  assert.equal((await f.post('/desktop/heartbeat', {})).status, 403)
})
test('strict JSON, booleans and numeric inputs reject malformed values without changing state', async t => {
  const f = await fixture(t)
  for (const body of [null, [], { enabled: 'false' }, { enabled: 0 }, {}]) assert.equal((await f.post('/enabled', body)).status, 400)
  for (const body of [{ scale: '1.3' }, { scale: null }, {}]) assert.equal((await f.post('/scale', body)).status, 400)
  assert.equal((await f.raw('/scale', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{"scale":1.3}' })).status, 415)
  assert.equal((await f.raw('/scale', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400)
  assert.equal((await f.get('/state')).scale, 1)
  assert.equal((await f.get('/state')).enabled, true)
})
test('settings persist atomically and size clamps at documented bounds', async t => {
  const f = await fixture(t)
  assert.equal((await f.post('/scale', { scale: 999 })).status, 200)
  assert.equal((await f.get('/state')).scale, 2.5)
  assert.equal(JSON.parse(await readFile(join(f.home, 'capyreporter.json'), 'utf8')).scale, 2.5)
  await f.post('/scale', { scale: -1 })
  assert.equal((await f.get('/state')).scale, .5)
})
test('persistence failures report errors and keep both in-memory and saved settings unchanged', async t => {
  const f = await fixture(t)
  await rm(join(f.home, 'capyreporter.json'))
  await mkdir(join(f.home, 'capyreporter.json'))
  const response = await f.post('/scale', { scale: 1.5 })
  assert.equal(response.status, 500)
  assert.match((await response.json()).error, /previous settings retained/)
  assert.equal((await f.get('/state')).scale, 1)
  assert.equal(f.warnings.length, 1)
})
test('custom-to-custom artwork changes revision and rejects SVG, invalid base64 and oversized dimensions', async t => {
  const f = await fixture(t)
  assert.ok(validatePng(png).length)
  for (let i = 1; i <= 2; i++) {
    assert.equal((await f.post('/image', { dataUrl: 'data:image/png;base64,' + png })).status, 200)
    assert.equal((await f.get('/state')).imageRevision, i)
  }
  assert.equal((await f.post('/image', { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400)
  assert.equal((await f.post('/image', { dataUrl: 'data:image/png;base64,garbage' })).status, 400)
  const huge = Buffer.from(png, 'base64'); huge.writeUInt32BE(100000, 16)
  assert.equal((await f.post('/image', { dataUrl: 'data:image/png;base64,' + huge.toString('base64') })).status, 400)
  const image = await f.raw('/image')
  assert.equal(image.headers.get('content-type'), 'image/png')
  assert.equal(Buffer.from(await image.arrayBuffer()).toString('base64'), png)
  await f.post('/reset', {})
  assert.equal((await f.get('/state')).hasCustom, false)
})
test('oversized JSON responds with controlled 413 rather than hanging or resetting socket', async t => {
  const f = await fixture(t)
  const response = await f.raw('/image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(MAX_BODY_BYTES + 1) })
  assert.equal(response.status, 413)
})
test('real scoped event payloads flow into running/outcome snapshots, and disabled reporter hides activity', async t => {
  const session = { id: 'a', header: { cwd: 'C:/project' } }
  const f = await fixture(t, {}, { sessions: { get: () => session }, workspaceRegistry: { list: () => [{ path: 'C:/project', title: 'Project' }] }, sessionTitle: { get: () => ({ title: 'Session A' }) } })
  const agent = { id: 'a', session }
  f.emit('agent/status', { agent, status: 'running' })
  f.emit('session/event', session, { type: 'tool/call', data: { name: 'ops_bash' } })
  const running = await f.get('/activity')
  assert.equal(running.runningCount, 1)
  assert.equal(running.running[0].title, 'Project · Session A')
  assert.deepEqual(running.running[0].lines, ['🔧 ops_bash'])
  f.emit('session/event', session, { type: 'turn/end', data: { reason: { kind: 'aborted' } } })
  f.emit('agent/status', { agent, status: 'idle' })
  const done = (await f.get('/activity')).completed
  assert.equal(done.outcome, 'aborted'); assert.match(done.label, /cancelled/)
  assert.equal((await f.post('/dismiss', {})).status, 400)
  await f.post('/dismiss', { at: done.at })
  assert.equal((await f.get('/activity')).completed, null)
  await f.post('/enabled', { enabled: false })
  f.emit('agent/status', { agent, status: 'running' })
  assert.equal((await f.get('/activity')).runningCount, 0)
  await f.post('/enabled', { enabled: true })
  assert.equal((await f.get('/activity')).runningCount, 1)
})
test('hot-activation seeds existing running agents without replaying idle sessions', async t => {
  const f = await fixture(t, {}, { agents: { list: () => [{ id: 'active', status: 'running' }, { id: 'old', status: 'idle' }] } })
  assert.equal((await f.get('/activity')).running[0].id, 'active')
  assert.equal((await f.get('/state')).desktop, false)
})
test('plugin activations do not share running maps and disposal removes routes and subscriptions', async t => {
  const a = await fixture(t), b = await fixture(t)
  a.emit('agent/status', { agent: { id: 'only-a' }, status: 'running' })
  assert.equal((await a.get('/activity')).runningCount, 1)
  assert.equal((await b.get('/activity')).runningCount, 0)
  await a.dispose()
  assert.equal((await a.raw('/activity')).status, 404)
  assert.equal((await b.get('/state')).enabled, true)
})
test('aborted upload does not mutate settings and server accepts subsequent requests', async t => {
  const f = await fixture(t)
  const receiving = new Promise(resolve => f.server.once('request', req => req.once('data', resolve)))
  const req = httpRequest(f.base + '/dsh-capyreporter/image', { method: 'POST', headers: { origin: f.base, 'content-type': 'application/json', 'content-length': '100' } })
  const closed = new Promise(resolve => { req.on('error', resolve); req.on('close', resolve) })
  req.write('{')
  await receiving // Abort an actual in-flight body, not a socket before connection.
  req.destroy()
  await closed
  assert.equal((await f.get('/state')).hasCustom, false)
})
