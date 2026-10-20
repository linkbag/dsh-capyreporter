import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../../lib/index.js'

export async function fixture(t, initial = {}, services = {}, fallback) {
  const home = await mkdtemp(join(tmpdir(), 'capyreporter-test-'))
  const config = { enabled: true, desktopEnabled: false, customImage: null, scale: 1, ...initial }
  await writeFile(join(home, 'capyreporter.json'), JSON.stringify(config))
  const subscriptions = new Map(), disposers = [], warnings = []
  let handler
  const server = createServer((req, res) => {
    if (handler && req.url.startsWith('/dsh-capyreporter/')) void handler(req, res)
    else if (fallback) fallback(req, res)
    else { res.statusCode = 404; res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port, base = 'http://127.0.0.1:' + port
  const ctx = {
    webServer: { port, register(route) { handler = route.handler; return () => { handler = null } } },
    logger: { warn: message => warnings.push(message) },
    get: name => services[name],
    on(name, fn, options) {
      assert.equal(options?.global, true, 'reporter must see scoped agent/session events globally')
      subscriptions.set(name, fn)
      disposers.push(() => subscriptions.delete(name))
    },
    effect(factory) { disposers.push(factory()) },
  }
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try { apply(ctx) } finally { if (previous === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previous }
  let disposed = false
  const dispose = async () => { if (!disposed) { disposed = true; for (const fn of disposers.reverse()) await fn?.() } }
  t.after(async () => { await dispose(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(home, { recursive: true, force: true }) })
  const raw = (path, init = {}) => fetch(base + '/dsh-capyreporter' + path, { ...init, headers: { origin: base, ...init.headers } })
  const get = async path => { const response = await raw(path); assert.equal(response.status, 200); return response.json() }
  const post = (path, value, headers = {}) => raw(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(value) })
  const emit = (type, ...args) => subscriptions.get(type)?.(...args)
  return { home, base, port, server, ctx, emit, dispose, warnings, raw, get, post }
}
