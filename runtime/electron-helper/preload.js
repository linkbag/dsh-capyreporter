// preload bridge: expose only the window-control primitives (no node access in the renderer).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  setInteractive(interactive) {
    ipcRenderer.send('homura:interactive', !!interactive);
  },
  openSite(url) {
    ipcRenderer.send('homura:open-site', url);
  },
  // Dragging is owned by the main process: it tracks the OS cursor position and
  // moves the window itself, so a moving window can never feed back into the
  // coordinates the renderer sees.
  dragStart() {
    ipcRenderer.send('homura:drag-start');
  },
  dragEnd() {
    ipcRenderer.send('homura:drag-end');
  },
  resize(size) {
    ipcRenderer.send('homura:resize', size);
  },
});
