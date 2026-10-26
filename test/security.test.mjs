import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { authorize, helperEnv, MAX_BODY_BYTES, readJson, validBaseUrl, validatePng } from '../lib/security.js'
const require = createRequire(import.meta.url)
const policy = require('../runtime/electron-helper/policy.cjs')

for (const fn of [validBaseUrl, policy.origin]) {
  test(fn.name + ' restricts desktop targets to exact loopback HTTP(S) origins', () => {
    for (const url of ['http://127.0.0.1:4567', 'http://localhost:3080/', 'http://[::1]:3080/']) assert.equal(fn(url), new URL(url).origin)
    for (const url of ['file:///tmp/a', 'https://evil.example', 'http://localhost.evil.example', 'http://user:secret@localhost:3080', 'http://localhost:3080/path', 'http://localhost:3080/?secret=1', 'http://localhost:3080/#x']) assert.throws(() => fn(url))
  })
}
test('desktop environment keeps OS display support without provider keys or Node injection', () => {
  const env = helperEnv({ Path: 'bin', SystemRoot: 'C:/Windows', DISPLAY: ':0', HOME: '/home/test', OPENAI_API_KEY: 'secret', GH_TOKEN: 'secret', DSH_WEB_TOKEN: 'secret', NODE_OPTIONS: '--require evil', ELECTRON_RUN_AS_NODE: '1' }, 'http://127.0.0.1:3080', 'capability')
  assert.deepEqual(env, { Path: 'bin', SystemRoot: 'C:/Windows', DISPLAY: ':0', HOME: '/home/test', DSH_CAPYREP_BASE_URL: 'http://127.0.0.1:3080', DSH_CAPYREP_TOKEN: 'capability' })
})
test('capabilities are exact, activation scoped and constrained by Host and remote address', () => {
  const request = { headers: { host: '127.0.0.1:3080', authorization: 'Bearer secret' }, socket: { remoteAddress: '127.0.0.1' } }
  assert.equal(authorize(request, 3080, 'secret'), 'helper')
  assert.equal(authorize(request, 3080, 'other'), null)
  for (const host of ['evil.example:3080', '127.0.0.1:9000', 'localhost:3080/evil']) assert.equal(authorize({ ...request, headers: { ...request.headers, host } }, 3080, 'secret'), null)
  assert.equal(authorize({ ...request, socket: { remoteAddress: '192.168.1.1' } }, 3080, 'secret'), null)
})
test('body reader rejects malformed JSON, arrays and null; accepts a JSON object', async () => {
  for (const text of ['null', '[]', '0', '{']) {
    const req = new PassThrough(); req.headers = { 'content-type': 'application/json' }
    const result = assert.rejects(readJson(req), { status: 400 }); req.end(text); await result
  }
  const req = new PassThrough(); req.headers = { 'content-type': 'application/json; charset=utf-8' }
  const result = readJson(req); req.end('{"enabled":false}'); assert.deepEqual(await result, { enabled: false })
})
test('body reader bounds chunked uploads, aborts and slow requests, removing listeners', async t => {
  const req = new PassThrough(); req.headers = { 'content-type': 'application/json' }
  const result = assert.rejects(readJson(req), { status: 413 }); req.write(Buffer.alloc(MAX_BODY_BYTES + 1)); await result
  assert.equal(req.listenerCount('data'), 0)
  const aborted = new PassThrough(); aborted.headers = req.headers
  const abortion = assert.rejects(readJson(aborted), { status: 400 }); aborted.emit('aborted'); await abortion
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const slow = new PassThrough(); slow.headers = req.headers
  const timeout = assert.rejects(readJson(slow), { status: 408 }); t.mock.timers.tick(5001); await timeout
  assert.equal(slow.listenerCount('data'), 0)
})
test('body reader rejects oversized declared lengths and wrong media types immediately', async () => {
  await assert.rejects(readJson({ headers: { 'content-type': 'text/plain' } }), { status: 415 })
  await assert.rejects(readJson({ headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) } }), { status: 413 })
})
test('PNG validation rejects mismatched, truncated and unbounded artwork without recursive base64 regex', () => {
  for (const text of ['', 'AAAA', 'abcd=', 'abcd\n', Buffer.from('<svg></svg>').toString('base64')]) assert.throws(() => validatePng(text), { status: 400 })
  assert.throws(() => validatePng('A'.repeat(MAX_BODY_BYTES + 4)), { status: 400 })
  assert.throws(() => validatePng('A'.repeat(4_000_000)), { status: 400 })
})
test('Electron IPC only accepts the owned top-level local frame', () => {
  const filename = new URL('../runtime/electron-helper/index.html', import.meta.url)
  const mainFrame = { url: filename.href }, contents = { mainFrame }, win = { webContents: contents, isDestroyed: () => false }
  const trusted = { sender: contents, senderFrame: mainFrame }
  assert.equal(policy.trustedSender({ sender: contents, senderFrame: { url: filename.href } }, win, fileURLToPath(filename)), false, 'same-URL child frame is not trusted')
  assert.equal(policy.trustedSender(trusted, win, fileURLToPath(filename)), true)
  for (const event of [{ ...trusted, sender: {} }, { ...trusted, senderFrame: { url: 'https://evil.example' } }, { ...trusted, senderFrame: { url: filename.href + '?url=evil' } }, { sender: contents }]) assert.equal(policy.trustedSender(event, win, fileURLToPath(filename)), false)
})
test('Electron request allowlist rejects arbitrary URLs, paths, verbs and large payloads', () => {
  assert.equal(policy.requestSpec('/state'), 'GET')
  assert.equal(policy.requestSpec('/scale', { scale: 1 }), 'POST')
  assert.equal(policy.requestSpec('/desktop/navigate', { sessionId: 'a' }), 'POST')
  assert.throws(() => policy.requestSpec('/language', { language: 'de' }), 'page settings stay outside the pet helper allowlist')
  for (const path of ['/enabled', '/reset', '/../../state', 'https://evil.example', '__proto__', 'constructor', null]) assert.throws(() => policy.requestSpec(path, {}))
  assert.throws(() => policy.requestSpec('/state', {}))
  assert.throws(() => policy.requestSpec('/scale', { value: 'x'.repeat(1024) }))
})
