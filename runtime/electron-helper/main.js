// dsh-capyreporter desktop helper - Electron main process.
// One transparent, frameless, always-on-top window showing CapyReporter + a speech bubble.
// The renderer fetches data from the DSH host over HTTP (/dsh-capyreporter/*) - no stdin IPC.
//
// Z-order notes (Windows):
//  - `focusable: false` + `alwaysOnTop` is unreliable: Windows demotes the window
//    once another app activates, so the pet would slip behind other windows.
//    We keep the window focusable instead, show it inactive (no focus steal),
//    and re-assert the topmost level on blur and on a short interval.
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('node:path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Hybrid-GPU laptops (NVIDIA + Intel iGPU) can crash the Chromium GPU process
// during transparent-window startup, which fails the page load with ERR_FAILED
// and quits the app. A 220x250 overlay renders perfectly in software mode, so
// opt out of hardware acceleration entirely.
app.disableHardwareAcceleration();

let win = null;
let topmostTimer = null;
const baseUrl = process.env.DSH_CAPYREP_BASE_URL || 'http://127.0.0.1:3080';
const W = 220;
const H = 250;

function reassertTopmost() {
  if (!win || win.isDestroyed()) return;
  try {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (e) {}
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: W,
    height: H,
    x: area.x + area.width - W - 40,
    y: area.y + area.height - H - 40,
    show: false,
    useContentSize: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Click-through by default so transparent pixels don't block apps below;
  // renderer flips interactive when the pointer is over the pet body.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.on('context-menu', (event) => event.preventDefault());
  // Show without stealing the user's focus; re-assert topmost right after.
  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) {
      win.showInactive();
      reassertTopmost();
    }
  });
  // When the user switches to another app, this window blurs; re-assert topmost
  // so Windows does not demote it below the newly activated window.
  win.on('blur', () => reassertTopmost());
  win.on('closed', () => {
    win = null;
    if (topmostTimer) {
      clearInterval(topmostTimer);
      topmostTimer = null;
    }
    app.quit();
  });
  win
    .loadFile('index.html', { query: { baseUrl, w: String(W), h: String(H) } })
    .catch((error) => {
      console.error('[dsh-capyreporter-helper] page load failed:', error);
      win.destroy();
    });
}

app.whenReady().then(() => {
  createWindow();
  // Belt-and-suspenders: re-assert the topmost level periodically, so even
  // Alt-Tab / fullscreen-app transitions restore the pet to the front.
  topmostTimer = setInterval(reassertTopmost, 2000);

  ipcMain.on('homura:interactive', (event, interactive) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (w && !w.isDestroyed()) w.setIgnoreMouseEvents(!interactive, { forward: true });
  });

  ipcMain.on('homura:open-site', (event, url) => {
    if (typeof url === 'string' && /^https?:[/][/]/.test(url)) {
      shell.openExternal(url).catch(() => {});
    }
  });

  ipcMain.on('homura:resize', (event, size) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (!w || w.isDestroyed()) return;
    const cw = Math.round(Number(size && size.w) || 0);
    const ch = Math.round(Number(size && size.h) || 0);
    if (cw < 80 || ch < 80 || cw > 4000 || ch > 4000) return;
    const b = w.getBounds();
    const area = screen.getPrimaryDisplay().workArea;
    const width = Math.min(cw, area.width);
    const height = Math.min(ch, area.height);
    // keep the bottom edge (the pet's feet) put; grow upward and outward
    let x = Math.round(b.x + (b.width - width) / 2);
    let y = Math.round(b.y + (b.height - height));
    x = Math.min(Math.max(area.x, x), area.x + area.width - width);
    y = Math.min(Math.max(area.y, y), area.y + area.height - height);
    w.setBounds({ x: x, y: y, width: width, height: height });
    reassertTopmost();
  });

  ipcMain.on('homura:move', (event, p) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (!w || w.isDestroyed()) return;
    const x = Number(p && p.x);
    const y = Number(p && p.y);
    if (Number.isFinite(x) && Number.isFinite(y)) w.setPosition(Math.round(x), Math.round(y), false);
  });
});

app.on('window-all-closed', () => {
  if (topmostTimer) {
    clearInterval(topmostTimer);
    topmostTimer = null;
  }
  app.quit();
});
