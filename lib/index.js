// dsh-capyreporter — host half.
// A persistent floating desktop pet bundle. Host serves the pet image + activity
// over webServer routes, tracks running tasks from host events, and spawns an
// always-on-top transparent Electron window that shows the pet over other apps.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = 'capyreporter'
const inject = ['webServer']

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const ROUTE = '/dsh-capyreporter'
const HELPER_MAIN = join(PACKAGE_ROOT, 'runtime', 'electron-helper', 'main.js')

function dshHome() {
  const u = process.env.USERPROFILE || process.env.HOME || ''
  return process.env.DSH_HOME || (u ? u + '\\.dsh' : '.dsh')
}
const CONFIG_PATH = join(dshHome(), 'capyreporter.json')

const state = {
  enabled: true,
  customImage: null, // base64 payload (after the data: prefix), or null for default
  desktopEnabled: true,
  scale: 1, // uniform pet size multiplier shared by the page overlay and the desktop window
  desktopRunning: false,
  helperChild: null,
  defaultBuffer: null,
  completed: null,
  running: new Map(),
  workspaceNames: new Map(), // normalized workspace path -> workspace title (project name)
}

function loadConfig() {
  // Fresh installs read the new config path; local upgrades migrate their
  // settings (e.g. the custom pet image) from the old homura-pet.json.
  try {
    const p = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    if (typeof p.enabled === 'boolean') state.enabled = p.enabled
    if (typeof p.customImage === 'string' && p.customImage) state.customImage = p.customImage
    if (typeof p.desktopEnabled === 'boolean') state.desktopEnabled = p.desktopEnabled
    if (typeof p.scale === 'number' && Number.isFinite(p.scale)) state.scale = Math.min(2.5, Math.max(0.5, p.scale))
    return
  } catch (e) {}
  try {
    const p = JSON.parse(readFileSync(join(dshHome(), 'homura-pet.json'), 'utf8'))
    if (typeof p.enabled === 'boolean') state.enabled = p.enabled
    if (typeof p.customImage === 'string' && p.customImage) state.customImage = p.customImage
    if (typeof p.desktopEnabled === 'boolean') state.desktopEnabled = p.desktopEnabled
    if (typeof p.scale === 'number' && Number.isFinite(p.scale)) state.scale = Math.min(2.5, Math.max(0.5, p.scale))
  } catch (e) {}
}
function saveConfig() {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify({ enabled: state.enabled, customImage: state.customImage, desktopEnabled: state.desktopEnabled, scale: state.scale }, null, 2), 'utf8')
  } catch (e) {}
}

function resolveElectron() {
  const u = process.env.USERPROFILE || process.env.HOME || ''
  const local = process.env.LOCALAPPDATA || (u ? u + '/AppData/Local' : '')
  const appData = process.env.APPDATA || (u ? u + '/AppData/Roaming' : '')
  const list = [
    process.env.DSH_PET_ELECTRON_PATH,
    process.env.ELECTRON_PATH,
    join(dshHome(), 'electron', 'electron.exe'),
    join(appData, 'npm', 'node_modules', 'electron', 'dist', 'electron.exe'),
    join(local, 'Programs', 'Electron', 'electron.exe'),
    'C:/Program Files/Electron/electron.exe',
    'C:/Program Files (x86)/Electron/electron.exe',
  ]
  for (const c of list) if (c && existsSync(c)) return c
  return undefined
}

function startHelper() {
  if (state.helperChild || state.desktopEnabled !== true || !state.enabled) return
  const exe = resolveElectron()
  if (!exe || !existsSync(HELPER_MAIN)) return
  const baseUrl = process.env.DSH_CAPYREP_BASE_URL || 'http://127.0.0.1:3080'
  const child = spawn(exe, [HELPER_MAIN], {
    cwd: join(PACKAGE_ROOT, 'runtime', 'electron-helper'),
    env: { ...process.env, DSH_CAPYREP_BASE_URL: baseUrl },
    stdio: 'ignore',
    windowsHide: true,
  })
  state.helperChild = child
  state.desktopRunning = true
  child.on('exit', () => {
    if (state.helperChild === child) {
      state.helperChild = null
      state.desktopRunning = false
    }
  })
  child.on('error', () => {
    if (state.helperChild === child) {
      state.helperChild = null
      state.desktopRunning = false
    }
  })
}

