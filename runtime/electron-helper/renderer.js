// Sandboxed renderer. Host IO is a narrow, authenticated main-process bridge.
(function () {
  const bridge = window.petBridge;
  const el = id => document.getElementById(id);
  const img = el('img'), bubble = el('bubble'), head = el('bubbleHead'), detail = el('bubbleDetail'), log = el('bubbleLog'), menu = el('menu');
  const chatButton = el('chatButton'), menuChat = el('menuChat');
  let scale = 1, imageRevision = null, expanded = false, suppressed = null, activity = null, sig = null;
  let timer = null, resizeTimer = null, stopped = false, failures = 0, pointer = null, dragging = false, interactive = false;
  let snoozed = false, muteMinutes = 30, rz = null;
  // User-chosen bubble size in DIPs. w = 0 means "track the pet scale"; h = 0
  // means "content driven" (up to the CSS max-height).
  const bubbleSize = { w: 0, h: 0 };
  const STRINGS = {
    en: {
      details: 'Details', collapse: 'Collapse', dismiss: 'Dismiss', dismissResult: 'Dismiss result', goToChat: 'Go to chat',
      muteFor: 'Mute {n} min', runEnded: 'Run ended', stillRunning: '{n} still running', runningHead: '⏳ {n} running — {title}',
      subagentFinished: '✅ Subagent finished',
      subagentFailed: '⚠️ Subagent failed',
      subagentCancelled: '⏹ Subagent cancelled',
      disconnected: '⚠️ Reporter disconnected — retrying',
      activityAria: 'CapyReporter activity', logAria: 'Session activity details', controlsAria: 'CapyReporter controls; drag to move', menuAria: 'CapyReporter controls',
      restoreBubble: 'Restore bubble', openSite: 'Open DeepSeek Harness', usePagePet: 'Use page pet instead', resetSize: 'Reset bubble size',
      bubbleSizeAria: 'Resize bubble (pixels)'
    },
    zh: {
      details: '详情', collapse: '收起', dismiss: '忽略', dismissResult: '忽略结果', goToChat: '转到会话',
      muteFor: '静音 {n} 分钟', runEnded: '运行结束', stillRunning: '还有 {n} 个运行中', runningHead: '⏳ {n} 个运行中 — {title}',
      subagentFinished: '✅ 子智能体已完成',
      subagentFailed: '⚠️ 子智能体失败',
      subagentCancelled: '⏹ 子智能体已取消',
      disconnected: '⚠️ 报告器已断开 — 正在重试',
      activityAria: 'CapyReporter 动态', logAria: '会话动态详情', controlsAria: 'CapyReporter 控制；可拖动移动', menuAria: 'CapyReporter 控制',
      restoreBubble: '恢复气泡', openSite: '打开 DeepSeek Harness', usePagePet: '改用网页宠物', resetSize: '重置气泡大小',
      bubbleSizeAria: '调整气泡尺寸（像素）'
    },
    es: {
      details: 'Detalles', collapse: 'Contraer', dismiss: 'Descartar', dismissResult: 'Descartar resultado', goToChat: 'Ir al chat',
      muteFor: 'Silenciar {n} min', runEnded: 'Ejecución finalizada', stillRunning: '{n} aún en ejecución', runningHead: '⏳ {n} en ejecución — {title}',
      subagentFinished: '✅ Subagente finalizado',
      subagentFailed: '⚠️ Subagente falló',
      subagentCancelled: '⏹ Subagente cancelado',
      disconnected: '⚠️ Reportero desconectado — reintentando',
      activityAria: 'Actividad de CapyReporter', logAria: 'Detalles de actividad de la sesión', controlsAria: 'Controles de CapyReporter; arrastra para mover', menuAria: 'Controles de CapyReporter',
      restoreBubble: 'Restaurar burbuja', openSite: 'Abrir DeepSeek Harness', usePagePet: 'Usar mascota de la página', resetSize: 'Restablecer tamaño',
      bubbleSizeAria: 'Cambiar tamaño de la burbuja (píxeles)'
    },
    hi: {
      details: 'विवरण', collapse: 'छोटा करें', dismiss: 'खारिज करें', dismissResult: 'परिणाम खारिज करें', goToChat: 'चैट पर जाएँ',
      muteFor: '{n} मिनट म्यूट करें', runEnded: 'रन पूरा हुआ', stillRunning: '{n} अभी चल रहे हैं', runningHead: '⏳ {n} चल रहे हैं — {title}',
      subagentFinished: '✅ सबएजेंट पूर्ण',
      subagentFailed: '⚠️ सबएजेंट विफल',
      subagentCancelled: '⏹ सबएजेंट रद्द',
      disconnected: '⚠️ रिपोर्टर डिस्कनेक्ट — पुनः प्रयास',
      activityAria: 'CapyReporter गतिविधि', logAria: 'सत्र गतिविधि विवरण', controlsAria: 'CapyReporter नियंत्रण; खींचकर ले जाएँ', menuAria: 'CapyReporter नियंत्रण',
      restoreBubble: 'बबल बहाल करें', openSite: 'DeepSeek Harness खोलें', usePagePet: 'पेज पेट इस्तेमाल करें', resetSize: 'बबल आकार रीसेट करें',
      bubbleSizeAria: 'बबल का आकार बदलें (पिक्सेल)'
    },
    ar: {
      details: 'التفاصيل', collapse: 'طيّ', dismiss: 'تجاهل', dismissResult: 'تجاهل النتيجة', goToChat: 'الانتقال إلى المحادثة',
      muteFor: 'كتم {n} دقيقة', runEnded: 'انتهى التشغيل', stillRunning: '{n} قيد التشغيل', runningHead: '⏳ {n} قيد التشغيل — {title}',
      subagentFinished: '✅ اكتمل الوكيل الفرعي',
      subagentFailed: '⚠️ فشل الوكيل الفرعي',
      subagentCancelled: '⏹ أُلغي الوكيل الفرعي',
      disconnected: '⚠️ انقطع المُبلّغ — إعادة المحاولة',
      activityAria: 'نشاط CapyReporter', logAria: 'تفاصيل نشاط الجلسة', controlsAria: 'عناصر تحكم CapyReporter؛ اسحب للتحريك', menuAria: 'عناصر تحكم CapyReporter',
      restoreBubble: 'استعادة الفقاعة', openSite: 'افتح DeepSeek Harness', usePagePet: 'استخدم حيوان الصفحة', resetSize: 'إعادة تعيين حجم الفقاعة',
      bubbleSizeAria: 'تغيير حجم الفقاعة (بكسل)'
    },
    pt: {
      details: 'Detalhes', collapse: 'Recolher', dismiss: 'Descartar', dismissResult: 'Descartar resultado', goToChat: 'Ir para o chat',
      muteFor: 'Silenciar {n} min', runEnded: 'Execução concluída', stillRunning: '{n} ainda em execução', runningHead: '⏳ {n} em execução — {title}',
      subagentFinished: '✅ Subagente concluído',
      subagentFailed: '⚠️ Subagente falhou',
      subagentCancelled: '⏹ Subagente cancelado',
      disconnected: '⚠️ Relator desconectado — tentando novamente',
      activityAria: 'Atividade do CapyReporter', logAria: 'Detalhes da atividade da sessão', controlsAria: 'Controles do CapyReporter; arraste para mover', menuAria: 'Controles do CapyReporter',
      restoreBubble: 'Restaurar balão', openSite: 'Abrir DeepSeek Harness', usePagePet: 'Usar mascote da página', resetSize: 'Redefinir tamanho',
      bubbleSizeAria: 'Redimensionar balão (pixels)'
    },
    ru: {
      details: 'Подробности', collapse: 'Свернуть', dismiss: 'Скрыть', dismissResult: 'Скрыть результат', goToChat: 'Перейти в чат',
      muteFor: 'Без звука {n} мин', runEnded: 'Запуск завершён', stillRunning: 'ещё выполняется: {n}', runningHead: '⏳ выполняется: {n} — {title}',
      subagentFinished: '✅ Субагент завершён',
      subagentFailed: '⚠️ Субагент завершился с ошибкой',
      subagentCancelled: '⏹ Субагент отменён',
      disconnected: '⚠️ Отчёт отключён — повторная попытка',
      activityAria: 'Активность CapyReporter', logAria: 'Подробности активности сессии', controlsAria: 'Управление CapyReporter; перетащите, чтобы переместить', menuAria: 'Управление CapyReporter',
      restoreBubble: 'Вернуть пузырь', openSite: 'Открыть DeepSeek Harness', usePagePet: 'Питомец на странице', resetSize: 'Сбросить размер',
      bubbleSizeAria: 'Изменить размер пузыря (пиксели)'
    },
    ja: {
      details: '詳細', collapse: '折りたたむ', dismiss: '閉じる', dismissResult: '結果を閉じる', goToChat: 'チャットへ',
      muteFor: '{n} 分ミュート', runEnded: '実行終了', stillRunning: '実行中 {n} 件', runningHead: '⏳ 実行中 {n} 件 — {title}',
      subagentFinished: '✅ サブエージェント完了',
      subagentFailed: '⚠️ サブエージェント失敗',
      subagentCancelled: '⏹ サブエージェント中止',
      disconnected: '⚠️ レポーター切断 — 再接続中',
      activityAria: 'CapyReporter アクティビティ', logAria: 'セッションの詳細', controlsAria: 'CapyReporter の操作。ドラッグで移動', menuAria: 'CapyReporter の操作',
      restoreBubble: 'バブルを戻す', openSite: 'DeepSeek Harness を開く', usePagePet: 'ページのペットを使う', resetSize: 'バブルのサイズをリセット',
      bubbleSizeAria: 'バブルのサイズ変更（ピクセル）'
    },
    fr: {
      details: 'Détails', collapse: 'Réduire', dismiss: 'Masquer', dismissResult: 'Masquer le résultat', goToChat: 'Aller au chat',
      muteFor: 'Silence {n} min', runEnded: 'Exécution terminée', stillRunning: '{n} encore en cours', runningHead: '⏳ {n} en cours — {title}',
      subagentFinished: '✅ Sous-agent terminé',
      subagentFailed: '⚠️ Échec du sous-agent',
      subagentCancelled: '⏹ Sous-agent annulé',
      disconnected: '⚠️ Rapporteur déconnecté — nouvelle tentative',
      activityAria: 'Activité CapyReporter', logAria: 'Détails de l’activité de la session', controlsAria: 'Contrôles CapyReporter ; glissez pour déplacer', menuAria: 'Contrôles CapyReporter',
      restoreBubble: 'Restaurer la bulle', openSite: 'Ouvrir DeepSeek Harness', usePagePet: 'Mascotte de la page', resetSize: 'Réinitialiser la taille',
      bubbleSizeAria: 'Redimensionner la bulle (pixels)'
    },
    de: {
      details: 'Details', collapse: 'Einklappen', dismiss: 'Ausblenden', dismissResult: 'Ergebnis ausblenden', goToChat: 'Zum Chat',
      muteFor: '{n} Min. stumm', runEnded: 'Lauf beendet', stillRunning: '{n} laufen noch', runningHead: '⏳ {n} laufen — {title}',
      subagentFinished: '✅ Subagent fertig',
      subagentFailed: '⚠️ Subagent fehlgeschlagen',
      subagentCancelled: '⏹ Subagent abgebrochen',
      disconnected: '⚠️ Reporter getrennt — neuer Versuch',
      activityAria: 'CapyReporter-Aktivität', logAria: 'Details zur Sitzungsaktivität', controlsAria: 'CapyReporter-Steuerung; zum Verschieben ziehen', menuAria: 'CapyReporter-Steuerung',
      restoreBubble: 'Blase wiederherstellen', openSite: 'DeepSeek Harness öffnen', usePagePet: 'Seiten-Pet verwenden', resetSize: 'Blasengröße zurücksetzen',
      bubbleSizeAria: 'Blasengröße ändern (Pixel)'
    }
  };
  const autoLocale = () => {
    const lang = (navigator.language || 'en').toLowerCase().split('-')[0];
    return STRINGS[lang] ? lang : 'en';
  };
  let locale = autoLocale();
  const t = (key, vars) => {
    let value = (STRINGS[locale] && STRINGS[locale][key]) || STRINGS.en[key] || key;
    if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.split('{' + name + '}').join(String(replacement));
    return value;
  };
  function applyI18n() {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    bubble.setAttribute('aria-label', t('activityAria'));
    log.setAttribute('aria-label', t('logAria'));
    img.setAttribute('alt', t('controlsAria'));
    menu.setAttribute('aria-label', t('menuAria'));
    el('menuRestore').textContent = t('restoreBubble');
    el('menuChat').textContent = t('goToChat');
    el('menuSite').textContent = t('openSite');
    el('menuReset').textContent = t('resetSize');
    el('menuHide').textContent = t('usePagePet');
    el('chatButton').textContent = t('goToChat');
    el('muteButton').textContent = t('muteFor', { n: muteMinutes });
    const grip = bubble.querySelector('.rz-se');
    grip.setAttribute('aria-label', t('bubbleSizeAria'));
    grip.setAttribute('aria-valuetext', Math.round(bubbleSize.w) + ' × ' + (bubbleSize.h ? Math.round(bubbleSize.h) : 'auto') + 'px');
  }
  applyI18n();
  const fit = { w: 0, h: 0 };
  function setInteractive(value) { if (value !== interactive) { interactive = value; bridge.setInteractive(value); } }
  function bubbleHeight() {
    if (bubbleSize.h) return bubbleSize.h;
    return Math.max(24, Math.round(bubble.getBoundingClientRect().height));
  }
  function refit() {
    const ratio = img.naturalHeight / img.naturalWidth || 1;
    const width = Math.max(1, Math.min(Math.round(132 * scale), Math.round(window.screen.availHeight * .6 / ratio)));
    const imageHeight = Math.max(1, Math.round(width * ratio));
    // Use display-relative pixels, never vh of this self-resizing window.
    img.style.width = width + 'px';
    img.style.height = imageHeight + 'px';
    bubble.style.bottom = imageHeight + 8 + 'px';
    // Until the user resizes, the bubble tracks the pet size (360px at 100%).
    if (!bubbleSize.w) bubbleSize.w = Math.max(260, Math.min(560, Math.round(360 * scale)));
    bubble.style.width = bubbleSize.w + 'px';
    bubble.style.height = bubbleSize.h ? bubbleSize.h + 'px' : 'auto';
    bubble.style.maxHeight = bubbleSize.h ? 'none' : '';
    const shown = bubble.style.display !== 'none';
    const bubbleH = shown ? bubbleHeight() : 0;
    const w = Math.min(window.screen.availWidth, Math.max(200, width + 24, shown ? bubbleSize.w + 24 : 0));
    const h = Math.min(window.screen.availHeight, imageHeight + 8 + bubbleH + (shown ? 4 : 32));
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
  function sessionId() {
    return (activity?.running || []).find(row => !row.subagent)?.id || activity?.completed?.id || activity?.running?.[0]?.id || null;
  }
  // Delegated agents finish inside the parent turn; localize that milestone.
  function progressLine(item) {
    const key = item.outcome === 'completed' ? 'subagentFinished' : item.outcome === 'error' ? 'subagentFailed' : 'subagentCancelled';
    return t(key) + (item.title ? ' · ' + item.title : '');
  }
  function render() {
    const done = activity?.completed, running = activity?.running || [];
    const roots = activity?.runningCount || 0, progress = activity?.progress || [];
    sig = JSON.stringify([done?.at, roots, activity?.subagentCount, progress.at(-1)?.at, ...running.map(row => [row.id, row.title, row.preview, row.lines?.at(-1)])]);
    if (suppressed === sig || snoozed || (!done && !running.length)) { bubble.style.display = 'none'; refit(); return; }
    if (done && !roots) {
      head.textContent = (done.label || t('runEnded')) + ' — ' + done.title + (running.length ? ' · ' + t('stillRunning', { n: running.length }) : '');
    } else if (roots || running.length) {
      const liveRow = running.find(entry => !entry.subagent) || running[0];
      head.textContent = t('runningHead', { n: roots || running.length, title: liveRow.title });
    }
    // Milestones only: the host already filters tool chatter out of preview.
    const latest = progress.at(-1), live = roots ? running.find(entry => !entry.subagent) : running[0];
    const liveMilestone = live ? (live.kind === 'think' ? '💭 ' + live.preview : live.preview) : null;
    detail.textContent = liveMilestone || (latest ? progressLine(latest) : null) || done?.preview || '';
    detail.style.display = expanded ? 'none' : 'block';
    log.classList.toggle('is-on', expanded);
    log.textContent = [...(done ? [done] : []), ...running, ...progress.slice(-6).map(item => ({ title: progressLine(item), lines: [], preview: null }))]
      .map(row => row.title + ((row.lines && row.lines.length) ? '\n' + row.lines.join('\n') : '') + (row.preview ? '\n' + row.preview : '')).join('\n\n');
    el('detailsButton').textContent = expanded ? t('collapse') : t('details');
    el('detailsButton').setAttribute('aria-expanded', String(expanded));
    el('dismissButton').textContent = done && !roots ? t('dismissResult') : t('dismiss');
    el('muteButton').textContent = t('muteFor', { n: muteMinutes });
    chatButton.style.display = sessionId() ? '' : 'none';
    bubble.style.display = 'block';
    refit();
  }
  function adoptLocale(language) {
    const wanted = language && language !== 'auto' && STRINGS[language] ? language : autoLocale();
    if (wanted === locale) return;
    locale = wanted;
    applyI18n();
    if (activity) render();
  }
  async function tick() {
    if (stopped) return;
    try {
      const state = await bridge.request('/state');
      // `desktop` is deliberately false until *we* finish bootstrap + heartbeat.
      if (!state.enabled || !state.desktopEnabled) { stopped = true; window.close(); return; }
      adoptLocale(state.language);
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
  el('chatButton').addEventListener('click', () => {
    const id = sessionId();
    if (!id) return;
    // The page half consumes this and focuses the session in the browser window.
    bridge.request('/desktop/navigate', { sessionId: id }).catch(showError);
  });
  el('dismissButton').addEventListener('click', () => {
    // Dismiss is always available: it hides the current bubble; when a run has
    // ended it also clears the result on the host.
    if (activity?.completed && !(activity?.runningCount)) bridge.request('/dismiss', { at: activity.completed.at }).catch(showError);
    suppressed = sig; expanded = false; bubble.style.display = 'none'; refit();
  });
  el('muteButton').addEventListener('click', async () => {
    try {
      await bridge.request('/snooze', { minutes: muteMinutes });
      snoozed = true; suppressed = sig; expanded = false; bubble.style.display = 'none'; refit();
    } catch (error) { showError(error); }
  });
  // Free resize: every edge and corner adjusts the bubble, and the window
  // follows so the pet stays anchored to the bottom of the screen.
  const handles = Array.from(bubble.querySelectorAll('.rz'));
  const beginResize = event => {
    const dir = event.currentTarget.getAttribute('data-dir');
    if (!dir) return;
    const rect = bubble.getBoundingClientRect();
    rz = { dir, x: event.clientX, y: event.clientY, w: Math.round(rect.width), h: Math.round(rect.height) };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setInteractive(true);
  };
  const moveResize = event => {
    if (!rz) return;
    const dx = event.clientX - rz.x, dy = event.clientY - rz.y;
    const vertical = rz.dir.includes('n') || rz.dir.includes('s');
    bubbleSize.w = Math.round(Math.min(560, Math.max(260, rz.dir.includes('e') ? rz.w + dx : rz.dir.includes('w') ? rz.w - dx : rz.w)));
    if (vertical) bubbleSize.h = Math.round(Math.min(720, Math.max(160, rz.dir.includes('s') ? rz.h + dy : rz.h - dy)));
    refit();
  };
  const endResize = event => {
    if (!rz) return;
    rz = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    applyI18n();
  };
  const keyResize = event => {
    const step = { ArrowLeft: [16, 0], ArrowRight: [-16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
    if (!step) return;
    event.preventDefault();
    if (!step[0] && !step[1]) return;
    if (step[0]) bubbleSize.w = Math.min(560, Math.max(260, bubbleSize.w + step[0]));
    if (step[1]) { if (!bubbleSize.h) bubbleSize.h = bubbleHeight(); bubbleSize.h = Math.min(720, Math.max(160, bubbleSize.h + step[1])); }
    refit();
    applyI18n();
  };
  const resetSize = () => { bubbleSize.w = 0; bubbleSize.h = 0; refit(); applyI18n(); };
  for (const handle of handles) {
    handle.addEventListener('pointerdown', beginResize);
    handle.addEventListener('pointermove', moveResize);
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
    handle.addEventListener('dblclick', resetSize);
    handle.addEventListener('keydown', keyResize);
  }
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
    if (dragging || pointer || rz) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    setInteractive(!!target?.closest('#img, #bubble, #menu'));
  });
  document.documentElement.addEventListener('mouseleave', () => { if (!dragging && !rz) setInteractive(false); });
  img.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    scale = Math.min(2.5, Math.max(.5, Math.round((scale + (event.deltaY < 0 ? .1 : -.1)) * 10) / 10));
    if (!bubbleSize.h) bubbleSize.w = Math.max(260, Math.min(560, Math.round(360 * scale)));
    refit(); clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => { try { await bridge.request('/scale', { scale }); } catch (error) { showError(error); } finally { resizeTimer = null; } }, 180);
  }, { passive: false });
  el('menuRestore').addEventListener('click', () => { suppressed = null; snoozed = false; expanded = false; menu.style.display = 'none'; bridge.request('/snooze', { minutes: 0 }).catch(() => {}); render(); });
  menuChat.addEventListener('click', () => {
    menu.style.display = 'none';
    const id = sessionId();
    if (!id) return;
    bridge.request('/desktop/navigate', { sessionId: id }).catch(showError);
  });
  el('menuSite').addEventListener('click', () => { menu.style.display = 'none'; bridge.openSite(); });
  el('menuReset').addEventListener('click', () => { menu.style.display = 'none'; resetSize(); });
  el('menuHide').addEventListener('click', async () => { try { await bridge.request('/desktop/hide', {}); window.close(); } catch (error) { showError(error); } });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('#img, #menu')) menu.style.display = 'none'; });
  window.addEventListener('beforeunload', () => { stopped = true; clearTimeout(timer); clearTimeout(resizeTimer); endDrag(); img.onload = img.onerror = null; });
  tick();
})();
