import { contextBridge, ipcRenderer } from 'electron'

// Expose a type-safe API to the renderer process
contextBridge.exposeInMainWorld('lapcharm', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  // System data
  battery: {
    get: () => ipcRenderer.invoke('battery:get')
  },
  thermal: {
    get: () => ipcRenderer.invoke('thermal:get')
  },
  disk: {
    get: () => ipcRenderer.invoke('disk:get')
  },
  cpuram: {
    get: () => ipcRenderer.invoke('cpuram:get')
  },
  audio: {
    get: () => ipcRenderer.invoke('audio:get')
  },
  network: {
    get: () => ipcRenderer.invoke('network:get')
  },
  display: {
    get: () => ipcRenderer.invoke('display:get')
  },
  health: {
    score: () => ipcRenderer.invoke('health:score')
  },
  history: {
    get: (days?: number) => ipcRenderer.invoke('history:get', days)
  }
})