function stopHelper() {
  if (state.helperChild) {
    try {
      state.helperChild.kill()
    } catch (e) {}
  }
  state.helperChild = null
  state.desktopRunning = false
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 8_000_000) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function asText(v, max) {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

function titleOf(snap) {
  if (!snap || typeof snap !== 'object') return null
  const keys = ['title', 'displayTitle', 'name', 'label', 'summary', 'text']
  for (let i = 0; i < keys.length; i++) {
    const t = asText(snap[keys[i]], 80)
    if (t) return t
  }
  return null
}

// Extract the text-bearing payload of a session event. Streaming deltas
// ('delta'/'chunk') accumulate; whole-message payloads ('text'/'output'/message.text)
// replace. Returns null when the event carries no readable text.
function extractEventText(ev) {
  if (!ev || typeof ev !== 'object') return null
  for (const k of ['delta', 'chunk']) {
    const t = asText(ev[k], 4000)
    if (t) return { text: t, append: true }
  }
  for (const k of ['text', 'output', 'preview']) {
    const t = asText(ev[k], 4000)
    if (t) return { text: t, append: false }
  }
  const m = ev.message
  if (m && typeof m === 'object') {
    const t = asText(m.text, 4000)
    if (t) return { text: t, append: false }
  }
  return null
}

// Concise tail preview: whitespace collapsed, last ~120 chars, cut at a word
// boundary, prefixed with an ellipsis when something was dropped.
function tailPreview(s) {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (t.length <= 120) return t
  const tail = t.slice(t.length - 120)
  const sp = tail.indexOf(' ')
  return '\u2026' + (sp >= 0 ? tail.slice(sp + 1) : tail)
}

// Summarize a trajectory-style session event as a short status line, e.g.
// "🔧 pwsh", "💭 writing…", "🚀 workflow phase", "🧭 steering", "⚠️ retry".
// Returns { kind, line } or null when the event carries no recognizable step.
function stepLineOf(ev) {
  try {
    if (!ev || typeof ev !== 'object') return null
    const kd = String(ev.kind || ev.type || '').toLowerCase()
    const tool =
      (ev.tool && typeof ev.tool === 'object' ? ev.tool.name : null) ||
      (typeof ev.tool === 'string' ? ev.tool : null) ||
      (typeof ev.toolName === 'string' ? ev.toolName : null) ||
      (typeof ev.name === 'string' ? ev.name : null)
    const sub = asText(ev.title || ev.summary || ev.commandName || ev.phase, 44)
    if (kd.includes('tool') || tool) {
      return { kind: 'tool', line: '\uD83D\uDD27 ' + (tool || 'tool') + (sub ? ' \u00B7 ' + sub : '') }
    }
    if (kd.includes('error')) return { kind: 'error', line: '\u26A0\uFE0F ' + (sub || 'error') }
    if (kd.includes('retry')) return { kind: 'retry', line: '\uD83D\uDD01 retry' + (sub ? ' \u00B7 ' + sub : '') }
    if (kd.includes('steering')) return { kind: 'steering', line: '\uD83E\uDDED steering' + (sub ? ' \u00B7 ' + sub : '') }
    if (kd.includes('workflow')) return { kind: 'workflow', line: '\uD83D\uDE80 ' + (sub || 'workflow phase') }
    if (kd.includes('command')) return { kind: 'command', line: '\u2328\uFE0F command' + (sub ? ' \u00B7 ' + sub : '') }
    if (kd.includes('assistant')) return { kind: 'assistant', line: '\uD83D\uDCAD writing\u2026' }
    if (kd.includes('compaction') || kd.includes('context')) return { kind: 'context', line: '\uD83D\uDCC4 ' + (sub || 'context') }
    return null
  } catch (e) {
    return null
  }
}

function apply(ctx) {
  loadConfig()

  // ---- workspace (project) name resolution ---------------------------------
  const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const cwdOf = (s) =>
    (s && s.header && s.header.cwd) || (s && s.cwd) || (s && s.meta && s.meta.cwd) || null
  const refreshWorkspaces = async () => {
    try {
      const reg = typeof ctx.get === 'function' ? ctx.get('workspaceRegistry') : undefined
      if (!reg || typeof reg.list !== 'function') return
      const list = await reg.list()
      if (!Array.isArray(list)) return
      for (const w of list) {
        if (!w || typeof w.path !== 'string') continue
        const nm = asText(w.title || w.name, 80) || w.path.split(/[\\/]/).pop() || null
        if (nm) state.workspaceNames.set(norm(w.path), nm)
      }
    } catch (e) {}
  }
  const workspaceNameFor = (cwd) => {
    if (!cwd) return null
    const n = state.workspaceNames.get(norm(cwd))
    if (n) return n
    refreshWorkspaces() // lazy refetch when a new project appears
    return null
  }

  const sessionTitleOf = (sessionOrId) => {
    try {
      const sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
      const titles = typeof ctx.get === 'function' ? ctx.get('sessionTitle') : undefined
      if (!sessions || !titles) return null
      const s = sessionOrId && typeof sessionOrId === 'object' ? sessionOrId : sessions.get(sessionOrId)
      if (!s) return null
      // Prefer the workspace (project) name — the label shown in the sidebar —
      // so the bubble tells you WHICH project is reporting; fall back to the
      // generated session title.
      return workspaceNameFor(cwdOf(s)) || titleOf(titles.get(s))
    } catch (e) {
      return null
    }
  }

  refreshWorkspaces()
  try {
    setTimeout(refreshWorkspaces, 8000) // second pass after the registry has settled
  } catch (e) {}

  ctx.on('agent/status', (payload) => {
    try {
      if (!payload) return
      const a = payload.agent
      const status = payload.status
      if (!a) return
      const key = a.id !== undefined ? a.id : a.sessionId !== undefined ? a.sessionId : a
      if (status === 'running') {
        let rec = state.running.get(key)
        if (!rec) rec = { title: null, outText: '', log: [], lastKind: '', lastEventAt: Date.now(), running: false }
        rec.running = true
        rec.lastEventAt = Date.now()
        if (!rec.title) rec.title = sessionTitleOf(key)
        state.running.set(key, rec)
        state.completed = null
      } else if (status === 'idle' || status === 'disposed' || status === 'stopped' || status === 'error') {
        const rec = state.running.get(key)
        if (rec && rec.running === true) {
          state.completed = { title: rec.title || 'Task', at: Date.now(), dismissed: false }
        }
        state.running.delete(key)
      }
    } catch (e) {}
  })

  ctx.on('session/event', (session, event) => {
    try {
      const key = session && session.id !== undefined ? session.id : event && event.sessionId !== undefined ? event.sessionId : null
      if (key === null || key === undefined) return
      let rec = state.running.get(key)
      if (!rec) rec = { title: null, outText: '', log: [], lastKind: '', lastEventAt: 0, running: false }
      rec.lastEventAt = Date.now()
      if (!rec.title) rec.title = sessionTitleOf(session || key)
      const ex = extractEventText(event)
      if (ex) rec.outText = ex.append ? (rec.outText + ex.text).slice(-600) : ex.text.slice(-600)
      const sl = stepLineOf(event)
      if (sl) {
        if (rec.log.length && rec.lastKind === sl.kind) {
          rec.log[rec.log.length - 1] = sl.line
        } else {
          rec.log.push(sl.line)
          rec.lastKind = sl.kind
          if (rec.log.length > 16) rec.log.shift()
        }
      }
      state.running.set(key, rec)
    } catch (e) {}
  })

  ctx.on('session/disposed', (session) => {
    try {
      if (session && session.id !== undefined) state.running.delete(session.id)
    } catch (e) {}
  })

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: async (req, res) => {
          try {
            const url = new URL(req.url ?? '/', 'http://localhost')
            const rest = decodeURIComponent(url.pathname.slice(ROUTE.length + 1))

            if (rest === 'image') {
              if (req.method === 'GET') {
                const buf = state.customImage ? Buffer.from(state.customImage, 'base64') : state.defaultBuffer
                if (!buf) {
                  sendJson(res, 404, { error: 'no image available' })
                  return
                }
                res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'content-length': buf.length })
                res.end(buf)
                return
              }
              if (req.method === 'POST') {
                const body = await readBody(req)
                let parsed
                try {
                  parsed = JSON.parse(body)
                } catch {
                  sendJson(res, 400, { error: 'invalid JSON body' })
                  return
                }
                const d = parsed && parsed.dataUrl
                if (typeof d !== 'string' || d.slice(0, 11) !== 'data:image/') {
                  sendJson(res, 400, { error: 'expected an image data URL' })
                  return
                }
                if (d.length > 8_000_000) {
                  sendJson(res, 400, { error: 'image too large (keep it under ~4 MB)' })
                  return
                }
                const comma = d.indexOf(',')
                state.customImage = comma >= 0 ? d.slice(comma + 1) : d
                saveConfig()
                sendJson(res, 200, { ok: true })
                return
              }
              sendJson(res, 405, { error: 'method not allowed' })
              return
            }

            if (rest === 'reset') {
              state.customImage = null
              saveConfig()
              sendJson(res, 200, { ok: true })
              return
            }

            if (rest === 'enabled') {
              const body = await readBody(req)
              let parsed
              try {
                parsed = JSON.parse(body)
              } catch {
                sendJson(res, 400, { error: 'invalid JSON body' })
                return
              }
              state.enabled = !!(parsed && parsed.enabled)
              if (!state.enabled) state.completed = null
              saveConfig()
              if (!state.enabled) stopHelper()
              else startHelper()
              sendJson(res, 200, { enabled: state.enabled })
              return
            }

            if (rest === 'dismiss') {
              const body = await readBody(req)
              let at
              try {
                at = JSON.parse(body).at
              } catch {}
              if (state.completed && (at === undefined || at === state.completed.at)) state.completed.dismissed = true
              sendJson(res, 200, { ok: true })
              return
            }

            if (rest === 'desktop/hide') {
              state.desktopEnabled = false
              saveConfig()
              stopHelper()
              sendJson(res, 200, { ok: true })
              return
            }

            if (rest === 'desktop/show') {
              state.desktopEnabled = true
              saveConfig()
              startHelper()
              sendJson(res, 200, { ok: true, desktop: !!state.desktopRunning })
              return
            }

            if (rest === 'scale') {
              const body = await readBody(req)
              let parsed
              try {
                parsed = JSON.parse(body)
              } catch {
                sendJson(res, 400, { error: 'invalid JSON body' })
                return
              }
              const s = Number(parsed && parsed.scale)
              if (!Number.isFinite(s)) {
                sendJson(res, 400, { error: 'expected a numeric scale' })
                return
              }
              state.scale = Math.min(2.5, Math.max(0.5, s))
              saveConfig()
              sendJson(res, 200, { ok: true, scale: state.scale })
              return
            }

            if (rest === 'activity') {
              const now = Date.now()
              if (state.completed && now - state.completed.at > 21600000) state.completed = null
              const running = []
              state.running.forEach((rec) => {
                const fresh = rec.running === true || now - rec.lastEventAt < 15000
                if (!fresh) return
                running.push({
                  title: rec.title || 'Session',
                  preview: tailPreview(rec.outText),
                  lines: rec.log.slice(-12),
                  ageMs: Math.max(0, now - rec.lastEventAt),
                })
              })
              running.sort((a, b) => a.ageMs - b.ageMs)
              const completed = state.completed && !state.completed.dismissed ? { title: state.completed.title, at: state.completed.at } : null
              sendJson(res, 200, { running, runningCount: running.length, completed })
              return
            }

            if (rest === 'state') {
              sendJson(res, 200, { enabled: state.enabled, hasCustom: !!state.customImage, desktop: !!state.desktopRunning, desktopEnabled: state.desktopEnabled, scale: state.scale })
              return
            }

            sendJson(res, 404, { error: 'not found' })
          } catch (e) {
            try {
              sendJson(res, 500, { error: String((e && e.message) || e) })
            } catch {}
          }
        },
      }),
    'dsh-capyreporter: routes',
  )

  ctx.effect(
    () => () => {
      stopHelper()
    },
    'dsh-capyreporter: dispose',
  )

  readFile(join(PACKAGE_ROOT, 'assets', 'capybara.png'))
    .then((b) => {
      state.defaultBuffer = b
    })
    .catch(() => {})

  if (state.enabled && state.desktopEnabled) startHelper()
}

export { apply, inject, name }
