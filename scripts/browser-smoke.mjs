// Isolated real-browser and Electron smoke tests; never uses your DSH settings.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { chromium, _electron as electron } from 'playwright'
import { fixture } from '../test/helpers/host-fixture.mjs'
import { authorize, helperEnv } from '../lib/security.js'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const reports = join(root, 'reports')
await mkdir(reports, { recursive: true })
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated CapyReporter UI test</title></head><body style="font:14px system-ui;margin:24px;max-width:900px"><h1>CapyReporter integration fixture</h1><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script>
const registered={}, meta={}, cleanup=[];
const ctx={effect(f){cleanup.push(f())},get(name){return name==='uiWorkspace'?(window.__CapyUi||undefined):undefined},slots:{inject(_n,f){const r=f();if(r&&typeof r[Symbol.iterator]==='function')for(const d of r)cleanup.push(d)},register(m,component){if(!m||!m.name||!m.id)throw Error('bad slot registration');registered[m.id]=component;meta[m.id]=m}}};
window.__CapyUi={openSession(id){window.__CapyOpened=id}};
window.__CapySlots=meta;
window.__ModuleLoader__={load({factory}){factory(n=>{if(n==='react')return React;throw Error(n)}).apply(ctx);const root=ReactDOM.createRoot(document.getElementById('app'));root.render(React.createElement(React.Fragment,null,...Object.values(registered).map((C,i)=>React.createElement(C,{key:i}))));window.unmountPlugin=()=>{root.unmount();cleanup.reverse().forEach(f=>f&&f())}}};
</script><script src="/client.js"></script></body></html>`

async function browserAssets() {
  const reactRoot = dirname(require.resolve('react/package.json'))
  const domRoot = dirname(require.resolve('react-dom/package.json'))
  return new Map([
    ['/', ['text/html', Buffer.from(html)]],
    ['/react.js', ['text/javascript', await readFile(join(reactRoot, 'umd/react.development.js'))]],
    ['/react-dom.js', ['text/javascript', await readFile(join(domRoot, 'umd/react-dom.development.js'))]],
    ['/client.js', ['text/javascript', await readFile(join(root, 'lib/client.js'))]],
  ])
}

test('real Chromium: reporting, parallel results, keyboard/drag, artwork revisions, reconnect and cleanup', { timeout: 90_000 }, async t => {
  const assets = await browserAssets()
  const session = { id: 'first', header: { cwd: 'C:/test-project' } }
  const f = await fixture(t, { enabled: false }, {
    sessions: { get: id => ({ ...session, id }) }, workspaceRegistry: { list: () => [{ path: 'C:/test-project', title: 'Audit project' }] },
    sessionTitle: { get: s => ({ title: s.id === 'first' ? 'Reporting audit' : 'Parallel task' }) },
  }, (req, res) => { const asset = assets.get(req.url); res.writeHead(asset ? 200 : 404, { 'content-type': asset?.[0] || 'text/plain' }); res.end(asset?.[1] || 'Not found') })
  const browser = await chromium.launch({ channel: process.env.DSH_TEST_BROWSER_CHANNEL || 'chrome', headless: true })
  t.after(() => browser.close())
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(f.base)
  const slots = await page.evaluate(() => Object.fromEntries(Object.entries(window.__CapySlots).map(([id, m]) => [id, { name: m.name, order: m.order, label: m.label }])))
  assert.deepEqual(slots['dsh-capyreporter-overlay'], { name: 'shell.overlay', order: 500, label: undefined })
  assert.deepEqual(slots['dsh-capyreporter'], { name: 'settings.section', order: 90, label: '🐾 CapyReporter' })
  const settings = page.locator('.dsh-capy-section'), pet = page.getByRole('button', { name: 'CapyReporter controls; drag to move', exact: true })
  await settings.getByText('Connected · desktop off', { exact: true }).waitFor({ timeout: 8000 }).catch(async error => { console.error('UI diagnostics:', errors, await page.locator('body').innerText()); throw error })
  assert.equal(await pet.count(), 0, 'disabled pet must not flash during bootstrap')
  await settings.getByRole('button', { name: 'Show pet', exact: true }).click()
  await pet.waitFor({ state: 'visible' })
  const agent = { id: 'first', session }
  f.emit('agent/status', { agent, status: 'running' })
  f.emit('session/event', session, { type: 'turn/start', data: { turn: 1 } })
  f.emit('session/event', session, { type: 'tool/call', data: { name: 'ops_bash' } })
  const bubble = page.getByRole('region', { name: 'CapyReporter activity' })
  await bubble.waitFor()
  assert.equal(await bubble.getByText('🔧 ops_bash').count(), 0, 'tool chatter must not become the collapsed milestone')
  await bubble.getByRole('button', { name: 'Go to chat', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__CapyOpened), 'first', 'Go to chat opens the running session shown in the bubble')
  const width = () => bubble.evaluate(el => el.getBoundingClientRect().width)
  const height = () => bubble.evaluate(el => el.getBoundingClientRect().height)
  const corner = bubble.getByRole('separator', { name: 'Resize bubble (pixels)' })
  const settleWidth = (expect, tolerance = 1) => page.waitForFunction(([e, t]) => Math.abs(document.querySelector('.dsh-capy-bubble')?.getBoundingClientRect().width - e) <= t, [expect, tolerance])
  const settleHeightAbove = minimum => page.waitForFunction(m => (document.querySelector('.dsh-capy-bubble')?.getBoundingClientRect().height || 0) > m, minimum)
  const startWidth = await width()
  await corner.press('ArrowLeft')
  await settleWidth(startWidth + 16)
  assert.ok((await width()) > startWidth, 'ArrowLeft widens the bubble')
  await bubble.dispatchEvent('wheel', { deltaY: -120, ctrlKey: true, bubbles: true })
  // Wait for the wheel step to settle exactly; reading too early can observe the
  // intermediate value and turn the next ArrowRight assertion into a 30 s flake.
  await settleWidth(startWidth + 32)
  const widened = await width()
  assert.ok(widened > startWidth + 8, 'Ctrl+wheel over the bubble widens it')
  await corner.press('ArrowRight')
  await settleWidth(widened - 16)
  const narrowed = await width()
  assert.ok(Math.abs(narrowed - (widened - 16)) <= 1, 'ArrowRight narrows the bubble by one step')
  // Free resize: drag the east edge outward with the mouse.
  const east = bubble.locator('.dsh-capy-rz-e')
  const eastBox = await east.boundingBox()
  const preDrag = await width()
  await page.mouse.move(eastBox.x + eastBox.width / 2, eastBox.y + eastBox.height / 2)
  await page.mouse.down(); await page.mouse.move(eastBox.x + eastBox.width / 2 + 48, eastBox.y + eastBox.height / 2, { steps: 4 }); await page.mouse.up()
  await settleWidth(preDrag + 48, 2)
  assert.ok(Math.abs((await width()) - (preDrag + 48)) <= 2, 'dragging the east edge widens the bubble')
  await page.waitForTimeout(300)
  const storedAuto = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-capyreporter:bubbleSize') || '{}'))
  assert.equal(storedAuto.fixed ?? false, false, 'width-only resizing keeps the height content-driven')
  // Drag the south-east corner down to pin the height.
  const preHeight = await height()
  const cornerBox = await corner.boundingBox()
  await page.mouse.move(cornerBox.x + cornerBox.width / 2, cornerBox.y + cornerBox.height / 2)
  await page.mouse.down(); await page.mouse.move(cornerBox.x + cornerBox.width / 2 - 24, cornerBox.y + cornerBox.height / 2 + 90, { steps: 5 }); await page.mouse.up()
  await settleHeightAbove(preHeight + 40)
  assert.ok((await height()) > preHeight + 40, 'dragging the south-east corner grows the bubble height')
  await corner.press('ArrowDown')
  await settleHeightAbove(preHeight + 40 + 15)
  assert.ok((await height()) > preHeight + 40 + 15, 'ArrowDown on the corner handle raises the height further')
  const actionsBox = await bubble.locator('.dsh-capy-actions').boundingBox()
  const pinnedBox = await bubble.boundingBox()
  assert.ok(Math.abs((actionsBox.y + actionsBox.height) - (pinnedBox.y + pinnedBox.height)) < 24, 'action buttons stick to the bottom of a resized bubble')
  const dismiss = bubble.getByRole('button', { name: 'Dismiss', exact: true })
  await dismiss.waitFor()
  await dismiss.click()
  await bubble.waitFor({ state: 'hidden' })
  assert.equal((await f.get('/state')).snoozed, false, 'dismissing a running bubble must hide it without muting')
  for (const text of ['Checking', ' ', 'the real browser']) f.emit('session/event', session, { type: 'assistant/chunk', data: { step: 1, chunk: { type: 'text-delta', text } } })
  await page.getByText('Checking the real browser', { exact: true }).waitFor()
  await bubble.getByRole('button', { name: 'Details', exact: true }).click()
  await bubble.getByText('🔧 ops_bash', { exact: false }).waitFor()
  const other = { id: 'second', header: session.header }
  f.emit('agent/status', { agent: { id: other.id, session: other }, status: 'running' })
  f.emit('session/event', session, { type: 'turn/end', data: { reason: { kind: 'aborted' } } })
  f.emit('agent/status', { agent, status: 'idle' })
  await bubble.getByText(/Run cancelled.*1 still running/).waitFor()
  await page.screenshot({ path: join(reports, 'browser-smoke.png'), fullPage: true })
  await bubble.getByRole('button', { name: 'Dismiss result', exact: true }).click()
  await bubble.getByText(/1 running.*Parallel task/).waitFor()
  assert.equal((await f.get('/activity')).completed, null)
  await settings.getByText('Status bubble', { exact: true }).waitFor()
  // Language switching is immediate, localized, persisted and drives RTL.
  const language = settings.locator('select', { has: page.locator('option[value="auto"]') })
  // Native selects render an OS popup that ignores inherited colors; assert the plugin
  // pins concrete option colors so the choices are never white-on-white in a dark theme.
  const optionStyles = await language.evaluate(node => {
    const option = node.querySelector('option')
    const style = getComputedStyle(option)
    return { color: style.color, background: style.backgroundColor }
  })
  assert.deepEqual(optionStyles, { color: 'rgb(34, 36, 44)', background: 'rgb(253, 253, 247)' }, 'select options keep readable colors')
  await language.selectOption('es')
  const bubbleEl = page.locator('.dsh-capy-bubble')
  await bubbleEl.getByRole('button', { name: 'Ir al chat', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('dsh-capyreporter:lang')), 'es')
  assert.equal(await bubbleEl.getAttribute('aria-label'), 'Actividad de CapyReporter')
  await language.selectOption('ar')
  await page.waitForFunction(() => document.querySelector('.dsh-capy-section')?.getAttribute('dir') === 'rtl')
  await language.selectOption('en')
  await bubbleEl.getByRole('button', { name: 'Go to chat', exact: true }).waitFor()
  assert.equal(await bubbleEl.getAttribute('aria-label'), 'CapyReporter activity')
  // The page half consumes a one-shot desktop navigation request.
  await page.route('**/dsh-capyreporter/state', async route => {
    const response = await route.fetch(), body = await response.json()
    if (!body.navigate) body.navigate = { sessionId: 'second', at: Date.now() }
    await route.fulfill({ response, json: body })
  })
  await page.waitForFunction(() => window.__CapyOpened === 'second', null, { timeout: 8000 })
  await page.unroute('**/dsh-capyreporter/state')
  await bubble.getByRole('button', { name: 'Mute 30 min', exact: true }).click()
  await bubble.waitFor({ state: 'hidden' })
  assert.equal((await f.get('/state')).snoozed, true)
  f.emit('session/event', other, { type: 'tool/call', data: { name: 'read' } })
  await page.waitForTimeout(1500)
  assert.equal(await bubble.count(), 0, 'snooze keeps the bubble hidden across activity changes')
  await settings.getByRole('button', { name: 'Unmute', exact: true }).click()
  await bubble.waitFor({ state: 'visible' })

  const before = await pet.boundingBox()
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down(); await page.mouse.move(before.x + before.width / 2 + 150, before.y + before.height / 2 - 80, { steps: 8 }); await page.mouse.up()
  assert.equal(await page.getByRole('group', { name: 'CapyReporter controls', exact: true }).count(), 0, 'drag does not click the pet')
  await pet.focus(); await page.keyboard.press('Enter')
  await page.getByRole('group', { name: 'CapyReporter controls', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('group', { name: 'CapyReporter controls', exact: true }).waitFor({ state: 'hidden' })
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('dsh-capyreporter:position'))?.left > 100)
  await page.reload(); await pet.waitFor()
  assert.ok((await pet.boundingBox()).x > 100, 'page position survives reload')
  await bubble.waitFor()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-capyreporter:bubbleSize')))
  assert.equal(stored.fixed, true, 'manual resize pins the bubble height')
  assert.ok(Math.abs((await width()) - stored.w) <= 1, 'bubble width survives reload')
  assert.ok(Math.abs((await height()) - stored.h) <= 1, 'bubble height survives reload')
  // Double-clicking a resize handle restores the defaults (content-driven height again).
  await corner.dblclick()
  await settleWidth(360)
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('dsh-capyreporter:bubbleSize') || '{}').fixed === false)
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-capyreporter:bubbleSize') || '{}').fixed)), false, 'double-clicking a handle makes the height content-driven again')
  assert.ok(Math.abs((await width()) - 360) <= 1, 'double-clicking a handle restores the default width')

  // Hide/show must rebind non-passive Ctrl+wheel without duplicate handlers.
  await settings.getByRole('button', { name: 'Hide pet', exact: true }).click(); await pet.waitFor({ state: 'hidden' })
  await settings.getByRole('button', { name: 'Show pet', exact: true }).click(); await pet.waitFor()
  await pet.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true })
  await page.waitForFunction(() => document.querySelector('input[type=range]').value === '110')
  assert.equal((await f.get('/state')).scale, 1.1)

  const source = async color => page.evaluate(color => { const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').fillStyle = color; c.getContext('2d').fillRect(0, 0, 16, 16); return c.toDataURL('image/png') }, color)
  const input = page.locator('input[type=file]')
  let previousSrc = await pet.locator('img').getAttribute('src')
  for (const color of ['#2680ff', '#ff5630']) {
    const data = await source(color)
    await input.setInputFiles({ name: 'pet.png', mimeType: 'image/png', buffer: Buffer.from(data.split(',')[1], 'base64') })
    await page.waitForFunction(previous => document.querySelector('.dsh-capy-pet img').getAttribute('src') !== previous, previousSrc)
    previousSrc = await pet.locator('img').getAttribute('src')
    assert.ok(await pet.locator('img').evaluate(img => img.complete && img.naturalWidth === 16))
  }
  await input.setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await settings.getByRole('alert').filter({ hasText: 'Choose a PNG' }).waitFor()

  await page.route('**/dsh-capyreporter/state', route => route.abort())
  await settings.getByText(/Reporter disconnected/).waitFor()
  await pet.waitFor({ state: 'visible' })
  await page.unroute('**/dsh-capyreporter/state')
  await settings.getByText('Connected · desktop off', { exact: true }).waitFor()
  // A failed settings mutation must be visible, not an optimistic success.
  await page.route('**/dsh-capyreporter/scale', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Test write failure"}' }))
  await pet.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true })
  await page.getByRole('alert').filter({ hasText: 'Test write failure' }).waitFor()
  await page.unroute('**/dsh-capyreporter/scale')
  assert.equal((await f.get('/state')).scale, 1.1)
  // Thinking is opt-in: reasoning becomes the live milestone only after the toggle.
  await settings.getByRole('button', { name: 'Show thinking', exact: true }).click()
  f.emit('session/event', other, { type: 'assistant/chunk', data: { step: 1, chunk: { type: 'reasoning-delta', text: 'weighing the options' } } })
  await page.getByText('💭 weighing the options', { exact: true }).waitFor()
  await settings.getByRole('button', { name: 'Hide thinking', exact: true }).click()
  await page.evaluate(() => window.unmountPlugin())
  assert.equal(await page.locator('[data-plugin-css="dsh-capyreporter"]').count(), 0)
  assert.equal(await pet.count(), 0)
  assert.deepEqual(errors, [])
})

test('real Chromium: zh-CN locale localizes bubble, actions and settings', { timeout: 60_000 }, async t => {
  const assets = await browserAssets()
  const session = { id: 'zh', header: { cwd: 'C:/test-project' } }
  const f = await fixture(t, { enabled: true }, {
    sessions: { get: id => ({ ...session, id }) }, workspaceRegistry: { list: () => [{ path: 'C:/test-project', title: 'Audit project' }] },
    sessionTitle: { get: () => ({ title: '翻译检查' }) },
  }, (req, res) => { const asset = assets.get(req.url); res.writeHead(asset ? 200 : 404, { 'content-type': asset?.[0] || 'text/plain' }); res.end(asset?.[1] || 'Not found') })
  const browser = await chromium.launch({ channel: process.env.DSH_TEST_BROWSER_CHANNEL || 'chrome', headless: true })
  t.after(() => browser.close())
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(f.base)
  const pet = page.getByRole('button', { name: 'CapyReporter 控制；可拖动移动', exact: true })
  await pet.waitFor()
  const bubble = page.getByRole('region', { name: 'CapyReporter 动态' })
  const agent = { id: 'zh', session }
  f.emit('agent/status', { agent, status: 'running' })
  f.emit('session/event', session, { type: 'assistant/chunk', data: { step: 1, chunk: { type: 'text-delta', text: '正在核对翻译' } } })
  await bubble.waitFor()
  await bubble.getByText(/1 个运行中 — Audit project · 翻译检查/).waitFor({ timeout: 8000 }).catch(async error => { console.error('zh diagnostics:', await page.evaluate(() => navigator.language), await page.locator('body').innerText(), await f.get('/activity')); throw error })
  await bubble.getByRole('button', { name: '详情', exact: true }).waitFor()
  await bubble.getByRole('button', { name: '转到会话', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__CapyOpened), 'zh', '中文界面同样能转到对应会话')
  await bubble.getByRole('button', { name: '忽略', exact: true }).click()
  await bubble.waitFor({ state: 'hidden' })
  assert.equal((await f.get('/state')).snoozed, false, '中文忽略同样只隐藏气泡，不得静音')
  const settings = page.locator('.dsh-capy-section')
  await settings.getByText('悬浮宠物', { exact: true }).waitFor()
  await settings.getByText('状态气泡', { exact: true }).waitFor()
  await settings.getByText('汇报思考过程', { exact: true }).waitFor()
  await settings.getByRole('button', { name: '隐藏宠物', exact: true }).waitFor()
  await page.evaluate(() => window.unmountPlugin())
  assert.equal(await pet.count(), 0)
})

const electronPath = process.env.DSH_PET_ELECTRON_PATH || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'electron', process.platform === 'win32' ? 'electron.exe' : 'electron')
test('real host + Electron: spawn, capability readiness, hide/show and awaited disposal', { timeout: 45_000, skip: !existsSync(electronPath) && 'Set DSH_PET_ELECTRON_PATH to run native host coverage' }, async t => {
  const previous = process.env.DSH_PET_ELECTRON_PATH
  process.env.DSH_PET_ELECTRON_PATH = electronPath
  t.after(() => { if (previous === undefined) delete process.env.DSH_PET_ELECTRON_PATH; else process.env.DSH_PET_ELECTRON_PATH = previous })
  const f = await fixture(t, { enabled: true, desktopEnabled: false })
  const ready = async () => {
    const until = Date.now() + 15_000
    while (Date.now() < until) {
      const state = await f.get('/state')
      if (state.desktop) return state
      assert.notEqual(state.desktopStatus, 'unavailable', state.desktopError + '\n' + f.warnings.join('\n'))
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Host never received desktop heartbeat: ' + f.warnings.join('\n'))
  }
  const start = await (await f.post('/desktop/show', {})).json()
  assert.equal(start.desktopEnabled, true)
  assert.equal(start.desktop, false, 'spawn alone must not hide the page pet')
  assert.equal((await ready()).desktopStatus, 'ready')
  const hidden = await (await f.post('/desktop/hide', {})).json()
  assert.equal(hidden.desktop, false); assert.equal(hidden.desktopStatus, 'off')
  await f.post('/desktop/show', {})
  assert.equal((await ready()).desktopStatus, 'ready')
  await f.dispose()
  assert.equal((await f.raw('/state')).status, 404)
})

test('real Electron: sandboxed bridge, ready handshake, aspect fitting, same-size no drift and lost-host exit', { timeout: 60_000, skip: !existsSync(electronPath) && 'Set DSH_PET_ELECTRON_PATH to run native smoke coverage' }, async t => {
  const token = 'isolated-smoke-capability', artwork = await readFile(join(root, 'assets/capybara.png'))
  let alive = true, heartbeat = 0, requested = [], navigated = [], heartbeatReady
  const ready = new Promise(resolve => { heartbeatReady = resolve })
  const state = { enabled: true, desktopEnabled: true, desktop: false, scale: 1, hasCustom: false, imageRevision: 0, language: 'de', snoozed: false, snoozeMinutes: 30 }
  const activity = { running: [{ id: 'desk', title: 'Desktop session', kind: null, preview: null, lines: [] }], runningCount: 1, completed: null }
  const server = createServer((req, res) => {
    const role = authorize(req, server.address().port, token)
    requested.push(req.url)
    if (!role || !alive) { req.resume(); res.writeHead(role ? 503 : 403); return res.end('{}') }
    if (req.url === '/dsh-capyreporter/image') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(artwork) }
    if (req.url.endsWith('/desktop/navigate')) {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => { navigated.push(JSON.parse(body)); res.setHeader('content-type', 'application/json'); res.end('{"ok":true}') })
      return
    }
    req.resume(); res.setHeader('content-type', 'application/json')
    if (req.url.endsWith('/state')) res.end(JSON.stringify(state))
    else if (req.url.endsWith('/activity')) res.end(JSON.stringify(activity))
    else if (req.url.endsWith('/desktop/heartbeat')) { heartbeat++; heartbeatReady(); res.end('{"ok":true}') }
    else if (req.url.endsWith('/scale')) res.end('{"ok":true}')
    else { res.statusCode = 404; res.end('{}') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
  const base = 'http://127.0.0.1:' + server.address().port
  const app = await electron.launch({ executablePath: electronPath, args: [join(root, 'runtime/electron-helper/main.js')], env: helperEnv(process.env, base, token), timeout: 30_000 })
  t.after(async () => { try { await app.close() } catch {} })
  const page = await app.firstWindow(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.waitForFunction(() => document.getElementById('img').complete && document.getElementById('img').naturalWidth > 0)
  await page.waitForFunction(() => document.getElementById('img').style.height !== '')
  await Promise.race([ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Desktop heartbeat missing')), 8000).unref())]).catch(async error => { console.error('Desktop diagnostics:', errors, requested, await page.locator('body').innerText()); throw error })
  assert.ok(heartbeat > 0, 'desktop readiness follows image decode and activity bootstrap')
  const preferences = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences())
  assert.equal(preferences.sandbox, true); assert.equal(preferences.contextIsolation, true); assert.equal(preferences.nodeIntegration, false)
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  const capLeak = await page.evaluate(() => JSON.stringify(Object.keys(window.petBridge)))
  assert.ok(!capLeak.includes(token))
  await assert.rejects(page.evaluate(() => window.petBridge.request('https://evil.example')), /not allowed|Unsupported/)
  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
  for (let i = 0; i < 4; i++) await page.evaluate(b => window.petBridge.resize({ w: b.width, h: b.height }), bounds)
  assert.deepEqual(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds()), bounds, 'same-size fitting must not move the window')
  const fit = await page.locator('#img').evaluate(img => ({ actual: img.getBoundingClientRect().height, expected: parseFloat(img.style.height) }))
  assert.ok(Math.abs(fit.actual - fit.expected) < 1, 'actual artwork is not clamped by its own viewport')
  await page.locator('#img').focus(); await page.keyboard.press('Enter')
  await page.locator('#menu').waitFor({ state: 'visible' })
  await page.keyboard.press('Escape'); await page.locator('#menu').waitFor({ state: 'hidden' })
  // Desktop parity: the companion follows the host language, resizes freely and
  // can hand a session back to the browser page.
  const chatButton = page.locator('#chatButton')
  await chatButton.waitFor({ state: 'visible' })
  assert.equal((await chatButton.textContent()).trim(), 'Zum Chat', 'desktop bubble follows the host language')
  assert.equal(await page.locator('#bubble .rz').count(), 8, 'desktop bubble exposes every resize edge')
  const grip = page.locator('#bubble .rz-se')
  await grip.focus()
  const bubbleWidth = () => page.locator('#bubble').evaluate(node => node.getBoundingClientRect().width)
  const beforeResize = await bubbleWidth()
  await grip.press('ArrowLeft')
  await page.waitForFunction(width => document.getElementById('bubble').getBoundingClientRect().width > width + 8, beforeResize)
  const grownBounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
  assert.ok(grownBounds.width > bounds.width, 'resizing the desktop bubble grows the window')
  await chatButton.click()
  for (let i = 0; i < 40 && !navigated.length; i++) await page.waitForTimeout(50)
  assert.deepEqual(navigated.at(-1), { sessionId: 'desk' }, 'Go to chat asks the page half to open the session')
  await page.screenshot({ path: join(reports, 'electron-smoke.png') })
  assert.ok(requested.every(path => path.startsWith('/dsh-capyreporter/')))
  assert.deepEqual(errors, [])
  const closed = app.waitForEvent('close', { timeout: 20_000 })
  alive = false
  await closed
})
