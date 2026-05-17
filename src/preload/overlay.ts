import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('overlayBridge', {
  selectRect: (x: number, y: number, w: number, h: number) =>
    ipcRenderer.send('overlay:rect', { x, y, w, h }),
  cancel: () => ipcRenderer.send('overlay:cancel'),
})
