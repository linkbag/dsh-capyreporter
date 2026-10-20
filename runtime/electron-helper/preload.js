// Sandboxed, fixed-purpose IPC. The host token never enters the renderer.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petBridge', Object.freeze({
  request: (path, body) => ipcRenderer.invoke('capyreporter:request', path, body),
  setInteractive: value => ipcRenderer.send('capyreporter:interactive', value === true),
  openSite: () => ipcRenderer.send('capyreporter:open-site'),
  dragStart: () => ipcRenderer.send('capyreporter:drag-start'),
  dragEnd: () => ipcRenderer.send('capyreporter:drag-end'),
  resize: size => ipcRenderer.send('capyreporter:resize', size),
}));
