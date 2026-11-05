import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { clampBounds, resizeBounds, dragBounds } = require('../runtime/electron-helper/geometry.cjs')
const mainFile = fileURLToPath(new URL('../runtime/electron-helper/main.js', import.meta.url))
const pageFile = fileURLToPath(new URL('../runtime/electron-helper/index.html', import.meta.url))
const mainSource = await readFile(mainFile, 'utf8')
const area = { x: 0, y: 0, width: 1707, height: 1019 }

test('geometry clamps to work areas including negative origins and small displays', () => {
  const left = { x: -1280, y: -200, width: 1280, height: 800 }
  assert.deepEqual(clampBounds({ x: -2000, y: -900, width: 300, height: 200 }, left), { x: -1280, y: -200, width: 300, height: 200 })
  assert.deepEqual(clampBounds({ x: 900, y: 900, width: 300, height: 200 }, left), { x: -300, y: 400, width: 300, height: 200 })
  assert.deepEqual(clampBounds({ x: 900, y: 900, width: 1600, height: 1200 }, left), { ...left })
})

test('same-size fitting is idempotent and resize preserves centre/bottom away from edges', () => {
  const bounds = { x: 400, y: 400, width: 300, height: 200 }
  assert.deepEqual(resizeBounds(bounds, { w: 300, h: 200 }, area), bounds)
  const next = resizeBounds(bounds, { w: 400, h: 300 }, area)
  assert.deepEqual(next, { x: 350, y: 300, width: 400, height: 300 })
  assert.deepEqual(resizeBounds(next, { w: 300, h: 200 }, area), bounds)
})

test('dragging uses fixed intended dimensions through repeated edge holds and display changes', () => {
  const start = { point: { x: 600, y: 700 }, bounds: { x: 400, y: 400, width: 284, height: 178 } }
  const size = { w: 284, h: 178 }
  for (let i = 0; i < 1000; i++) {
    assert.deepEqual(dragBounds(start, { x: 5000, y: 5000 }, size, area), { x: 1423, y: 841, width: 284, height: 178 })
  }
  const small = { x: -180, y: 0, width: 180, height: 150 }
  assert.deepEqual(dragBounds(start, { x: -5000, y: -5000 }, size, small), { ...small })
  assert.equal(dragBounds(start, { x: 1000, y: 700 }, size, area).width, 284, 'returning to a larger monitor restores requested dimensions')
})

// Run the REAL main-process handlers against a lossy Windows bounds adapter.
// getBounds/setPosition round-tripping grows the native window at fractional DPI;
// at 100% that old implementation appeared to work and the original smoke missed it.
async function mainHarness(scale) {
  const ipcMain = new EventEmitter(), app = new EventEmitter(), intervals = new Map()
  ipcMain.handle = () => {}
  app.disableHardwareAcceleration = () => {}
  app.whenReady = () => Promise.resolve()
  app.quit = () => {}
  let window, cursor = { x: 900, y: 500 }
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super(); window = this
      this.calls = []
      this.native = { x: options.x, y: options.y, width: options.width, height: options.height }
      this.webContents = new EventEmitter()
      this.webContents.mainFrame = { url: pathToFileURL(pageFile).href }
      this.webContents.setWindowOpenHandler = () => {}
      this.webContents.session = { setPermissionRequestHandler() {} }
    }
    getBounds() { return { ...this.native } }
    setBounds(b) {
      this.calls.push({ ...b })
      // Model the enclosing rectangle returned when native pixel edges fall
      // between DIPs. It must NEVER become the input size of the next move.
      this.native = { ...b, width: b.width + (scale === 1 ? 0 : 1), height: b.height + (scale === 1 ? 0 : 1) }
    }
    setPosition(x, y) { this.setBounds({ ...this.native, x, y }) }
    isDestroyed() { return false }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
    setIgnoreMouseEvents() {}
    focus() {}
    loadFile() { return Promise.resolve() }
  }
  const screen = new EventEmitter()
  screen.getPrimaryDisplay = screen.getDisplayMatching = screen.getDisplayNearestPoint = () => ({ workArea: area, scaleFactor: scale })
  screen.getCursorScreenPoint = () => ({ ...cursor })
  const context = vm.createContext({
    require: id => id === 'electron' ? { app, BrowserWindow, ipcMain, screen, shell: {} } : require(id.startsWith('.') ? fileURLToPath(new URL('../runtime/electron-helper/' + id, import.meta.url)) : id),
    __dirname: fileURLToPath(new URL('../runtime/electron-helper/', import.meta.url)),
    process: { env: { DSH_CAPYREP_TOKEN: 'test-only' }, connected: false }, console,
    setInterval: (fn, ms) => { intervals.set(ms, fn); return ms }, clearInterval: ms => intervals.delete(ms),
    setTimeout, clearTimeout, AbortController, Buffer,
  })
  vm.runInContext(mainSource, context, { filename: mainFile })
  await Promise.resolve()
  const event = { sender: window.webContents, senderFrame: window.webContents.mainFrame }
  const send = (channel, value) => ipcMain.emit('capyreporter:' + channel, event, value)
  return { window, send, tick: () => intervals.get(16)?.(), cursor: value => { cursor = value } }
}

for (const scale of [1, 1.25, 1.5, 1.75, 2]) {
  test(`main drag never feeds rounded dimensions back at ${scale * 100}% DPI`, async () => {
    const h = await mainHarness(scale)
    h.send('resize', { w: 284, h: 178 })
    for (let drag = 0; drag < 4; drag++) {
      h.cursor({ x: 900, y: 500 }); h.send('drag-start')
      h.cursor({ x: 5000, y: 5000 })
      for (let tick = 0; tick < 100; tick++) h.tick()
      h.send('drag-end')
      const b = h.window.getBounds()
      assert.equal(b.x, 1423)
      assert.equal(b.y, 841)
      assert.ok(b.width <= 285 && b.height <= 179, 'native enclosing rectangle stays within one DIP instead of growing each tick')
    }
    assert.ok(h.window.calls.length < 10, 'holding a stationary cursor at an edge does not keep moving/resizing the window')
    for (const bounds of h.window.calls) {
      assert.equal(bounds.width, 284); assert.equal(bounds.height, 178)
    }
    h.send('resize', { w: Number.NaN, h: 178 })
    h.send('resize', { w: 20, h: 178 })
    h.send('resize', { w: 1e9, h: 178 })
    assert.equal(h.window.getBounds().width, scale === 1 ? 284 : 285)
  })
}
