// renderer for the always-on-top CapyReporter window. Fetches image + activity from the
// DSH host over HTTP; drags to move; left-click opens DSH; right-click shows a menu.
//
// Bubble UX: compact by default (headline + latest status line); single click
// expands into a scrollable step log; double click dismisses; the right-click
// menu can restore the bubble after a dismissal.
(function () {
  const params = new URLSearchParams(location.search);
  const base = params.get('baseUrl') || 'http://127.0.0.1:3080';
  const ROOT = base + '/dsh-capyreporter';

  const img = document.getElementById('img');
  const bubble = document.getElementById('bubble');
  const head = document.getElementById('bubbleHead');
  const detail = document.getElementById('bubbleDetail');
  const log = document.getElementById('bubbleLog');
  const hint = document.getElementById('bubbleHint');
  const menu = document.getElementById('menu');
  const root = document.getElementById('root');

  let version = 0;
  let hasCustom = null;
  let lastSig = null;
  let suppressedSig = null; // bubble hidden by double-click; auto-clears when content changes
  let expanded = false;
  let lastCharge = null; // last rendered status {kind, head, lines, preview, hint, at}

  // Content signature of the activity feed: the bubble auto-(re)appears whenever
  // the signature changes (new step line, task count change, completion).
  function activitySig(a) {
    if (!a) return 'none';
    if (a.completed) return 'done:' + a.completed.at;
    if (a.runningCount > 0) {
      const f = (a.running && a.running[0]) || {};
      const lines = (f.lines || []).join('|');
      return 'work:' + a.runningCount + ':' + (f.title || '') + ':' + lines;
    }
    return 'none';
  }

  function chargeOf(a) {
    if (a && a.completed) {
      return { kind: 'done', head: '\u2705 Task complete \u2014 ' + (a.completed.title || 'Task'), lines: [], preview: null, hint: 'click to expand \u00B7 double-click to dismiss', at: a.completed.at };
    }
    if (a && a.runningCount > 0) {
      const f = a.running[0] || {};
      const headStr = a.runningCount > 1 ? '\u23F3 ' + a.runningCount + ' tasks running \u2014 ' + (f.title || 'Session') : '\u23F3 Working: ' + (f.title || 'Session');
      return { kind: 'working', head: headStr, lines: f.lines || [], preview: f.preview || null, hint: 'click to expand \u00B7 double-click to hide', at: null };
    }
    return null;
  }

  // Pet size: a uniform multiplier owned by the host config (shared with the
  // in-page pet and the Settings slider). Plain wheel over the window resizes;
  // the image keeps its aspect ratio, the bubble is re-pinned just above it.
  // refit() fits the window around BOTH the pet and the bubble, so the bubble
  // can report a fuller status (expanded step log) without the window blowing up.
  const BASE_IMG_H = 182;
  let scale = 1;
  // Only resize when the size actually changed: re-issuing an identical resize
  // every tick makes Windows' fractional-DPI bounds round-trip walk the window
  // down the screen a pixel at a time.
  const lastFit = { w: 0, h: 0 };
  function refit() {
    const imgH = Math.round(BASE_IMG_H * scale);
    img.style.height = imgH + 'px';
    bubble.style.bottom = (imgH + 8) + 'px';
    const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.65;
    let w = Math.max(150, Math.round(220 * scale), Math.round(imgH * aspect) + 24);
    let h = Math.max(120, imgH + Math.max(Math.round(72 * scale), 96));
    if (bubble.style.display !== 'none' && bubble.scrollWidth > 0) {
      const bw = Math.min(Math.ceil(bubble.scrollWidth) + 28, 1060); // bubble is capped at 1000px; grow the window with it
      const bhCap = expanded ? 220 : 170;
      const bh = Math.min(Math.ceil(bubble.scrollHeight) + 16, bhCap);
      w = Math.max(w, bw);
      h = Math.max(h, imgH + 12 + bh);
    }
    w = Math.round(w);
    h = Math.round(h);
    if (w === lastFit.w && h === lastFit.h) return;
    lastFit.w = w;
    lastFit.h = h;
    window.petBridge.resize({ w: w, h: h });
  }
  img.addEventListener('load', () => refit());
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const next = Math.min(2.5, Math.max(0.5, Math.round((scale + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10));
    if (next === scale) return;
    scale = next;
    refit();
    post('/scale', { scale: scale });
  }, { passive: false });

  async function loadImage() {
    img.src = ROOT + '/image?v=' + ++version + '&t=' + Date.now();
  }

  async function post(path, body) {
    try {
      await fetch(ROOT + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
    } catch (e) {}
  }

  function renderBubble(c) {
    head.textContent = c.head;
    if (expanded && c.lines.length) {
      detail.style.display = 'none';
      log.classList.add('is-on');
      while (log.firstChild) log.removeChild(log.firstChild);
      for (const l of c.lines) {
        const d = document.createElement('div');
        d.className = 'bub-line';
        d.textContent = l;
        log.appendChild(d);
      }
      log.scrollTop = log.scrollHeight;
    } else {
      log.classList.remove('is-on');
      const cd = c.lines.length ? c.lines[c.lines.length - 1] : c.preview;
      if (cd) {
        detail.textContent = cd;
        detail.style.display = '-webkit-box';
      } else {
        detail.textContent = '';
        detail.style.display = 'none';
      }
    }
    if (c.hint) {
      hint.textContent = c.hint;
      hint.style.display = 'inline';
    } else {
      hint.style.display = 'none';
    }
    bubble.style.display = 'flex';
    bubble.dataset.mode = c.kind;
    if (c.at !== undefined && c.at !== null) bubble.dataset.at = c.at;
    else delete bubble.dataset.at;
    refit();
  }

  function hideBubble() {
    bubble.style.display = 'none';
    refit();
  }

  function restoreBubble() {
    suppressedSig = null;
    expanded = false;
    if (lastCharge) renderBubble(lastCharge);
  }

  async function tick() {
    // activity -> bubble
    try {
      const a = await (await fetch(ROOT + '/activity')).json();
      const sig = activitySig(a);
      lastSig = sig;
      if (suppressedSig !== null && sig !== suppressedSig) suppressedSig = null; // content changed -> show again
      if (suppressedSig !== null) {
        hideBubble();
      } else {
        const c = chargeOf(a);
        lastCharge = c;
        if (c) renderBubble(c);
        else hideBubble();
      }
    } catch (e) {}

    // state -> refresh image when custom image changes; close if host hid the pet
    try {
      const s = await (await fetch(ROOT + '/state')).json();
      if (s.desktop === false) {
        window.close();
        return;
      }
      if (hasCustom === null) hasCustom = s.hasCustom;
      else if (hasCustom !== s.hasCustom) {
        hasCustom = s.hasCustom;
        loadImage();
      }
      if (typeof s.scale === 'number' && Math.abs(s.scale - scale) > 0.001) {
        scale = s.scale;
        refit();
      }
    } catch (e) {}
  }

  // single click -> expand/collapse the step log
  bubble.addEventListener('click', (ev) => {
    ev.stopPropagation();
    expanded = !expanded;
    if (lastCharge) renderBubble(lastCharge);
  });

  // double click -> dismiss (hide until the content changes); completed bubbles get dismissed server-side too
  bubble.addEventListener('dblclick', (ev) => {
    ev.stopPropagation();
    expanded = false;
    if (lastSig) suppressedSig = lastSig;
    const at = bubble.dataset.at;
    if (at) {
      try {
        post('/dismiss', { at: Number(at) });
      } catch (e) {}
    }
    hideBubble();
  });

  // drag — pointer capture keeps the move stream alive even when the cursor
  // outruns the small window, and we hold the window interactive for the whole
  // drag (a mouseleave during a fast drag would otherwise flip it click-through
  // mid-drag and drop the trail).
  let drag = null;
  img.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    try { img.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY };
    window.petBridge.setInteractive(true);
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (drag) window.petBridge.move(drag.wx + (e.screenX - drag.sx), drag.wy + (e.screenY - drag.sy));
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    window.petBridge.setInteractive(true); // pointer is still over the pet when a drag ends
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // hover -> interactive (so clicks work); leave -> click-through (never mid-drag)
  root.addEventListener('mouseenter', () => window.petBridge.setInteractive(true));
  root.addEventListener('mouseleave', () => {
    if (!drag) window.petBridge.setInteractive(false);
  });

  // left-click (not a drag) -> open DSH in default browser
  img.addEventListener('click', () => window.petBridge.openSite(base));

  // right-click menu
  img.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  });
  document.getElementById('menuRestore').addEventListener('click', () => {
    menu.style.display = 'none';
    restoreBubble();
  });
  document.getElementById('menuSite').addEventListener('click', () => {
    menu.style.display = 'none';
    window.petBridge.openSite(base);
  });
  document.getElementById('menuHide').addEventListener('click', async () => {
    menu.style.display = 'none';
    await post('/desktop/hide');
    window.close();
  });

  loadImage();
  tick();
  setInterval(tick, 1200);
})();
