// preload bridge: expose only the window-control primitives (no node access in the renderer).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  setInteractive(interactive) {
    ipcRenderer.send('homura:interactive', !!interactive);
  },
  openSite(url) {
    ipcRenderer.send('homura:open-site', url);
  },
  move(x, y) {
    ipcRenderer.send('homura:move', { x, y });
  },
  resize(size) {
    ipcRenderer.send('homura:resize', size);
  },
});
