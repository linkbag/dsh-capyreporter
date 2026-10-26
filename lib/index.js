// CapyReporter host. Each activation owns its state, routes, timers and child.
import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { asText, titleOf, createActivityTracker, outcomeLabel } from './activity.js'
import { authorize, helperEnv, httpError, MAX_BODY_BYTES, readJson, validBaseUrl, validatePng } from './security.js'
export { asText, titleOf, extractEventText, tailPreview, stepLineOf } from './activity.js'

export const name = 'capyreporter'
export const inject = ['webServer']
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ROUTE = '/dsh-capyreporter'
const HELPER = join(ROOT, 'runtime', 'electron-helper', 'main.js')
const HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'cross-origin-resource-policy': 'same-origin' }

function sendJson(res, status, value, extra = {}) {
  const body = JSON.stringify(value)
  res.writeHead(status, { ...HEADERS, 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...extra })
  res.end(body)
}

export function apply(ctx) {
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || homedir(), '.dsh')
  const configPath = join(home, 'capyreporter.json')
  const token = randomBytes(32).toString('hex')
  const warn = message => ctx.logger?.warn?.('[capyreporter] ' + message)
  const state = { enabled: true, customImage: null, desktopEnabled: true, scale: 1, notificationsEnabled: false, snoozeMinutes: 30, showThinking: false, language: 'auto' }
  // UI languages the page overlay and the desktop companion can render.
  const LANGUAGES = new Set(['auto', 'en', 'zh', 'es', 'hi', 'ar', 'pt', 'ru', 'ja', 'fr', 'de'])
  let disposed = false, child = null, heartbeatAt = 0, startedAt = 0
  // A one-shot navigation request from the desktop companion: the page polls it
  // out of /state and opens that session through DSH's own workspace navigation.
  let pendingNav = null
  let desktopError = null, imageRevision = 0, defaultBuffer = null
  // Snoozing (muting the bubble) is deliberately not persisted: a restart is a
  // fresh context and the reporter should come back.
  let snoozedUntil = 0
  const settings = () => ({ enabled: state.enabled, customImage: state.customImage, desktopEnabled: state.desktopEnabled, scale: state.scale, notificationsEnabled: state.notificationsEnabled, snoozeMinutes: state.snoozeMinutes, showThinking: state.showThinking, language: state.language })
  const load = path => {
    if (statSync(path).size > MAX_BODY_BYTES) throw new Error('Config exceeds size limit')
    const config = JSON.parse(readFileSync(path, 'utf8'))
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Expected config object')
    if (typeof config.enabled === 'boolean') state.enabled = config.enabled
    if (typeof config.desktopEnabled === 'boolean') state.desktopEnabled = config.desktopEnabled
    if (typeof config.notificationsEnabled === 'boolean') state.notificationsEnabled = config.notificationsEnabled
    if (typeof config.showThinking === 'boolean') state.showThinking = config.showThinking
    if (typeof config.language === 'string' && LANGUAGES.has(config.language)) state.language = config.language
    if (typeof config.snoozeMinutes === 'number' && Number.isFinite(config.snoozeMinutes)) state.snoozeMinutes = Math.min(480, Math.max(5, Math.round(config.snoozeMinutes)))
    if (typeof config.scale === 'number' && Number.isFinite(config.scale)) state.scale = Math.min(2.5, Math.max(0.5, config.scale))
    if (config.customImage) { validatePng(config.customImage); state.customImage = config.customImage }
  }
  try { load(configPath) } catch (error) {
    if (error.code === 'ENOENT') {
      try { load(join(home, 'homura-pet.json')) } catch (legacy) {
        if (legacy.code !== 'ENOENT') warn('Could not migrate legacy config: ' + legacy.message)
      }
    } else warn('Could not load config: ' + error.message)
  }
  const persist = patch => {
    if (disposed) throw httpError(503, 'Plugin is shutting down')
    const next = { ...settings(), ...patch }
    const temporary = configPath + '.' + randomUUID() + '.tmp'
    try {
      mkdirSync(home, { recursive: true, mode: 0o700 })
      writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      renameSync(temporary, configPath)
    } catch (error) {
      try { unlinkSync(temporary) } catch {}
      warn('Could not save config: ' + error.message)
      throw httpError(500, 'Could not save settings; previous settings retained')
    }
    Object.assign(state, next)
  }
  try { defaultBuffer = readFileSync(join(ROOT, 'assets', 'capybara.png')) } catch (error) { warn('Default artwork unavailable: ' + error.message) }

  const service = key => typeof ctx.get === 'function' ? ctx.get(key) : undefined
  const norm = path => {
    const text = String(path || '').replace(/\\/g, '/').replace(/\/+$/, '')
    return process.platform === 'win32' ? text.toLowerCase() : text
  }
  const titleFor = input => {
    try {
      const session = typeof input === 'object' ? input : service('sessions')?.get(input)
      if (!session) return null
      const cwd = session.header?.cwd || session.cwd
      const workspace = service('workspaceRegistry')?.list()?.find(w => norm(w.path) === norm(cwd))
      const project = titleOf(workspace)
      const title = titleOf(service('sessionTitle')?.get(session))
      return asText(project && title && project !== title ? project + ' · ' + title : project || title, 160)
    } catch { return null }
  }
  const tracker = createActivityTracker({ titleFor, showThinking: state.showThinking })
  ctx.on('agent/status', payload => tracker.status(payload), { global: true })
  ctx.on('session/event', (session, event) => tracker.event(session, event), { global: true })
  ctx.on('agent/disposed', ({ agent }) => tracker.dispose(agent.id), { global: true })
  ctx.on('session/disposed', session => tracker.dispose(session.id), { global: true })
  // A hot-reloaded plugin can attach while existing agents are already running.
  try {
    for (const agent of service('agents')?.list() || []) {
      if (agent.status === 'running') tracker.status({ agent, status: 'running' })
    }
  } catch (error) { warn('Could not seed live agents: ' + error.message) }

  const stopHelper = () => {
    const current = child
    child = null
    heartbeatAt = 0
    if (!current || current.exitCode !== null || current.signalCode !== null) return Promise.resolve()
    return new Promise(resolve => {
      const done = () => { clearTimeout(timeout); current.off('close', done); resolve() }
      const timeout = setTimeout(() => { try { current.kill('SIGKILL') } catch {} done() }, 2500)
      timeout.unref?.()
      current.once('close', done)
      try { current.kill() } catch (error) { warn('Could not stop desktop helper: ' + error.message); done() }
    })
  }
  const startHelper = () => {
    if (disposed || child || !state.enabled || !state.desktopEnabled) return
    const candidates = [process.env.DSH_PET_ELECTRON_PATH, process.env.ELECTRON_PATH,
      join(home, 'electron', process.platform === 'win32' ? 'electron.exe' : 'electron'),
      process.env.APPDATA && join(process.env.APPDATA, 'npm', 'node_modules', 'electron', 'dist', 'electron.exe'),
      ...(process.platform === 'win32' ? [process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Electron', 'electron.exe'),
        join(process.env.ProgramFiles || 'C:/Program Files', 'Electron', 'electron.exe'),
        join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Electron', 'electron.exe')] : [])]
    const exe = candidates.find(path => path && existsSync(path))
    if (!exe) { desktopError = 'Electron not found; using in-page pet'; return }
    try {
      const baseUrl = validBaseUrl(process.env.DSH_CAPYREP_BASE_URL || 'http://127.0.0.1:' + ctx.webServer.port)
      const env = helperEnv(process.env, baseUrl, token)
      const current = spawn(exe, [HELPER], { cwd: join(ROOT, 'runtime', 'electron-helper'), env, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true })
      child = current
      startedAt = Date.now()
      heartbeatAt = 0
      desktopError = null
      current.stderr?.on('data', data => warn(String(data).split(token).join('[redacted]').slice(0, 500).trim()))
      const ended = error => {
        if (child !== current) return
        child = null
        heartbeatAt = 0
        desktopError = error ? 'Desktop helper failed; using in-page pet' : 'Desktop helper exited; using in-page pet'
      }
      current.once('exit', () => ended())
      current.once('error', ended)
    } catch (error) { desktopError = 'Desktop helper unavailable; using in-page pet'; warn(error.message) }
  }
  const desktopReady = () => !!child && heartbeatAt > 0 && Date.now() - heartbeatAt < 10_000
  const viewState = () => ({ enabled: state.enabled, hasCustom: !!state.customImage, imageRevision,
    desktop: desktopReady(), desktopEnabled: state.desktopEnabled, scale: state.scale, notificationsEnabled: state.notificationsEnabled,
    snoozeMinutes: state.snoozeMinutes, snoozed: Date.now() < snoozedUntil, snoozedUntil, showThinking: state.showThinking, language: state.language,
    desktopStatus: !state.enabled || !state.desktopEnabled ? 'off' : desktopReady() ? 'ready' : child ? 'starting' : 'unavailable', desktopError })

  const methods = new Map([['image', ['GET', 'POST']], ['activity', ['GET']], ['state', ['GET']],
    ...['reset', 'enabled', 'notifications', 'dismiss', 'desktop/hide', 'desktop/show', 'desktop/heartbeat', 'desktop/navigate', 'scale', 'snooze', 'snooze-minutes', 'thinking', 'language'].map(path => [path, ['POST']])])
  const handler = async (req, res) => {
    try {
      if (disposed) throw httpError(503, 'Plugin is shutting down')
      const role = authorize(req, ctx.webServer.port, token)
      if (!role) throw httpError(403, 'Same-origin loopback browser request or desktop capability required')
      const path = new URL(req.url || '/', 'http://localhost').pathname.slice(ROUTE.length + 1)
      const allowed = methods.get(path)
      if (!allowed) throw httpError(404, 'Not found')
      if (!allowed.includes(req.method)) { req.resume(); return sendJson(res, 405, { error: 'Method not allowed' }, { allow: allowed.join(', ') }) }
      if (path === 'desktop/heartbeat' && role !== 'helper') throw httpError(403, 'Desktop capability required')
      if (req.method === 'GET') {
        if (path === 'state') {
          // Deliver a pending desktop navigation to the page exactly once. The
          // desktop helper polls this same route for its own rendering, so only
          // a browser read may consume the pending request.
          const fresh = pendingNav && Date.now() - pendingNav.at < 30_000
          const navigate = fresh ? { sessionId: pendingNav.sessionId, at: pendingNav.at } : null
          if (pendingNav && !fresh) pendingNav = null
          else if (fresh && role === 'browser') pendingNav = null
          return sendJson(res, 200, { ...viewState(), navigate })
        }
        if (path === 'activity') {
          const activity = tracker.snapshot()
          for (const item of activity.completions) item.label = outcomeLabel(item.outcome)
          if (activity.completed) activity.completed.label = outcomeLabel(activity.completed.outcome)
          return sendJson(res, 200, state.enabled ? activity : { running: [], runningCount: 0, completed: null, completions: [] })
        }
        const buffer = state.customImage ? Buffer.from(state.customImage, 'base64') : defaultBuffer
        if (!buffer) throw httpError(404, 'Artwork unavailable')
        res.writeHead(200, { ...HEADERS, 'content-type': 'image/png', 'content-length': buffer.length })
        return res.end(buffer)
      }
      const body = await readJson(req)
      if (disposed) throw httpError(503, 'Plugin is shutting down')
      if (path === 'desktop/heartbeat') {
        if (!child || !state.enabled || !state.desktopEnabled) throw httpError(409, 'Desktop not requested')
        heartbeatAt = Date.now()
      } else if (path === 'desktop/navigate') {
        if (role !== 'helper') throw httpError(403, 'Desktop capability required')
        if (typeof body.sessionId !== 'string' || !body.sessionId.trim()) throw httpError(400, 'Expected a session id')
        pendingNav = { sessionId: body.sessionId.trim().slice(0, 200), at: Date.now() }
      } else if (path === 'language') {
        if (typeof body.language !== 'string' || !LANGUAGES.has(body.language)) throw httpError(400, 'Unsupported language')
        persist({ language: body.language })
      } else if (path === 'image') {
        if (typeof body.dataUrl !== 'string' || !body.dataUrl.startsWith('data:image/png;base64,')) throw httpError(400, 'Expected data:image/png;base64, PNG artwork')
        const base64 = body.dataUrl.slice('data:image/png;base64,'.length)
        validatePng(base64)
        persist({ customImage: base64 })
        imageRevision++
      } else if (path === 'reset') {
        persist({ customImage: null }); imageRevision++
      } else if (path === 'enabled') {
        if (typeof body.enabled !== 'boolean') throw httpError(400, 'Expected a boolean enabled value')
        persist({ enabled: body.enabled })
        tracker.clear()
        if (state.enabled) startHelper()
        else { snoozedUntil = 0; await stopHelper() }
      } else if (path === 'snooze') {
        if (typeof body.minutes !== 'number' || !Number.isFinite(body.minutes)) throw httpError(400, 'Expected a finite numeric minutes value')
        snoozedUntil = body.minutes <= 0 ? 0 : Date.now() + Math.min(480, Math.max(5, Math.round(body.minutes))) * 60_000
      } else if (path === 'snooze-minutes') {
        if (typeof body.minutes !== 'number' || !Number.isFinite(body.minutes)) throw httpError(400, 'Expected a finite numeric minutes value')
        persist({ snoozeMinutes: Math.min(480, Math.max(5, Math.round(body.minutes))) })
      } else if (path === 'thinking') {
        if (typeof body.enabled !== 'boolean') throw httpError(400, 'Expected a boolean enabled value')
        persist({ showThinking: body.enabled })
        tracker.setShowThinking(body.enabled)
      } else if (path === 'notifications') {
        if (typeof body.enabled !== 'boolean') throw httpError(400, 'Expected a boolean enabled value')
        persist({ notificationsEnabled: body.enabled })
      } else if (path === 'scale') {
        if (typeof body.scale !== 'number' || !Number.isFinite(body.scale)) throw httpError(400, 'Expected a finite numeric scale')
        persist({ scale: Math.min(2.5, Math.max(0.5, body.scale)) })
      } else if (path === 'dismiss') {
        if (!Number.isSafeInteger(body.at) || body.at <= 0) throw httpError(400, 'Expected completion timestamp')
        tracker.dismiss(body.at)
      } else if (path === 'desktop/hide') {
        persist({ desktopEnabled: false }); await stopHelper()
      } else if (path === 'desktop/show') {
        persist({ desktopEnabled: true }); startHelper()
      }
      sendJson(res, 200, { ok: true, ...viewState() })
    } catch (error) {
      req.resume()
      const status = Number.isInteger(error.status) ? error.status : 500
      if (status === 500 && !error.status) warn(error.message)
      if (!res.headersSent && !res.destroyed) sendJson(res, status, { error: error.status ? error.message : 'Reporter request failed' })
    }
  }
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler }), 'dsh-capyreporter: routes')
  const watchdog = setInterval(() => {
    if (!child) return
    // Electron cold starts (especially on Windows) can take tens of seconds.
    // Until the first heartbeat arrives, allow a longer grace period; after a
    // heartbeat proves liveness, silence for 20s means the helper is stuck.
    const timeout = heartbeatAt ? 20_000 : 60_000
    if (Date.now() - (heartbeatAt || startedAt) > timeout) {
      stopHelper()
      desktopError = heartbeatAt
        ? 'Desktop helper stopped responding; using in-page pet. Retry the desktop toggle.'
        : 'Desktop helper did not become ready; using in-page pet. Retry the desktop toggle.'
    }
  }, 3000)
  watchdog.unref?.()
  ctx.effect(() => async () => {
    disposed = true
    clearInterval(watchdog)
    tracker.destroy()
    await stopHelper()
  }, 'dsh-capyreporter: dispose')
  startHelper()
}
