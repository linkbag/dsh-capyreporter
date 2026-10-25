// Browser entry: no build step or extra runtime dependencies required.
function makeFactory() {
  return require => {
    const React = require('react')
    const { useState, useEffect, useRef } = React
    const h = React.createElement
    const ROUTE = '/dsh-capyreporter'
    const CSS = `
.dsh-capy-section{display:flex;flex-direction:column;gap:16px;font-size:13px}
.dsh-capy-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsh-capy-hint{font-size:12px;opacity:.75;line-height:1.5}
.dsh-capy-btn{font:inherit;color:inherit;background:transparent;border:1px solid #8888;border-radius:8px;padding:6px 10px;cursor:pointer}
.dsh-capy-btn:disabled{opacity:.5;cursor:wait}
.dsh-capy-btn:focus-visible,.dsh-capy-pet:focus-visible{outline:3px solid #4f8cff;outline-offset:3px}
.dsh-capy-float{position:fixed;z-index:2147483000;user-select:none}
.dsh-capy-pet{display:block;padding:0;border:0;background:none;cursor:grab;touch-action:none}
.dsh-capy-pet img{display:block;width:100%;height:auto;max-height:45vh;object-fit:contain;filter:drop-shadow(0 6px 16px #0006);pointer-events:none}
.dsh-capy-bubble{position:absolute;bottom:100%;width:min(360px,calc(100vw - 24px));max-height:45vh;overflow:auto;box-sizing:border-box;background:#fdfdf7;color:#22242c;border-radius:14px;padding:10px 12px;box-shadow:0 4px 14px #0007;font-size:12.5px;line-height:1.45;overflow-wrap:anywhere}
.dsh-capy-head{font-weight:600;margin-bottom:5px}
.dsh-capy-log{max-height:160px;overflow:auto;white-space:pre-wrap;margin:6px 0}
.dsh-capy-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.dsh-capy-menu{position:absolute;bottom:0;left:0;display:flex;flex-direction:column;gap:6px;background:#23262f;color:#e8eaf0;border:1px solid #8888;border-radius:10px;padding:8px;box-shadow:0 8px 24px #0009;min-width:160px}
.dsh-capy-preview{width:100px;height:100px;object-fit:contain;background:#8882;border-radius:10px}
@media(prefers-reduced-motion:reduce){.dsh-capy-section *,.dsh-capy-float *{animation:none!important;transition:none!important}}
`
    let snapshot = { state: null, activity: null, connected: false, error: null }
    const listeners = new Set()
    let timer = null, active = null, failures = 0, stopped = false, generation = 0, pendingRefresh = false
    const seen = new Set(readSeen())
    function readSeen() {
      try {
        const value = JSON.parse(sessionStorage.getItem('dsh-capyreporter:seen') || '[]')
        return Array.isArray(value) ? value.slice(-200) : []
      } catch { return [] }
    }
    function rememberSeen(key) {
      seen.add(key)
      if (seen.size > 200) seen.delete(seen.values().next().value)
      try { sessionStorage.setItem('dsh-capyreporter:seen', JSON.stringify([...seen])) } catch {}
    }
    const emit = value => { snapshot = value; for (const fn of listeners) fn(value) }
    async function request(path, body, signal) {
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) controller.abort()
      const timeout = setTimeout(abort, 5000)
      try {
        const response = await fetch(ROUTE + path, { method: body === undefined ? 'GET' : 'POST',
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) })
        const value = await response.json()
        if (!response.ok) throw new Error(value.error || 'Reporter HTTP ' + response.status)
        return value
      } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
    }
    function notify(activity, state) {
      for (const item of activity?.completions || (activity?.completed ? [activity.completed] : [])) {
        const key = String(item.id) + ':' + item.at
        if (seen.has(key)) continue
        rememberSeen(key)
        // A completion already observed while focused is not replayed on blur.
        if (!state.enabled || !state.notificationsEnabled || (document.visibilityState === 'visible' && document.hasFocus()) || typeof Notification === 'undefined' || Notification.permission !== 'granted') continue
        try { new Notification('CapyReporter', { body: (item.label || 'Run ended') + ' — ' + item.title, tag: 'dsh-capyreporter:' + key }) } catch {}
      }
    }
    async function poll() {
      if (active || stopped || !listeners.size) return
      active = new AbortController()
      const current = active, started = generation
      pendingRefresh = false
      let delay = 1200
      try {
        const state = await request('/state', undefined, current.signal)
        const activity = state.enabled ? await request('/activity', undefined, current.signal) : null
        if (current.signal.aborted || stopped || started !== generation) return
        failures = 0
        notify(activity, state)
        emit({ state, activity, connected: true, error: null })
      } catch (error) {
        if (current.signal.aborted || stopped) return
        delay = Math.min(20_000, 1200 * 2 ** Math.min(++failures, 4))
        emit({ ...snapshot, activity: null, connected: false, error: 'Reporter disconnected: ' + error.message })
      } finally {
        if (active === current) active = null
        if (!stopped && listeners.size) timer = setTimeout(poll, pendingRefresh ? 0 : delay)
      }
    }
    const refresh = () => { clearTimeout(timer); if (active) pendingRefresh = true; else void poll() }
    // Hidden tabs throttle chained timers to roughly one wake per minute, so
    // polls (and away notifications) stall while the user is elsewhere. Refresh
    // immediately when the page becomes visible or focused again.
    const wake = () => { if (document.visibilityState === 'visible' || document.hasFocus()) refresh() }
    let wakeInstalled = false
    function installWake() {
      if (wakeInstalled) return
      wakeInstalled = true
      document.addEventListener('visibilitychange', wake)
      window.addEventListener('focus', wake)
    }
    function uninstallWake() {
      wakeInstalled = false
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
    }
    function useReporter() {
      const [value, setValue] = useState(snapshot)
      useEffect(() => {
        listeners.add(setValue)
        stopped = false
        installWake()
        setValue(snapshot)
        refresh()
        return () => {
          listeners.delete(setValue)
          if (!listeners.size) { stopped = true; clearTimeout(timer); active?.abort() }
        }
      }, [])
      return value
    }
    async function mutate(path, body = {}) {
      const value = await request(path, body)
      generation++
      if (snapshot.state) emit({ ...snapshot, state: { ...snapshot.state, ...value } })
      refresh()
      return value
    }
    const signature = activity => JSON.stringify([activity?.completed?.at, ...(activity?.running || []).map(r => [r.id, r.title, r.preview, r.lines?.at(-1)])])
    const headline = activity => activity?.completed
      ? (activity.completed.label || 'Run ended') + ' — ' + activity.completed.title + (activity.runningCount ? ' · ' + activity.runningCount + ' still running' : '')
      : activity?.runningCount ? '⏳ ' + activity.runningCount + ' running — ' + activity.running[0].title : null

    function PetOverlay() {
      const feed = useReporter()
      const [expanded, setExpanded] = useState(false), [menu, setMenu] = useState(false)
      const [suppressed, setSuppressed] = useState(null), [error, setError] = useState(null)
      const [pos, setPos] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem('dsh-capyreporter:position')); if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) return saved } catch {}
        return { left: 24, top: Math.max(160, window.innerHeight - 230) }
      })
      const root = useRef(null), pet = useRef(null), drag = useRef(null), moved = useRef(false)
      const scale = feed.state?.scale || 1
      const visible = !!feed.state?.enabled && !feed.state?.snoozed && !(feed.connected && feed.state?.desktop)
      const clamp = point => ({ left: Math.max(0, Math.min(point.left, window.innerWidth - Math.round(132 * scale))), top: Math.max(0, Math.min(point.top, window.innerHeight - (pet.current?.getBoundingClientRect().height || Math.min(132 * scale, window.innerHeight * .45)))) })
      useEffect(() => { const save = setTimeout(() => { try { localStorage.setItem('dsh-capyreporter:position', JSON.stringify(pos)) } catch {} }, 200); return () => clearTimeout(save) }, [pos])
      useEffect(() => {
        const resize = () => setPos(value => clamp(value))
        resize(); window.addEventListener('resize', resize)
        return () => window.removeEventListener('resize', resize)
      }, [scale])
      useEffect(() => {
        if (!visible || !pet.current) return
        const node = pet.current
        let value = scale, pending
        const wheel = event => {
          if (!event.ctrlKey && !event.metaKey) return
          event.preventDefault()
          value = Math.min(2.5, Math.max(.5, Math.round((value + (event.deltaY < 0 ? .1 : -.1)) * 10) / 10))
          clearTimeout(pending)
          pending = setTimeout(() => mutate('/scale', { scale: value }).catch(e => setError(e.message)), 180)
        }
        node.addEventListener('wheel', wheel, { passive: false })
        return () => { node.removeEventListener('wheel', wheel); clearTimeout(pending) }
      }, [visible, scale])
      useEffect(() => {
        if (!menu) return
        const close = event => { if (!root.current?.contains(event.target)) setMenu(false) }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
      }, [menu])
      if (!visible) return null
      const activity = feed.activity, sig = signature(activity)
      const done = activity?.completed, running = activity?.running?.[0]
      const head = !feed.connected ? '⚠️ Reporter disconnected — retrying' : headline(activity)
      const show = head && (sig !== suppressed || !feed.connected)
      const action = async (path, body) => { try { await mutate(path, body); setError(null) } catch (e) { setError(e.message) } }
      const muteMinutes = feed.state?.snoozeMinutes || 30
      const hideBubble = () => { setSuppressed(sig); setExpanded(false); if (done) void action('/dismiss', { at: done.at }) }
      const mute = () => { setSuppressed(sig); setExpanded(false); void action('/snooze', { minutes: muteMinutes }) }
      const bubbleLeft = Math.max(12 - pos.left, Math.min(0, window.innerWidth - pos.left - 372))
      return h('div', { className: 'dsh-capy-float', ref: root, style: { ...pos, width: Math.round(132 * scale) },
        onKeyDown: event => { if (event.key === 'Escape') { setMenu(false); setExpanded(false); pet.current?.focus() } } },
        show && h('section', { className: 'dsh-capy-bubble', 'aria-label': 'CapyReporter activity', style: { left: bubbleLeft, ...(pos.top < 180 ? { bottom: 'auto', top: '100%' } : {}) } },
          h('div', { className: 'dsh-capy-head', role: 'status', 'aria-live': 'polite' }, head),
          !expanded && h('div', null, done?.preview || (running?.kind === 'think' ? '💭 ' + running.preview : running?.preview)),
          expanded && h('div', { className: 'dsh-capy-log', tabIndex: 0, 'aria-label': 'Session activity details' },
            done && h('div', { key: 'done' }, done.title, h('div', null, (done.lines || []).join('\n'))),
            (activity?.running || []).map(row => h('div', { key: row.id }, h('strong', null, row.title), h('div', null, (row.lines || []).join('\n')), h('div', null, row.preview)))),
          h('div', { className: 'dsh-capy-actions' },
            h('button', { className: 'dsh-capy-btn', 'aria-expanded': expanded, onClick: () => setExpanded(!expanded) }, expanded ? 'Collapse' : 'Details'),
            h('button', { className: 'dsh-capy-btn', onClick: done ? hideBubble : mute }, done ? 'Dismiss result' : 'Mute ' + muteMinutes + ' min'))),
        error && h('div', { role: 'alert', className: 'dsh-capy-bubble', style: { left: bubbleLeft } }, error, h('button', { onClick: () => setError(null) }, 'Close')),
        h('button', { className: 'dsh-capy-pet', ref: pet, 'aria-label': 'CapyReporter controls; drag to move', 'aria-expanded': menu,
          style: { width: '100%' }, onClick: event => { if (event.detail === 0 || !moved.current) setMenu(!menu) },
          onContextMenu: event => { event.preventDefault(); setMenu(!menu) },
          onPointerDown: event => { if (event.button !== 0) return; moved.current = false; drag.current = { x: event.clientX, y: event.clientY, ...pos }; event.currentTarget.setPointerCapture?.(event.pointerId) },
          onPointerMove: event => { const d = drag.current; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.hypot(dx, dy) > 5) moved.current = true; if (moved.current) setPos(clamp({ left: d.left + dx, top: d.top + dy })) },
          onPointerUp: () => { drag.current = null }, onPointerCancel: () => { drag.current = null; moved.current = false } },
          h('img', { src: ROUTE + '/image?v=' + (feed.state.imageRevision ?? Number(feed.state.hasCustom)), alt: 'CapyReporter', draggable: false, onLoad: () => setPos(value => clamp(value)) })),
        menu && h('div', { className: 'dsh-capy-menu', role: 'group', 'aria-label': 'CapyReporter controls' },
          h('button', { className: 'dsh-capy-btn', onClick: () => { setSuppressed(null); setMenu(false); if (feed.state?.snoozed) void action('/snooze', { minutes: 0 }) } }, 'Restore bubble'),
          done && h('button', { className: 'dsh-capy-btn', onClick: () => { hideBubble(); setMenu(false) } }, 'Dismiss result'),
          h('button', { className: 'dsh-capy-btn', onClick: () => { mute(); setMenu(false) } }, 'Mute ' + muteMinutes + ' min'),
          h('button', { className: 'dsh-capy-btn', onClick: () => action('/enabled', { enabled: false }) }, 'Hide pet')))
    }

    function PetSettings() {
      const feed = useReporter()
      const [busy, setBusy] = useState(false), [message, setMessage] = useState(null), [size, setSize] = useState(100)
      const file = useRef(null)
      useEffect(() => { if (feed.state) setSize(Math.round(feed.state.scale * 100)) }, [feed.state?.scale])
      const state = feed.state
      const run = async task => { setBusy(true); setMessage(null); try { await task() } catch (error) { setMessage(error.message) } finally { setBusy(false) } }
      const button = (label, onClick, extra = {}) => h('button', { className: 'dsh-capy-btn', disabled: busy || !feed.connected, onClick, ...extra }, label)
      const row = (title, hint, control) => h('div', { className: 'dsh-capy-row', key: title }, h('div', null, h('strong', null, title), h('div', { className: 'dsh-capy-hint' }, hint)), control)
      const upload = event => {
        const image = event.target.files?.[0]
        event.target.value = ''
        if (!image) return
        if (image.type !== 'image/png' || image.size > 4 * 1024 * 1024) { setMessage('Choose a PNG no larger than 4 MiB (up to 4096 × 4096).'); return }
        void run(async () => {
          const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read image')); reader.readAsDataURL(image) })
          await mutate('/image', { dataUrl })
        })
      }
      const desktopEnabled = !!state?.desktopEnabled
      const desktopReady = state?.desktopStatus === 'ready'
      const desktopHint = !desktopEnabled
        ? 'The page pet stays available until the desktop renderer is healthy.'
        : desktopReady ? 'The desktop window reports healthy. Switch back to the page pet any time.' : 'Starting the desktop window. Retry if it does not appear; the page pet stays available meanwhile.'
      const commitScale = () => { if (!state || Math.round(state.scale * 100) === size) return; void run(() => mutate('/scale', { scale: size / 100 })) }
      return h('div', { className: 'dsh-capy-section' },
        h('div', { role: 'status' }, feed.connected ? 'Connected · desktop ' + (state?.desktopStatus || (state?.desktop ? 'ready' : 'off')) : feed.error || 'Connecting…'),
        state?.desktopError && h('div', { className: 'dsh-capy-hint' }, state.desktopError),
        row('Floating reporter', 'Tracks live sessions; reports success, cancellation, blocked runs and errors separately.', button(state?.enabled ? 'Hide pet' : 'Show pet', () => run(() => mutate('/enabled', { enabled: !state?.enabled })), { 'aria-pressed': !!state?.enabled })),
        row('Status bubble', 'Assistant milestones only — tool chatter stays in Details. Mute hides the bubble for a while; hiding the pet also unmutes.', h('div', { className: 'dsh-capy-row' },
          h('select', { className: 'dsh-capy-btn', 'aria-label': 'Mute duration', value: String(state?.snoozeMinutes || 30), onChange: e => run(() => mutate('/snooze-minutes', { minutes: Number(e.target.value) })) },
            [10, 30, 60, 240].map(m => h('option', { key: m, value: String(m) }, m + ' min'))),
          button(state?.snoozed ? 'Unmute' : 'Mute now', () => run(() => mutate('/snooze', { minutes: state?.snoozed ? 0 : state?.snoozeMinutes || 30 })), { 'aria-pressed': !!state?.snoozed }))),
        row('Report thinking', 'Opt in to show the model’s current thinking (💭) as the live milestone; otherwise only assistant text is shown.', button(state?.showThinking ? 'Hide thinking' : 'Show thinking', () => run(() => mutate('/thinking', { enabled: !state?.showThinking })), { 'aria-pressed': !!state?.showThinking })),
        row('Always-on-top desktop window', desktopHint, button(!desktopEnabled ? 'Enable desktop' : desktopReady ? 'Use page only' : 'Retry desktop', () => run(() => mutate(!desktopEnabled || !desktopReady ? '/desktop/show' : '/desktop/hide')), { 'aria-pressed': desktopEnabled })),
        row('Pet size', '50–250%. Ctrl + wheel over the page pet also resizes.', h('label', null, h('input', { type: 'range', min: 50, max: 250, step: 5, value: size, disabled: !feed.connected, 'aria-label': 'Pet size percent', onChange: e => setSize(Number(e.target.value)), onPointerUp: commitScale, onKeyUp: commitScale }), ' ' + size + '%')),
        row('Pet appearance', 'Transparent PNG · at most 4 MiB · up to 4096 × 4096.', h('div', null,
          state && h('img', { className: 'dsh-capy-preview', alt: 'Current pet appearance', src: ROUTE + '/image?v=' + (state.imageRevision ?? Number(state.hasCustom)) }),
          h('input', { ref: file, type: 'file', accept: 'image/png', hidden: true, onChange: upload }),
          button('Replace image…', () => file.current.click()), state?.hasCustom && button('Reset artwork', () => run(() => mutate('/reset'))))),
        row('Away notifications', 'Opt in here and grant browser permission. Only alerts when this page is not focused.', button(state?.notificationsEnabled ? 'Disable notifications' : 'Enable notifications', () => run(async () => { if (state?.notificationsEnabled) return mutate('/notifications', { enabled: false }); if (typeof Notification === 'undefined') throw new Error('Notifications are unavailable'); const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Notification permission: ' + permission); await mutate('/notifications', { enabled: true }) }), { 'aria-pressed': !!state?.notificationsEnabled })),
        h('div', { className: 'dsh-capy-hint' }, 'Keyboard: Tab to pet controls or Details; Enter/Space activates; Escape closes controls. Hiding is not uninstalling the plugin.'),
        message && h('div', { role: 'alert' }, message))
    }

    function apply(ctx) {
      const style = document.createElement('style')
      style.dataset.pluginCss = 'dsh-capyreporter'
      style.textContent = CSS
      document.head.appendChild(style)
      ctx.effect(() => () => { style.remove(); stopped = true; clearTimeout(timer); active?.abort(); uninstallWake() }, 'dsh-capyreporter: client cleanup')
      ctx.slots.inject('shell.overlay', function* () { yield ctx.slots.register({ name: 'shell.overlay', id: 'dsh-capyreporter-overlay', order: 500 }, () => h(PetOverlay)) })
      ctx.slots.inject('settings.section', function* () { yield ctx.slots.register({ name: 'settings.section', id: 'dsh-capyreporter', order: 90, label: '🐾 CapyReporter' }, () => h(PetSettings)) })
    }
    return { name: 'capyreporter', inject: ['slots'], apply }
  }
}
window.__ModuleLoader__.load({ id: 'dsh-capyreporter', factory: makeFactory() })
