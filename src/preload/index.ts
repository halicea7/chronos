import { contextBridge, ipcRenderer } from 'electron'

export type Settings = {
  hotkey: string
  ollamaHost: string
  ollamaHostExternal: string
  ollamaMode: 'local' | 'external'
  windowWidth: number
  windowHeight: number
  persistHistory: boolean
  systemPrompt: string
  appearance: 'system' | 'light' | 'dark'
  variant: 'tactical' | 'carbon' | 'sentinel' | 'vault'
  windowX: number | null
  windowY: number | null
  seraphHost: string   // e.g. "http://192.168.1.10:8000" — empty = disabled
  seraphToken: string  // "srph_..." API token
}

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]): Promise<boolean> =>
    ipcRenderer.invoke('settings:set', key, value),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('window:hide'),
  captureScreen: (): Promise<string | null> => ipcRenderer.invoke('screenshot:capture'),
  captureRegion: (): Promise<string | null> => ipcRenderer.invoke('screenshot:capture-region'),
  platform: process.platform as NodeJS.Platform,
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
