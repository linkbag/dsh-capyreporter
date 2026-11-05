// The renderer has no network or Node authority. Only this process holds the
// activation-scoped host capability, and all IPC is tied to our local frame.
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('node:path');
const { origin, trustedSender, requestSpec } = require('./policy.cjs');
const { clampBounds, resizeBounds, dragBounds } = require('./geometry.cjs');
const PAGE = path.join(__dirname, 'index.html');
const base = origin(process.env.DSH_CAPYREP_BASE_URL || 'http://127.0.0.1:3080');
const token = process.env.DSH_CAPYREP_TOKEN;
delete process.env.DSH_CAPYREP_TOKEN;
if (!token) throw new Error('Launch CapyReporter through its DSH host plugin');
app.disableHardwareAcceleration();
let win = null, dragTimer = null, dragState = null, topmostTimer = null;
// Keep our intended DIP rectangle, not Windows' outward-rounded getBounds().
// At 125/150/175% DPI, feeding that reading to setPosition() enlarges the window
// on every drag tick and makes the right/bottom limits progressively retreat.
let bounds = null, requestedSize = { w: 380, h: 350 };
function moveTo(next) {
  if (!win || win.isDestroyed()) return false;
  if (bounds && ['x', 'y', 'width', 'height'].every(key => bounds[key] === next[key])) return false;
  bounds = next;
  win.setBounds(next, false);
  return true;
}
const requests = new Set();
function stopDrag() { clearInterval(dragTimer); dragTimer = null; dragState = null; }
function topmost() {
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(true, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}
function cleanup() {
  stopDrag();
  clearInterval(topmostTimer);
  for (const name of ['display-added', 'display-removed', 'display-metrics-changed']) screen.removeListener(name, reclamp);
  for (const controller of requests) controller.abort();
  requests.clear();
}
function trusted(event) { return trustedSender(event, win, PAGE); }
async function request(route, body) {
  const method = requestSpec(route, body);
  const controller = new AbortController();
  requests.add(controller);
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(base + '/dsh-capyreporter' + route, { method, redirect: 'error', signal: controller.signal,
      headers: { authorization: 'Bearer ' + token, ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error('Reporter HTTP ' + response.status);
    if (route === '/image') return 'data:image/png;base64,' + Buffer.from(await response.arrayBuffer()).toString('base64');
    return await response.json();
  } finally { clearTimeout(timer); requests.delete(controller); }
}
ipcMain.handle('capyreporter:request', async (event, route, body) => {
  if (!trusted(event)) throw new Error('Untrusted renderer');
  const result = await request(route, body);
  // This is sent only after state, activity and a decoded image are ready.
  if (route === '/desktop/heartbeat' && win && !win.isDestroyed()) { if (!win.isVisible()) win.showInactive(); topmost(); }
  return result;
});
const on = (channel, handler) => ipcMain.on('capyreporter:' + channel, (event, value) => { if (trusted(event)) handler(value); });
on('interactive', value => { if (typeof value === 'boolean') win.setIgnoreMouseEvents(!value, { forward: true }); });
// The pet menu dismisses itself when the window loses focus (a click anywhere
// outside it), so focusing the companion while the menu is open is required.
on('focus', () => { if (win && !win.isDestroyed()) win.focus(); });
on('open-site', () => { shell.openExternal(base).catch(error => console.error('[capyreporter] Open site failed:', error.message)); });
on('resize', size => {
  const w = size?.w, h = size?.h;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 80 || h < 80 || w > 16_384 || h > 16_384) return;
  requestedSize = { w, h };
  const area = screen.getDisplayMatching(bounds).workArea;
  if (moveTo(resizeBounds(bounds, requestedSize, area))) topmost();
});
// A monitor can disappear or change DPI while the pet is anchored to it. Re-anchor
// instead of leaving the window off-screen while the host still reports desktop
// mode ready (which suppresses the in-page pet).
function reclamp() {
  if (!win || win.isDestroyed()) return;
  stopDrag();
  const area = screen.getDisplayMatching(bounds).workArea;
  if (moveTo(resizeBounds(bounds, requestedSize, area))) topmost();
}
on('drag-start', () => {
  stopDrag();
  dragState = { point: screen.getCursorScreenPoint(), bounds: { ...bounds } };
  dragTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !dragState) return stopDrag();
    const point = screen.getCursorScreenPoint(), area = screen.getDisplayNearestPoint(point).workArea;
    moveTo(dragBounds(dragState, point, requestedSize, area));
  }, 16);
});
on('drag-end', stopDrag);
app.whenReady().then(() => {
  const area = screen.getPrimaryDisplay().workArea;
  bounds = clampBounds({ width: requestedSize.w, height: requestedSize.h, x: area.x + area.width - 400, y: area.y + area.height - 370 }, area);
  win = new BrowserWindow({ ...bounds,
    show: false, useContentSize: true, transparent: true, frame: false, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, hasShadow: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  topmost();
  win.setIgnoreMouseEvents(true, { forward: true });
  for (const name of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(name, reclamp);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.on('context-menu', event => event.preventDefault());
  win.webContents.on('render-process-gone', () => app.quit());
  win.on('unresponsive', () => app.quit());
  win.on('blur', () => { stopDrag(); topmost(); });
  win.on('closed', () => { win = null; cleanup(); app.quit(); });
  win.loadFile(PAGE).catch(error => { console.error('[capyreporter] Page load failed:', error.message); app.quit(); });
  topmostTimer = setInterval(topmost, 5000);
});
if (process.connected) process.on('disconnect', () => app.quit());
app.on('before-quit', cleanup);
app.on('window-all-closed', () => { cleanup(); app.quit(); });
