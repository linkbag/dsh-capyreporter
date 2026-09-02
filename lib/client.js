// dsh-capyreporter — client half (browser). Registered with the DSH module loader.
// Talks to the host half over webServer routes using plain fetch.

function makeFactory() {
  return (require) => {
    const React = require('react')
    const { useState, useEffect } = React

    const name = 'capyreporter'
    const inject = ['slots']
    const ROUTE = '/dsh-capyreporter'

    const SETTINGS_CSS = [
      '.dsh-pet-section { display:flex; flex-direction:column; gap:16px; font-size:13px; }',
      '.dsh-pet-row { display:flex; align-items:center; justify-content:space-between; gap:14px; }',
      '.dsh-pet-row-main { display:flex; flex-direction:column; gap:3px; min-width:0; }',
      '.dsh-pet-title { font-weight:600; }',
      '.dsh-pet-hint { opacity:.65; font-size:12px; line-height:1.5; }',
      '.dsh-pet-toggle { position:relative; flex:0 0 auto; width:42px; height:23px; border-radius:12px; background:#88888855; border:0; cursor:pointer; padding:0; transition:background .15s; }',
      '.dsh-pet-toggle[data-on="1"] { background:#4f8cff; }',
      '.dsh-pet-toggle::after { content:""; position:absolute; top:3px; left:3px; width:17px; height:17px; border-radius:50%; background:#fff; transition:left .15s; box-shadow:0 1px 2px #0004; }',
      '.dsh-pet-toggle[data-on="1"]::after { left:22px; }',
      '.dsh-pet-preview { width:110px; height:110px; object-fit:contain; border-radius:10px; background:#88888822; border:1px solid #88888844; flex:0 0 auto; }',
      '.dsh-pet-btn { border:1px solid #88888866; background:transparent; color:inherit; border-radius:8px; padding:5px 12px; cursor:pointer; font-size:12.5px; }',
      '.dsh-pet-btn:hover { background:#88888833; }',
      '.dsh-pet-btn-danger { border-color:#e5484d88; color:#e5484d; }',
      '.dsh-pet-btn-danger:hover { background:#e5484d22; }',
      '.dsh-pet-msg { font-size:12px; opacity:.8; line-height:1.5; }',
    ].join('\n')

    const PET_CSS = [
      '.dsh-pet-float { position:fixed; z-index:2147483000; pointer-events:auto; user-select:none; -webkit-user-select:none; }',
      '.dsh-pet-img { display:block; width:132px; height:auto; pointer-events:auto; cursor:grab; filter:drop-shadow(0 6px 16px #0006); transform-origin:center bottom; transition:transform .12s ease-out; }',
      '.dsh-pet-img.dragging { cursor:grabbing; }',
      '.dsh-pet-img.bounce { transform:scale(1.12); }',
      '.dsh-pet-bubble { position:absolute; bottom:100%; left:50%; transform:translateX(-50%); margin-bottom:8px; background:#fdfdf7; color:#22242c; border-radius:14px; padding:8px 12px; font-size:12.5px; line-height:1.45; box-shadow:0 4px 14px #0007; max-width:900px; min-width:90px; cursor:pointer; z-index:5; flex-direction:column; gap:3px; display:flex; box-sizing:border-box; }',
      '.dsh-pet-bubble::after { content:""; position:absolute; bottom:-8px; left:50%; transform:translateX(-50%); border:8px solid transparent; border-top-color:#fdfdf7; border-bottom:0; }',
      '.dsh-pet-bubble-head { font-weight:600; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:break-word; }',
      '.dsh-pet-bubble-detail { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:break-word; opacity:.85; }',
      '.dsh-pet-bubble .dsh-pet-hint { white-space:nowrap; }',
      '.dsh-pet-bubble-log { max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; font-size:12px; line-height:1.4; scrollbar-width:thin; }',
      '.dsh-pet-bubble-log::-webkit-scrollbar { width:6px; }',
      '.dsh-pet-bubble-log::-webkit-scrollbar-thumb { background:#00000044; border-radius:3px; }',
      '.dsh-pet-bubble-line { overflow-wrap:break-word; white-space:normal; }',
      '.dsh-pet-hint { font-size:10.5px; opacity:.55; margin-top:3px; }',
      '.dsh-pet-menu { position:absolute; bottom:0; left:100%; margin-left:8px; flex-direction:column; background:#23262f; color:#e8eaf0; border:1px solid #ffffff22; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px #0009; z-index:9; }',
      '.dsh-pet-menu-item { appearance:none; border:0; background:transparent; color:#e8eaf0; padding:8px 14px; font-size:12px; text-align:left; cursor:pointer; font-family:inherit; white-space:nowrap; }',
      '.dsh-pet-menu-item:hover { background:#ffffff14; }',
    ].join('\n')

    function ensureCss() {
      try {
        if (typeof document === 'undefined') return
        if (document.querySelector('style[data-plugin-css="dsh-capyreporter"]')) return
        const tag = document.createElement('style')
        tag.dataset.pluginCss = 'dsh-capyreporter'
        tag.textContent = SETTINGS_CSS + '\n' + PET_CSS
        document.head.appendChild(tag)
      } catch (e) {}
    }

    async function getJSON(path, opts) {
      const r = await fetch(ROUTE + path, opts)
      return r.json()
    }
    async function postJSON(path, body) {
      return getJSON(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
    }

    function bubbleModel(act) {
      if (!act) return null
      const done = act.completed
      if (done) return { mode: 'done', at: done.at, head: '\u2705 Task complete \u2014 ' + (done.title || 'Task'), lines: [], detail: null, hint: 'click to expand \u00B7 double-click to dismiss' }
      const n = act.runningCount | 0
      if (n > 0) {
        const first = (act.running && act.running[0]) || {}
        const head = n > 1 ? '\u23F3 ' + n + ' tasks running \u2014 ' + (first.title || 'Session') : '\u23F3 Working: ' + (first.title || 'Session')
        return { mode: 'working', at: null, head: head, lines: first.lines || [], detail: (first.preview || '').slice(0, 260) || null, hint: 'click to expand \u00B7 double-click to hide' }
      }
      return null
    }

    // Content signature of the activity feed: the bubble auto-(re)appears whenever
    // the signature changes (new preview, task count change, completion) and stays
    // hidden after a click until then.
    function activitySig(act) {
      if (!act) return 'none'
      if (act.completed) return 'done:' + act.completed.at
      const n = act.runningCount | 0
      if (n > 0) {
        const first = (act.running && act.running[0]) || {}
        return 'work:' + n + ':' + (first.title || '') + ':' + (first.preview || '')
      }
      return 'none'
    }

    function notifyDone(comp, lastAtRef) {
      try {
        if (lastAtRef.at === comp.at) return
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        lastAtRef.at = comp.at
        new Notification('CapyReporter', { body: '\u2705 Task complete \u2014 ' + (comp.title || 'Task'), tag: 'dsh-capyreporter-complete' })
      } catch (e) {}
    }

    function PetOverlay() {
      const activity = React.useState(null)
      const enabled = React.useState(true)
      const hasCustom = React.useState(false)
      const desktop = React.useState(false)
      const menu = React.useState(false)
      const bounce = React.useState(false)
      const pos = React.useState({
        left: 24,
        top: typeof window !== 'undefined' ? Math.max(120, window.innerHeight - 420) : 220,
      })
      const drag = React.useState({ s: null })
      const imgToken = React.useState(0)
      const setActivity = activity[1]
      const setEnabled = enabled[1]
      const setHasCustom = hasCustom[1]
      const setDesktop = desktop[1]
      const setMenu = menu[1]
      const setBounce = bounce[1]
      const setPos = pos[1]
      const dragState = drag[0]
      const setImgToken = imgToken[1]
      const lastNotified = React.useState({ at: null }) // plain object ref; stable across renders
      const customRef = React.useState({ v: null }) // stable object ref for hasCustom change detection
      const suppressed = React.useState({ sig: null }) // stable ref: bubble signature hidden by a double-click
      const expanded = React.useState(false) // single-click expands the step log
      const setExpanded = expanded[1]
      const scale = React.useState(1) // pet size multiplier, owned by the host config
      const setScale = scale[1]
      const scaleRef = React.useRef(1)
      scaleRef.current = scale[0]
      const wheelBound = React.useRef(false)
      const bindImg = React.useCallback((node) => {
        if (!node || wheelBound.current) return
        wheelBound.current = true
        // Ctrl + wheel over the pet resizes her. Non-passive listener so the
        // browser zoom gesture can be suppressed; the size is stored host-side
        // and shared with the desktop window and the Settings slider.
        node.addEventListener('wheel', (e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          const next = Math.min(2.5, Math.max(0.5, Math.round((scaleRef.current + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10))
          if (next === scaleRef.current) return
          scaleRef.current = next
          setScale(next)
          postJSON('/scale', { scale: next }).catch(() => {})
        }, { passive: false })
      }, [])

      React.useEffect(() => {
        let alive = true
        const poll = async () => {
          try {
            const a = await getJSON('/activity')
            if (!alive) return
            setActivity(a)
            if (a && a.completed) notifyDone(a.completed, lastNotified[0])
          } catch (e) {}
          try {
            const s = await getJSON('/state')
            if (!alive) return
            setEnabled(s.enabled)
            setHasCustom(s.hasCustom)
            setDesktop(!!s.desktop)
            if (typeof s.scale === 'number') setScale(s.scale)
            if (customRef[0].v !== s.hasCustom) {
              customRef[0].v = s.hasCustom
              setImgToken((x) => x + 1)
            }
          } catch (e) {}
        }
        poll()
        const iv = setInterval(poll, 1200)
        return () => {
          alive = false
          clearInterval(iv)
        }
      }, [])

      // Hide the in-page overlay while the always-on-top desktop window is running,
      // so there's only one pet. Falls back to the in-page pet if the desktop window isn't up.
      if (!enabled[0] || desktop[0]) return null
      const sig = activitySig(activity[0])
      const raw = bubbleModel(activity[0])
      const bubble = raw && sig !== suppressed[0].sig ? raw : null

      const dismissDone = () => {
        const at = activity[0] && activity[0].completed ? activity[0].completed.at : null
        if (at) {
          try {
            postJSON('/dismiss', { at })
          } catch (e) {}
          setActivity(Object.assign({}, activity[0], { completed: null }))
        }
      }
      const onLeftClick = () => {
        if (activity[0] && activity[0].completed) {
          dismissDone()
          return
        }
        setBounce(true)
        setTimeout(() => setBounce(false), 220)
      }
      const turnOff = async () => {
        try {
          await postJSON('/enabled', { enabled: false })
        } catch (e) {}
        setEnabled(false)
      }
      const onPointerDown = (e) => {
        if (e.button !== 0) return
        dragState.s = { sx: e.clientX, sy: e.clientY, bx: pos[0].left, by: pos[0].top }
      }
      const onPointerMove = (e) => {
        const d = dragState.s
        if (!d) return
        const w = typeof window !== 'undefined' ? window.innerWidth : 800
        const h = typeof window !== 'undefined' ? window.innerHeight : 600
        const clamp = (v, max) => Math.max(0, Math.min(v, max))
        const m = scaleRef.current
        setPos({ left: clamp(d.bx + (e.clientX - d.sx), w - Math.round(140 * m)), top: clamp(d.by + (e.clientY - d.sy), h - Math.round(160 * m)) })
      }
      const onPointerUp = () => {
        dragState.s = null
      }

      const menuItems = []
      if (suppressed[0].sig !== null) menuItems.push(['Restore bubble', () => { suppressed[0].sig = null; setExpanded(false) }])
      if (bubble && bubble.mode === 'done') menuItems.push(['Dismiss notification', dismissDone])
      menuItems.push(['Hide pet', turnOff])

      return React.createElement(
        'div',
        { className: 'dsh-pet-float', style: { left: pos[0].left, top: pos[0].top } },
        bubble
          ? React.createElement(
              'div',
              { className: 'dsh-pet-bubble', onClick: () => setExpanded(!expanded[0]), onDoubleClick: () => {
                  suppressed[0].sig = sig
                  if (raw.mode === 'done') dismissDone()
                  setExpanded(false)
                } },
              React.createElement('div', { className: 'dsh-pet-bubble-head' }, bubble.head),
              expanded[0] && bubble.lines.length
                ? React.createElement('div', { className: 'dsh-pet-bubble-log' },
                    bubble.lines.map((l, i) => React.createElement('div', { className: 'dsh-pet-bubble-line', key: i }, l)),
                  )
                : bubble.detail
                  ? React.createElement('div', { className: 'dsh-pet-bubble-detail' }, bubble.detail)
                  : null,
              bubble.hint ? React.createElement('div', { className: 'dsh-pet-hint' }, bubble.hint) : null,
            )
          : null,
        menu[0]
          ? React.createElement(
              'div',
              { className: 'dsh-pet-menu' },
              menuItems.map((it, i) =>
                React.createElement(
                  'button',
                  {
                    className: 'dsh-pet-menu-item',
                    key: i,
                    onClick: () => {
                      setMenu(false)
                      it[1]()
                    },
                  },
                  it[0],
                ),
              ),
            )
          : null,
        React.createElement('img', {
          className: 'dsh-pet-img' + (bounce[0] ? ' bounce' : ''),
          style: { width: Math.round(132 * scale[0]) + 'px' },
          ref: bindImg,
          src: ROUTE + '/image?v=' + imgToken[0],
          draggable: false,
          onPointerDown: onPointerDown,
          onPointerMove: onPointerMove,
          onPointerUp: onPointerUp,
          onClick: onLeftClick,
          onContextMenu: (e) => {
            e.preventDefault()
            setMenu(!menu[0])
          },
        }),
      )
    }

    function PetSettings() {
      const tick = React.useState(0)
      const confirming = React.useState(false)
      const msg = React.useState(null)
      const enabled = React.useState(true)
      const hasCustom = React.useState(false)
      const desktopOn = React.useState(false)
      const petScale = React.useState(1)
      const setTick = tick[1]
      const setConfirming = confirming[1]
      const setMsg = msg[1]
      const setEnabled = enabled[1]
      const setHasCustom = hasCustom[1]
      const setDesktopOn = desktopOn[1]
      const setPetScale = petScale[1]

      React.useEffect(() => {
        let alive = true
        const refresh = async () => {
          try {
            const s = await getJSON('/state')
            if (!alive) return
            setEnabled(s.enabled)
            setHasCustom(s.hasCustom)
            setDesktopOn(!!s.desktopEnabled)
            if (typeof s.scale === 'number') setPetScale(s.scale)
            setTick((x) => x + 1)
          } catch (e) {}
        }
        refresh()
        const iv = setInterval(refresh, 2500)
        return () => {
          alive = false
          clearInterval(iv)
        }
      }, [])

      const onToggle = async () => {
        const next = !enabled[0]
        setEnabled(next)
        setTick((x) => x + 1)
        try {
          await postJSON('/enabled', { enabled: next })
        } catch (e) {}
        if (next) {
          setMsg(null)
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission()
          } catch (e) {}
        }
      }

      const onDesktopToggle = async () => {
        const next = !desktopOn[0]
        setDesktopOn(next)
        try {
          await postJSON(next ? '/desktop/show' : '/desktop/hide', {})
        } catch (e) {}
      }

      const onSizeSlider = (ev) => {
        const next = Math.min(2.5, Math.max(0.5, Number(ev.target.value) / 100 || 1))
        setPetScale(next)
        postJSON('/scale', { scale: next }).catch(() => {})
      }

      const onUpload = (ev) => {
        const f = ev.target.files && ev.target.files[0]
        ev.target.value = ''
        if (!f) return
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const r = await postJSON('/image', { dataUrl: String(reader.result) })
            if (r && r.ok) {
              setHasCustom(true)
              setMsg(null)
            } else {
              setMsg((r && r.error) || 'Upload failed.')
            }
            setTick((x) => x + 1)
          } catch (e) {
            setMsg('Upload failed: ' + ((e && e.message) || e))
          }
        }
        reader.readAsDataURL(f)
      }

      const onReset = async () => {
        try {
          await postJSON('/reset', {})
        } catch (e) {}
        setHasCustom(false)
        setMsg(null)
        setTick((x) => x + 1)
      }

      const onUninstall = async () => {
        if (!confirming[0]) {
          setConfirming(true)
          return
        }
        setConfirming(false)
        try {
          await postJSON('/enabled', { enabled: false })
          await postJSON('/reset', {})
        } catch (e) {}
        setEnabled(false)
        setHasCustom(false)
        setMsg('Pet hidden and its data cleared. To remove the plugin itself, ask the assistant to remove the \u201Cdesktop pet\u201D plugin.')
      }

      const children = []
      children.push(
        React.createElement(
          'div',
          { className: 'dsh-pet-row', key: 'toggle' },
          React.createElement(
            'div',
            { className: 'dsh-pet-row-main' },
            React.createElement('div', { className: 'dsh-pet-title' }, 'Floating desktop pet'),
            React.createElement(
              'div',
              { className: 'dsh-pet-hint' },
              'CapyReporter floats on this page over the interface. Drag her where you like; a speech bubble reports running work \u2014 click it to hide it until the next update or completion. \u201CTask complete\u201D stays until you click it. When you are away she sends a desktop notification when a task finishes.',
            ),
          ),
          React.createElement('button', {
            'data-on': enabled[0] ? '1' : '0',
            className: 'dsh-pet-toggle',
            'aria-label': enabled[0] ? 'Hide floating pet' : 'Show floating pet',
            onClick: onToggle,
          }),
        ),
      )

      children.push(
        React.createElement(
          'div',
          { className: 'dsh-pet-row', key: 'desktop' },
          React.createElement(
            'div',
            { className: 'dsh-pet-row-main' },
            React.createElement('div', { className: 'dsh-pet-title' }, 'Always-on-top desktop window'),
            React.createElement(
              'div',
              { className: 'dsh-pet-hint' },
              'Shows CapyReporter in a small transparent window that stays above other apps \u2014 even when this page or another app has focus. Turn off to keep her only on this page.',
            ),
          ),
          React.createElement('button', {
            'data-on': desktopOn[0] ? '1' : '0',
            className: 'dsh-pet-toggle',
            'aria-label': desktopOn[0] ? 'Hide desktop window' : 'Show desktop window',
            onClick: onDesktopToggle,
          }),
        ),
      )

      children.push(
        React.createElement(
          'div',
          { className: 'dsh-pet-row', key: 'size' },
          React.createElement(
            'div',
            { className: 'dsh-pet-row-main' },
            React.createElement('div', { className: 'dsh-pet-title' }, 'Pet size'),
            React.createElement(
              'div',
              { className: 'dsh-pet-hint' },
              'Drag the slider, or hold Ctrl and scroll over the pet (plain scroll works over the desktop window). The size applies to the on-page pet and the desktop window and survives restarts.',
            ),
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' } },
            React.createElement('input', {
              type: 'range',
              min: 50,
              max: 250,
              step: 5,
              value: Math.round(petScale[0] * 100),
              onChange: onSizeSlider,
              style: { width: '150px' },
              'aria-label': 'Pet size percent',
            }),
            React.createElement('span', { style: { fontSize: '12px', opacity: 0.75, minWidth: '38px', textAlign: 'right' } }, Math.round(petScale[0] * 100) + '%'),
          ),
        ),
      )

      children.push(
        React.createElement(
          'div',
          { className: 'dsh-pet-row', key: 'image' },
          React.createElement('img', { className: 'dsh-pet-preview', src: ROUTE + '/image?v=' + tick[0], alt: 'Current pet appearance' }),
          React.createElement(
            'div',
            { className: 'dsh-pet-row-main' },
            React.createElement('div', { className: 'dsh-pet-title' }, 'Pet appearance'),
            React.createElement('div', { className: 'dsh-pet-hint' }, 'Use a transparent PNG so she floats cleanly (under ~4 MB).'),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              React.createElement(
                'label',
                { className: 'dsh-pet-btn', style: { display: 'inline-flex', alignItems: 'center' } },
                'Replace image\u2026',
                React.createElement('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onUpload }),
              ),
              hasCustom[0] ? React.createElement('button', { className: 'dsh-pet-btn', onClick: onReset }, 'Reset to CapyReporter') : null,
            ),
          ),
        ),
      )

      children.push(
        React.createElement(
          'div',
          { className: 'dsh-pet-row', key: 'uninstall', style: { alignItems: 'flex-start' } },
          React.createElement(
            'div',
            { className: 'dsh-pet-row-main' },
            React.createElement('div', { className: 'dsh-pet-title' }, 'Uninstall'),
            React.createElement(
              'div',
              { className: 'dsh-pet-hint' },
              confirming[0] ? 'Hide the pet and clear its custom image? Click again to confirm.' : 'Hides the pet and clears its data.',
            ),
          ),
          React.createElement(
            'button',
            { className: 'dsh-pet-btn dsh-pet-btn-danger', onClick: onUninstall },
            confirming[0] ? 'Confirm uninstall' : 'Uninstall pet',
          ),
        ),
      )

      if (msg[0]) children.push(React.createElement('div', { className: 'dsh-pet-msg', key: 'msg' }, msg[0]))

      return React.createElement('div', { className: 'dsh-pet-section' }, children)
    }

    function apply(ctx) {
      ensureCss()
      ctx.slots.inject('shell.overlay', function* () {
        yield ctx.slots.register(
          { name: 'shell.overlay', id: 'dsh-pet-overlay', order: 500 },
          () => React.createElement(PetOverlay),
        )
      })
      ctx.slots.inject('settings.section', function* () {
        yield ctx.slots.register(
          { name: 'settings.section', id: 'dsh-capyreporter', order: 90, label: '\uD83D\uDC3E CapyReporter' },
          () => React.createElement(PetSettings),
        )
      })
    }

    return { name, inject, apply }
  }
}

window.__ModuleLoader__.load({
  id: 'dsh-capyreporter',
  factory: makeFactory(),
})
