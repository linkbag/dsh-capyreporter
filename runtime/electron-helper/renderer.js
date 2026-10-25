// Sandboxed renderer. Host IO is a narrow, authenticated main-process bridge.
(function () {
  const bridge = window.petBridge;
  const el = id => document.getElementById(id);
  const img = el('img'), bubble = el('bubble'), head = el('bubbleHead'), detail = el('bubbleDetail'), log = el('bubbleLog'), menu = el('menu');
  let scale = 1, imageRevision = null, expanded = false, suppressed = null, activity = null, sig = null;
  let timer = null, resizeTimer = null, stopped = false, failures = 0, pointer = null, dragging = false, interactive = false;
  let snoozed = false, muteMinutes = 30;
  const STRINGS = {
    en: {
      details: 'Details', collapse: 'Collapse', dismiss: 'Dismiss', dismissResult: 'Dismiss result',
      muteFor: 'Mute {n} min', runEnded: 'Run ended', stillRunning: '{n} still running', runningHead: '⏳ {n} running — {title}',
      disconnected: '⚠️ Reporter disconnected — retrying',
      activityAria: 'CapyReporter activity', logAria: 'Session activity details', controlsAria: 'CapyReporter controls; drag to move', menuAria: 'CapyReporter controls',
      restoreBubble: 'Restore bubble', openSite: 'Open DeepSeek Harness', usePagePet: 'Use page pet instead'
    },
    zh: {
      details: '详情', collapse: '收起', dismiss: '忽略', dismissResult: '忽略结果',
      muteFor: '静音 {n} 分钟', runEnded: '运行结束', stillRunning: '还有 {n} 个运行中', runningHead: '⏳ {n} 个运行中 — {title}',
      disconnected: '⚠️ 报告器已断开 — 正在重试',
      activityAria: 'CapyReporter 动态', logAria: '会话动态详情', controlsAria: 'CapyReporter 控制；可拖动移动', menuAria: 'CapyReporter 控制',
      restoreBubble: '恢复气泡', openSite: '打开 DeepSeek Harness', usePagePet: '改用网页宠物'
    }
  };
  const LOCALE = (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const t = (key, vars) => {
    let value = STRINGS[LOCALE][key] || key;
    if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.split('{' + name + '}').join(String(replacement));
    return value;
  };
  function applyI18n() {
    bubble.setAttribute('aria-label', t('activityAria'));
    log.setAttribute('aria-label', t('logAria'));
    img.setAttribute('alt', t('controlsAria'));
    menu.setAttribute('aria-label', t('menuAria'));
    el('menuRestore').textContent = t('restoreBubble');
    el('menuSite').textContent = t('openSite');
    el('menuHide').textContent = t('usePagePet');
  }
  applyI18n();
  const fit = { w: 0, h: 0 };
  function setInteractive(value) { if (value !== interactive) { interactive = value; bridge.setInteractive(value); } }
  function refit() {
    const ratio = img.naturalHeight / img.naturalWidth || 1;
    const width = Math.max(1, Math.min(Math.round(132 * scale), Math.round(window.screen.availHeight * .6 / ratio)));
    const imageHeight = Math.max(1, Math.round(width * ratio));
    // Use display-relative pixels, never vh of this self-resizing window.
    img.style.width = width + 'px';
    img.style.height = imageHeight + 'px';
    bubble.style.bottom = imageHeight + 8 + 'px';
    // Bubble tracks pet size: 360px at 100%, clamped to 260–560px.
    const bubbleWidth = Math.max(260, Math.min(560, Math.round(360 * scale)));
    bubble.style.width = bubbleWidth + 'px';
    const w = Math.min(window.screen.availWidth, Math.max(200, width + 24, bubble.style.display === 'none' ? 0 : bubbleWidth + 24));
    const h = Math.min(1500, imageHeight + (bubble.style.display === 'none' ? 40 : Math.min(256, bubble.scrollHeight + 24)));
    if (fit.w !== w || fit.h !== h) { fit.w = w; fit.h = h; bridge.resize({ w, h: Math.max(100, h) }); }
  }
  function showError(error) {
    head.textContent = '⚠️ ' + t('disconnected');
    detail.textContent = error.message;
    bubble.style.display = 'block';
    refit();
  }
  async function image(revision) {
    const source = await bridge.request('/image');
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Pet artwork could not be decoded'));
      img.src = source;
    });
    imageRevision = revision;
    refit();
  }
  function render() {
    const done = activity?.completed, running = activity?.running || [];
    sig = JSON.stringify([done?.at, ...running.map(row => [row.id, row.title, row.preview, row.lines?.at(-1)])]);
    if (suppressed === sig || snoozed || (!done && !running.length)) { bubble.style.display = 'none'; refit(); return; }
    head.textContent = done ? (done.label || t('runEnded')) + ' — ' + done.title + (running.length ? ' · ' + t('stillRunning', { n: running.length }) : '') : t('runningHead', { n: running.length, title: running[0].title });
    // Milestones only: the host already filters tool chatter out of preview.
    const row = running[0];
    detail.textContent = done?.preview || (row?.kind === 'think' ? '💭 ' + row.preview : row?.preview) || '';
    detail.style.display = expanded ? 'none' : 'block';
    log.classList.toggle('is-on', expanded);
    log.textContent = [...(done ? [done] : []), ...running].map(row => row.title + '\n' + (row.lines || []).join('\n') + (row.preview ? '\n' + row.preview : '')).join('\n\n');
    el('detailsButton').textContent = expanded ? t('collapse') : t('details');
    el('detailsButton').setAttribute('aria-expanded', String(expanded));
    el('dismissButton').textContent = done ? t('dismissResult') : t('dismiss');
    el('muteButton').textContent = t('muteFor', { n: muteMinutes });
    bubble.style.display = 'block';
    refit();
  }
  async function tick() {
    if (stopped) return;
    try {
      const state = await bridge.request('/state');
      // `desktop` is deliberately false until *we* finish bootstrap + heartbeat.
      if (!state.enabled || !state.desktopEnabled) { stopped = true; window.close(); return; }
      if (!resizeTimer && Number.isFinite(state.scale)) scale = state.scale;
      snoozed = !!state.snoozed;
      if (Number.isFinite(state.snoozeMinutes)) muteMinutes = state.snoozeMinutes;
      const revision = state.imageRevision ?? Number(state.hasCustom);
      if (imageRevision !== revision) await image(revision);
      activity = await bridge.request('/activity');
      if (stopped) return;
      render();
      await bridge.request('/desktop/heartbeat', {});
      failures = 0;
    } catch (error) {
      if (stopped) return;
      showError(error);
      // Stop ghost/orphan pets and allow the browser fallback after lost hosts.
      if (++failures >= 3) { stopped = true; window.close(); return; }
    } finally {
      if (!stopped) timer = setTimeout(tick, failures ? 2000 : 1200);
    }
  }
  el('detailsButton').addEventListener('click', () => { expanded = !expanded; render(); });
  el('dismissButton').addEventListener('click', () => {
    // Dismiss is always available: it hides the current bubble; when a run has
    // ended it also clears the result on the host.
    if (activity?.completed) bridge.request('/dismiss', { at: activity.completed.at }).catch(showError);
    suppressed = sig; expanded = false; bubble.style.display = 'none'; refit();
  });
  el('muteButton').addEventListener('click', async () => {
    try {
      await bridge.request('/snooze', { minutes: muteMinutes });
      snoozed = true; suppressed = sig; expanded = false; bubble.style.display = 'none'; refit();
    } catch (error) { showError(error); }
  });
  function toggleMenu() { const show = menu.style.display !== 'flex'; menu.style.display = show ? 'flex' : 'none'; img.setAttribute('aria-expanded', String(show)); if (show) el('menuRestore').focus(); }
  img.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMenu(); } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { menu.style.display = 'none'; expanded = false; img.focus(); render(); } });
  img.addEventListener('contextmenu', event => { event.preventDefault(); toggleMenu(); });
  img.addEventListener('dblclick', () => bridge.openSite());
  img.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointer = { x: event.screenX, y: event.screenY, moved: false };
    img.setPointerCapture(event.pointerId);
    setInteractive(true);
  });
  img.addEventListener('pointermove', event => {
    if (!pointer || dragging) return;
    if (Math.hypot(event.screenX - pointer.x, event.screenY - pointer.y) > 5) { pointer.moved = true; dragging = true; bridge.dragStart(); }
  });
  function endDrag() { if (dragging) bridge.dragEnd(); dragging = false; pointer = null; }
  img.addEventListener('pointerup', () => { const clicked = pointer && !pointer.moved; endDrag(); if (clicked) toggleMenu(); });
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  window.addEventListener('mousemove', event => {
    if (dragging || pointer) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    setInteractive(!!target?.closest('#img, #bubble, #menu'));
  });
  document.documentElement.addEventListener('mouseleave', () => { if (!dragging) setInteractive(false); });
  img.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    scale = Math.min(2.5, Math.max(.5, Math.round((scale + (event.deltaY < 0 ? .1 : -.1)) * 10) / 10));
    refit(); clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => { try { await bridge.request('/scale', { scale }); } catch (error) { showError(error); } finally { resizeTimer = null; } }, 180);
  }, { passive: false });
  el('menuRestore').addEventListener('click', () => { suppressed = null; snoozed = false; expanded = false; menu.style.display = 'none'; bridge.request('/snooze', { minutes: 0 }).catch(() => {}); render(); });
  el('menuSite').addEventListener('click', () => { menu.style.display = 'none'; bridge.openSite(); });
  el('menuHide').addEventListener('click', async () => { try { await bridge.request('/desktop/hide', {}); window.close(); } catch (error) { showError(error); } });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('#img, #menu')) menu.style.display = 'none'; });
  window.addEventListener('beforeunload', () => { stopped = true; clearTimeout(timer); clearTimeout(resizeTimer); endDrag(); img.onload = img.onerror = null; });
  tick();
})();
