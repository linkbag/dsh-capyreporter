// Browser entry: no build step or extra runtime dependencies required.
function makeFactory() {
  return require => {
    const React = require('react')
    const { useState, useEffect, useRef } = React
    const h = React.createElement
    const ROUTE = '/dsh-capyreporter'
    const STRINGS = {
      en: {
        details: 'Details', collapse: 'Collapse', dismiss: 'Dismiss', dismissResult: 'Dismiss result',
        muteFor: 'Mute {n} min', minutes: '{n} min', muteDuration: 'Mute duration', unmute: 'Unmute', muteNow: 'Mute now',
        runEnded: 'Run ended', stillRunning: '{n} still running', runningHead: '⏳ {n} running — {title}',
        disconnected: '⚠️ Reporter disconnected — retrying', close: 'Close', connecting: 'Connecting…',
        restoreBubble: 'Restore bubble', hidePet: 'Hide pet', showPet: 'Show pet', openSite: 'Open DeepSeek Harness', usePagePet: 'Use page pet instead',
        activityAria: 'CapyReporter activity', logAria: 'Session activity details', controlsAria: 'CapyReporter controls; drag to move', menuAria: 'CapyReporter controls', bubbleSizeAria: 'Resize bubble (pixels)',
        connected: 'Connected · desktop {status}', desktop_off: 'off', desktop_starting: 'starting', desktop_ready: 'ready', desktop_unavailable: 'unavailable',
        floatingRow: 'Floating reporter', floatingHint: 'Tracks live sessions; reports success, cancellation, blocked runs and errors separately.',
        statusBubbleRow: 'Status bubble', statusBubbleHint: 'Assistant milestones only — tool chatter stays in Details. Mute hides the bubble for a while; hiding the pet also unmutes. Drag the bubble edge or Ctrl + wheel over it to resize.',
        thinkingRow: 'Report thinking', thinkingHint: 'Opt in to show the model’s current thinking (💭) as the live milestone; otherwise only assistant text is shown.',
        showThinking: 'Show thinking', hideThinking: 'Hide thinking',
        desktopRow: 'Always-on-top desktop window',
        desktopHintOff: 'The page pet stays available until the desktop renderer is healthy.',
        desktopHintReady: 'The desktop window reports healthy. Switch back to the page pet any time.',
        desktopHintStarting: 'Starting the desktop window. Retry if it does not appear; the page pet stays available meanwhile.',
        enableDesktop: 'Enable desktop', usePageOnly: 'Use page only', retryDesktop: 'Retry desktop',
        petSizeRow: 'Pet size', petSizeHint: '50–250%. Ctrl + wheel over the page pet also resizes.', petSizeAria: 'Pet size percent',
        petArtRow: 'Pet appearance', petArtHint: 'Transparent PNG · at most 4 MiB · up to 4096 × 4096.', petArtCurrent: 'Current pet appearance',
        replaceImage: 'Replace image…', resetArtwork: 'Reset artwork',
        notifyRow: 'Away notifications', notifyHint: 'Opt in here and grant browser permission. Only alerts when this page is not focused.',
        enableNotifications: 'Enable notifications', disableNotifications: 'Disable notifications',
        keyboardHint: 'Keyboard: Tab to pet controls or Details; Enter/Space activates; Escape closes controls. Hiding is not uninstalling the plugin.',
        choosePng: 'Choose a PNG no larger than 4 MiB (up to 4096 × 4096).', readFailed: 'Could not read image',
        notificationsUnavailable: 'Notifications are unavailable', permissionResult: 'Notification permission: {result}'
      },
      zh: {
        details: '详情', collapse: '收起', dismiss: '忽略', dismissResult: '忽略结果',
        muteFor: '静音 {n} 分钟', minutes: '{n} 分钟', muteDuration: '静音时长', unmute: '取消静音', muteNow: '立即静音',
        runEnded: '运行结束', stillRunning: '还有 {n} 个运行中', runningHead: '⏳ {n} 个运行中 — {title}',
        disconnected: '⚠️ 报告器已断开 — 正在重试', close: '关闭', connecting: '连接中…',
        restoreBubble: '恢复气泡', hidePet: '隐藏宠物', showPet: '显示宠物', openSite: '打开 DeepSeek Harness', usePagePet: '改用网页宠物',
        activityAria: 'CapyReporter 动态', logAria: '会话动态详情', controlsAria: 'CapyReporter 控制；可拖动移动', menuAria: 'CapyReporter 控制', bubbleSizeAria: '调整气泡宽度（像素）',
        connected: '已连接 · 桌面 {status}', desktop_off: '关闭', desktop_starting: '启动中', desktop_ready: '就绪', desktop_unavailable: '不可用',
        floatingRow: '悬浮宠物', floatingHint: '跟踪实时会话；分别报告成功、取消、阻塞与错误。',
        statusBubbleRow: '状态气泡', statusBubbleHint: '仅显示助手里程碑——工具细节收在“详情”里。静音会暂时隐藏气泡；隐藏宠物也会解除静音。拖动气泡边缘或在其上按 Ctrl 并滚动滚轮即可调整宽度。',
        thinkingRow: '汇报思考过程', thinkingHint: '开启后，模型的当前思考（💭）会作为实时里程碑显示；关闭时仅显示助手文本。',
        showThinking: '显示思考', hideThinking: '隐藏思考',
        desktopRow: '置顶桌面窗口',
        desktopHintOff: '桌面窗口就绪前，网页宠物保持可用。',
        desktopHintReady: '桌面窗口运行正常；可随时切回网页宠物。',
        desktopHintStarting: '正在启动桌面窗口；若未出现请重试，期间网页宠物保持可用。',
        enableDesktop: '启用桌面', usePageOnly: '仅用网页', retryDesktop: '重试桌面',
        petSizeRow: '宠物大小', petSizeHint: '50–250%。在网页宠物上按 Ctrl 并滚动滚轮也可缩放。', petSizeAria: '宠物大小百分比',
        petArtRow: '宠物形象', petArtHint: '透明 PNG · 最大 4 MiB · 尺寸不超过 4096 × 4096。', petArtCurrent: '当前宠物形象',
        replaceImage: '更换图片…', resetArtwork: '恢复默认形象',
        notifyRow: '离开提醒', notifyHint: '在此开启并授予浏览器通知权限；仅当页面未聚焦时提醒。',
        enableNotifications: '开启提醒', disableNotifications: '关闭提醒',
        keyboardHint: '键盘：Tab 聚焦宠物控件或“详情”；Enter/空格 激活；Esc 关闭。隐藏宠物并不卸载插件。',
        choosePng: '请选择不超过 4 MiB 的 PNG（最大 4096 × 4096）。', readFailed: '无法读取图片',
        notificationsUnavailable: '当前环境不支持通知', permissionResult: '通知权限结果：{result}'
      }
    }
    const LOCALE = (() => {
      try { const saved = localStorage.getItem('dsh-capyreporter:lang'); if (saved === 'en' || saved === 'zh') return saved } catch {}
      return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
    })()
    const t = (key, vars) => {
      let value = STRINGS[LOCALE]?.[key] ?? STRINGS.en[key] ?? key
      if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.split('{' + name + '}').join(String(replacement))
      return value
    }
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
.dsh-capy-grip{position:absolute;left:0;top:0;bottom:0;width:10px;cursor:ew-resize;touch-action:none;border-radius:14px 0 0 14px}.dsh-capy-grip::after{content:'';position:absolute;left:2px;top:18%;bottom:18%;width:3px;border-radius:2px;background:#22242c;opacity:.2}.dsh-capy-grip:hover::after{opacity:.45}.dsh-capy-grip:focus-visible{outline:2px solid #4f8cff;outline-offset:-2px}
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
        try { new Notification('CapyReporter', { body: (item.label || t('runEnded')) + ' — ' + item.title, tag: 'dsh-capyreporter:' + key }) } catch {}
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
      ? (activity.completed.label || t('runEnded')) + ' — ' + activity.completed.title + (activity.runningCount ? ' · ' + t('stillRunning', { n: activity.runningCount }) : '')
      : activity?.runningCount ? t('runningHead', { n: activity.runningCount, title: activity.running[0].title }) : null

    function PetOverlay() {
      const feed = useReporter()
      const [expanded, setExpanded] = useState(false), [menu, setMenu] = useState(false)
      const [suppressed, setSuppressed] = useState(null), [error, setError] = useState(null)
      const [pos, setPos] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem('dsh-capyreporter:position')); if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) return saved } catch {}
        return { left: 24, top: Math.max(160, window.innerHeight - 230) }
      })
      const root = useRef(null), pet = useRef(null), drag = useRef(null), moved = useRef(false), resize = useRef(null)
      const [bubbleW, setBubbleW] = useState(() => {
        try { const saved = Number(localStorage.getItem('dsh-capyreporter:bubbleWidth')); if (Number.isFinite(saved) && saved >= 260 && saved <= 560) return Math.round(saved) } catch {}
        return 360
      })
      const scale = feed.state?.scale || 1
      const visible = !!feed.state?.enabled && !feed.state?.snoozed && !(feed.connected && feed.state?.desktop)
      const clamp = point => ({ left: Math.max(0, Math.min(point.left, window.innerWidth - Math.round(132 * scale))), top: Math.max(0, Math.min(point.top, window.innerHeight - (pet.current?.getBoundingClientRect().height || Math.min(132 * scale, window.innerHeight * .45)))) })
      useEffect(() => { const save = setTimeout(() => { try { localStorage.setItem('dsh-capyreporter:position', JSON.stringify(pos)) } catch {} }, 200); return () => clearTimeout(save) }, [pos])
      useEffect(() => { const save = setTimeout(() => { try { localStorage.setItem('dsh-capyreporter:bubbleWidth', String(bubbleW)) } catch {} }, 200); return () => clearTimeout(save) }, [bubbleW])
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
        if (!visible || !root.current) return
        const node = root.current
        let value = bubbleW
        const wheel = event => {
          if ((!event.ctrlKey && !event.metaKey) || !event.target?.closest?.('.dsh-capy-bubble')) return
          event.preventDefault()
          value = Math.min(560, Math.max(260, value + (event.deltaY < 0 ? 16 : -16)))
          setBubbleW(Math.round(value))
        }
        node.addEventListener('wheel', wheel, { passive: false })
        return () => { node.removeEventListener('wheel', wheel) }
      }, [visible, bubbleW])
      useEffect(() => {
        if (!menu) return
        const close = event => { if (!root.current?.contains(event.target)) setMenu(false) }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
      }, [menu])
      if (!visible) return null
      const activity = feed.activity, sig = signature(activity)
      const done = activity?.completed, running = activity?.running?.[0]
      const head = !feed.connected ? t('disconnected') : headline(activity)
      const show = head && (sig !== suppressed || !feed.connected)
      const action = async (path, body) => { try { await mutate(path, body); setError(null) } catch (e) { setError(e.message) } }
      const muteMinutes = feed.state?.snoozeMinutes || 30
      const hideBubble = () => { setSuppressed(sig); setExpanded(false); if (done) void action('/dismiss', { at: done.at }) }
      const mute = () => { setSuppressed(sig); setExpanded(false); void action('/snooze', { minutes: muteMinutes }) }
      const effW = Math.min(bubbleW, window.innerWidth - 24)
      const bubbleLeft = Math.max(12 - pos.left, Math.min(0, window.innerWidth - pos.left - effW))
      const onGripDown = event => { resize.current = { x: event.clientX, w: bubbleW }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault() }
      const onGripMove = event => { if (!resize.current) return; setBubbleW(Math.round(Math.min(560, Math.max(260, resize.current.w + resize.current.x - event.clientX)))) }
      const onGripUp = event => { resize.current = null; try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {} }
      const onGripKey = event => {
        if (event.key === 'ArrowLeft') { setBubbleW(w => Math.min(560, w + 16)); event.preventDefault() }
        else if (event.key === 'ArrowRight') { setBubbleW(w => Math.max(260, w - 16)); event.preventDefault() }
      }
      return h('div', { className: 'dsh-capy-float', ref: root, style: { ...pos, width: Math.round(132 * scale) },
        onKeyDown: event => { if (event.key === 'Escape') { setMenu(false); setExpanded(false); pet.current?.focus() } } },
        show && h('section', { className: 'dsh-capy-bubble', 'aria-label': t('activityAria'), style: { left: bubbleLeft, width: effW, ...(pos.top < 180 ? { bottom: 'auto', top: '100%' } : {}) } },
          h('div', { className: 'dsh-capy-head', role: 'status', 'aria-live': 'polite' }, head),
          !expanded && h('div', null, done?.preview || (running?.kind === 'think' ? '💭 ' + running.preview : running?.preview)),
          expanded && h('div', { className: 'dsh-capy-log', tabIndex: 0, 'aria-label': t('logAria') },
            done && h('div', { key: 'done' }, done.title, h('div', null, (done.lines || []).join('\n'))),
            (activity?.running || []).map(row => h('div', { key: row.id }, h('strong', null, row.title), h('div', null, (row.lines || []).join('\n')), h('div', null, row.preview)))),
          h('div', { className: 'dsh-capy-actions' },
            h('button', { className: 'dsh-capy-btn', 'aria-expanded': expanded, onClick: () => setExpanded(!expanded) }, expanded ? t('collapse') : t('details')),
            h('button', { className: 'dsh-capy-btn', onClick: hideBubble }, done ? t('dismissResult') : t('dismiss')),
            h('button', { className: 'dsh-capy-btn', onClick: mute }, t('muteFor', { n: muteMinutes }))),
          h('div', { className: 'dsh-capy-grip', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': t('bubbleSizeAria'), 'aria-valuemin': 260, 'aria-valuemax': 560, 'aria-valuenow': bubbleW, tabIndex: 0,
            onPointerDown: onGripDown, onPointerMove: onGripMove, onPointerUp: onGripUp, onKeyDown: onGripKey })),
        error && h('div', { role: 'alert', className: 'dsh-capy-bubble', style: { left: bubbleLeft } }, error, h('button', { onClick: () => setError(null) }, t('close'))),
        h('button', { className: 'dsh-capy-pet', ref: pet, 'aria-label': t('controlsAria'), 'aria-expanded': menu,
          style: { width: '100%' }, onClick: event => { if (event.detail === 0 || !moved.current) setMenu(!menu) },
          onContextMenu: event => { event.preventDefault(); setMenu(!menu) },
          onPointerDown: event => { if (event.button !== 0) return; moved.current = false; drag.current = { x: event.clientX, y: event.clientY, ...pos }; event.currentTarget.setPointerCapture?.(event.pointerId) },
          onPointerMove: event => { const d = drag.current; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.hypot(dx, dy) > 5) moved.current = true; if (moved.current) setPos(clamp({ left: d.left + dx, top: d.top + dy })) },
          onPointerUp: () => { drag.current = null }, onPointerCancel: () => { drag.current = null; moved.current = false } },
          h('img', { src: ROUTE + '/image?v=' + (feed.state.imageRevision ?? Number(feed.state.hasCustom)), alt: 'CapyReporter', draggable: false, onLoad: () => setPos(value => clamp(value)) })),
        menu && h('div', { className: 'dsh-capy-menu', role: 'group', 'aria-label': t('menuAria') },
          h('button', { className: 'dsh-capy-btn', onClick: () => { setSuppressed(null); setMenu(false); if (feed.state?.snoozed) void action('/snooze', { minutes: 0 }) } }, t('restoreBubble')),
          done && h('button', { className: 'dsh-capy-btn', onClick: () => { hideBubble(); setMenu(false) } }, t('dismissResult')),
          h('button', { className: 'dsh-capy-btn', onClick: () => { mute(); setMenu(false) } }, t('muteFor', { n: muteMinutes })),
          h('button', { className: 'dsh-capy-btn', onClick: () => action('/enabled', { enabled: false }) }, t('hidePet'))))
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
        if (image.type !== 'image/png' || image.size > 4 * 1024 * 1024) { setMessage(t('choosePng')); return }
        void run(async () => {
          const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(t('readFailed'))); reader.readAsDataURL(image) })
          await mutate('/image', { dataUrl })
        })
      }
      const desktopEnabled = !!state?.desktopEnabled
      const desktopReady = state?.desktopStatus === 'ready'
      const desktopHint = !desktopEnabled
        ? t('desktopHintOff')
        : desktopReady ? t('desktopHintReady') : t('desktopHintStarting')
      const commitScale = () => { if (!state || Math.round(state.scale * 100) === size) return; void run(() => mutate('/scale', { scale: size / 100 })) }
      return h('div', { className: 'dsh-capy-section' },
        h('div', { role: 'status' }, feed.connected ? t('connected', { status: t('desktop_' + (state?.desktopStatus || (state?.desktop ? 'ready' : 'off'))) }) : feed.error || t('connecting')),
        state?.desktopError && h('div', { className: 'dsh-capy-hint' }, state.desktopError),
        row(t('floatingRow'), t('floatingHint'), button(state?.enabled ? t('hidePet') : t('showPet'), () => run(() => mutate('/enabled', { enabled: !state?.enabled })), { 'aria-pressed': !!state?.enabled })),
        row(t('statusBubbleRow'), t('statusBubbleHint'), h('div', { className: 'dsh-capy-row' },
          h('select', { className: 'dsh-capy-btn', 'aria-label': t('muteDuration'), value: String(state?.snoozeMinutes || 30), onChange: e => run(() => mutate('/snooze-minutes', { minutes: Number(e.target.value) })) },
            [10, 30, 60, 240].map(m => h('option', { key: m, value: String(m) }, t('minutes', { n: m })))),
          button(state?.snoozed ? t('unmute') : t('muteNow'), () => run(() => mutate('/snooze', { minutes: state?.snoozed ? 0 : state?.snoozeMinutes || 30 })), { 'aria-pressed': !!state?.snoozed }))),
        row(t('thinkingRow'), t('thinkingHint'), button(state?.showThinking ? t('hideThinking') : t('showThinking'), () => run(() => mutate('/thinking', { enabled: !state?.showThinking })), { 'aria-pressed': !!state?.showThinking })),
        row(t('desktopRow'), desktopHint, button(!desktopEnabled ? t('enableDesktop') : desktopReady ? t('usePageOnly') : t('retryDesktop'), () => run(() => mutate(!desktopEnabled || !desktopReady ? '/desktop/show' : '/desktop/hide')), { 'aria-pressed': desktopEnabled })),
        row(t('petSizeRow'), t('petSizeHint'), h('label', null, h('input', { type: 'range', min: 50, max: 250, step: 5, value: size, disabled: !feed.connected, 'aria-label': t('petSizeAria'), onChange: e => setSize(Number(e.target.value)), onPointerUp: commitScale, onKeyUp: commitScale }), ' ' + size + '%')),
        row(t('petArtRow'), t('petArtHint'), h('div', null,
          state && h('img', { className: 'dsh-capy-preview', alt: t('petArtCurrent'), src: ROUTE + '/image?v=' + (state.imageRevision ?? Number(state.hasCustom)) }),
          h('input', { ref: file, type: 'file', accept: 'image/png', hidden: true, onChange: upload }),
          button(t('replaceImage'), () => file.current.click()), state?.hasCustom && button(t('resetArtwork'), () => run(() => mutate('/reset'))))),
        row(t('notifyRow'), t('notifyHint'), button(state?.notificationsEnabled ? t('disableNotifications') : t('enableNotifications'), () => run(async () => { if (state?.notificationsEnabled) return mutate('/notifications', { enabled: false }); if (typeof Notification === 'undefined') throw new Error(t('notificationsUnavailable')); const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error(t('permissionResult', { result: permission })); await mutate('/notifications', { enabled: true }) }), { 'aria-pressed': !!state?.notificationsEnabled })),
        h('div', { className: 'dsh-capy-hint' }, t('keyboardHint')),
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
