// The renderer has no network or Node authority. Only this process holds the
// activation-scoped host capability, and all IPC is tied to our local frame.
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('node:path');
const { origin, trustedSender, requestSpec } = require('./policy.cjs');
const PAGE = path.join(__dirname, 'index.html');
const base = origin(process.env.DSH_CAPYREP_BASE_URL || 'http://127.0.0.1:3080');
const token = process.env.DSH_CAPYREP_TOKEN;
delete process.env.DSH_CAPYREP_TOKEN;
if (!token) throw new Error('Launch CapyReporter through its DSH host plugin');
app.disableHardwareAcceleration();
let win = null, dragTimer = null, dragState = null, topmostTimer = null;
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
on('open-site', () => { shell.openExternal(base).catch(error => console.error('[capyreporter] Open site failed:', error.message)); });
on('resize', size => {
  const w = size?.w, h = size?.h;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 80 || h < 80 || w > 1600 || h > 1600) return;
  const bounds = win.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const width = Math.min(w, area.width), height = Math.min(h, area.height);
  if (bounds.width === width && bounds.height === height) return;
  const x = Math.min(Math.max(area.x, Math.round(bounds.x + (bounds.width - width) / 2)), area.x + area.width - width);
  const y = Math.min(Math.max(area.y, bounds.y + bounds.height - height), area.y + area.height - height);
  win.setBounds({ x, y, width, height }); topmost();
});
// A monitor can disappear or change DPI while the pet is anchored to it. Re-anchor
// instead of leaving the window off-screen while the host still reports desktop
// mode ready (which suppresses the in-page pet).
function reclamp() {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds(), area = screen.getDisplayMatching(bounds).workArea;
  const width = Math.min(bounds.width, area.width), height = Math.min(bounds.height, area.height);
  const x = Math.min(Math.max(area.x, bounds.x), area.x + Math.max(0, area.width - width));
  const y = Math.min(Math.max(area.y, bounds.y), area.y + Math.max(0, area.height - height));
  if (x !== bounds.x || y !== bounds.y || width !== bounds.width || height !== bounds.height) {
    win.setBounds({ x, y, width, height }); topmost();
  }
}
on('drag-start', () => {
  stopDrag();
  const point = screen.getCursorScreenPoint(), bounds = win.getBounds();
  dragState = { point, bounds };
  dragTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !dragState) return stopDrag();
    const p = screen.getCursorScreenPoint(), area = screen.getDisplayNearestPoint(p).workArea, b = win.getBounds();
    const x = Math.min(Math.max(area.x, dragState.bounds.x + p.x - dragState.point.x), area.x + Math.max(0, area.width - b.width));
    const y = Math.min(Math.max(area.y, dragState.bounds.y + p.y - dragState.point.y), area.y + Math.max(0, area.height - b.height));
    if (b.x !== x || b.y !== y) win.setPosition(x, y, false);
  }, 16);
});
on('drag-end', stopDrag);
app.whenReady().then(() => {
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({ width: 380, height: 350, x: area.x + area.width - 400, y: area.y + area.height - 370,
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
