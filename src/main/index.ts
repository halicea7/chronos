import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  nativeImage,
  desktopCapturer,
  screen,
  nativeTheme,
  net,
} from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

interface Settings {
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
}

const SETTINGS_DEFAULTS: Settings = {
  hotkey: 'Alt+Space',
  ollamaHost: 'http://localhost:11434',
  ollamaHostExternal: '',
  ollamaMode: 'local',
  windowWidth: 420,
  windowHeight: 580,
  persistHistory: false,
  systemPrompt: '',
  appearance: 'system',
  variant: 'tactical',
  windowX: null,
  windowY: null,
  seraphHost: '',
  seraphToken: '',
}

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

function isValidAccelerator(s: string): boolean {
  // Must be ASCII-only and contain no raw space characters
  return typeof s === 'string' && s.length > 0 && !/[^\x00-\x7E]/.test(s) && !/ /.test(s)
}

function loadSettings(): Settings {
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    // Reset any corrupted hotkey back to the default
    if (!isValidAccelerator(parsed.hotkey)) {
      parsed.hotkey = SETTINGS_DEFAULTS.hotkey
    }
    return { ...SETTINGS_DEFAULTS, ...parsed }
  } catch {
    return { ...SETTINGS_DEFAULTS }
  }
}

function saveSettings(s: Settings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf-8')
}

let settings = loadSettings()

// Transparent padding around .chr so backdrop-filter doesn't bleed at window edges.
const INSET = 12

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: settings.windowWidth + INSET * 2,
    height: settings.windowHeight + INSET * 2,
    x: settings.windowX ?? undefined,
    y: settings.windowY ?? undefined,
    frame: false,
    transparent: true,
    hasShadow: false,
    roundedCorners: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Keep window visible across all macOS spaces / virtual desktops.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Windows 11 acrylic — CSS backdrop-filter handles blur on macOS/Linux.
  if (process.platform === 'win32') {
    win.setBackgroundMaterial('acrylic')
  }

  // Hide rather than close when the user dismisses the window.
  // Step aside when the app is actually quitting so the lifecycle completes.
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  win.webContents.on('render-process-gone', (_, details) => {
    console.error('[Chronos] Renderer crashed:', details.reason)
    if (!win.isDestroyed()) win.webContents.reload()
  })

  win.webContents.on('unresponsive', () => {
    console.warn('[Chronos] Renderer unresponsive — reloading')
    if (!win.isDestroyed()) win.webContents.reload()
  })

  win.on('moved', () => {
    const [x, y] = win.getPosition()
    settings.windowX = x
    settings.windowY = y
    saveSettings(settings)
  })

  win.on('resized', () => {
    const [w, h] = win.getSize()
    settings.windowWidth = w - INSET * 2
    settings.windowHeight = h - INSET * 2
    saveSettings(settings)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function buildTrayIcon(): Electron.NativeImage {
  const candidates = [
    join(process.resourcesPath ?? '', 'resources', 'tray-icon.png'),
    join(app.getAppPath(), 'resources', 'tray-icon.png'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (process.platform === 'darwin') img.setTemplateImage(true)
      return img
    }
  }
  // Fallback: minimal 1×1 transparent PNG
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  )
}

function createTray(): Tray {
  const t = new Tray(buildTrayIcon())
  t.setToolTip('Chronos')
  t.on('click', toggleWindow)
  t.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show / Hide', click: toggleWindow },
      { type: 'separator' },
      { label: 'Quit Chronos', click: () => app.quit() },
    ])
  )
  return t
}

// ---------------------------------------------------------------------------
// Hotkey
// ---------------------------------------------------------------------------

function registerHotkey(combo: string): void {
  if (!isValidAccelerator(combo)) {
    console.warn(`[Hotkey] Invalid accelerator, skipping: "${combo}"`)
    return
  }
  try {
    globalShortcut.unregisterAll()
    const ok = globalShortcut.register(combo, toggleWindow)
    if (!ok) console.warn(`[Hotkey] Could not register "${combo}" — already in use?`)
  } catch (err) {
    console.warn(`[Hotkey] Registration failed for "${combo}":`, err)
  }
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

function applyAppearance(appearance: Settings['appearance']): void {
  nativeTheme.themeSource = appearance
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function setupIPC(): void {
  ipcMain.handle('settings:get', () => settings)

  ipcMain.handle('settings:set', (_, key: keyof Settings, value: unknown) => {
    try {
      ;(settings as Record<string, unknown>)[key] = value
      saveSettings(settings)
      if (key === 'hotkey') registerHotkey(value as string)
      if (key === 'appearance') applyAppearance(value as Settings['appearance'])
      if (key === 'windowWidth' && mainWindow) {
        const [, h] = mainWindow.getSize()
        mainWindow.setSize((value as number) + INSET * 2, h, true)
      }
    } catch (err) {
      console.error(`[settings:set] Error applying "${key}":`, err)
    }
    return true
  })

  ipcMain.handle('window:hide', () => mainWindow?.hide())

  ipcMain.handle('seraph:fetch', async (_, { host, token, path }: { host: string; token: string; path: string }) => {
    const url = `${host}/api/v1${path}`
    const res = await net.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Seraph API ${res.status}: ${path}`)
    return res.json()
  })

  ipcMain.handle('screenshot:capture', async () => {
    if (!mainWindow) return null
    mainWindow.hide()
    // Brief delay so the window is gone before we capture.
    await new Promise((r) => setTimeout(r, 150))

    const primary = screen.getPrimaryDisplay()
    const { width, height } = primary.size

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    })

    mainWindow.show()
    mainWindow.focus()

    const src =
      sources.find((s) => s.display_id === String(primary.id)) ?? sources[0]
    return src?.thumbnail.toDataURL() ?? null
  })

  ipcMain.handle('screenshot:capture-region', async () => {
    if (!mainWindow) return null
    mainWindow.hide()
    await new Promise((r) => setTimeout(r, 150))

    const primary = screen.getPrimaryDisplay()
    const { width, height } = primary.size
    const scaleFactor = primary.scaleFactor

    return new Promise<string | null>((resolve) => {
      const overlayHtml =
        existsSync(join(process.resourcesPath ?? '', 'resources', 'overlay.html'))
          ? join(process.resourcesPath ?? '', 'resources', 'overlay.html')
          : join(app.getAppPath(), 'resources', 'overlay.html')

      const overlayWin = new BrowserWindow({
        width,
        height,
        x: primary.bounds.x,
        y: primary.bounds.y,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        webPreferences: {
          preload: join(__dirname, '../preload/overlay.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
        },
      })

      if (process.platform === 'darwin') {
        overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      }

      overlayWin.loadFile(overlayHtml)
      overlayWin.setIgnoreMouseEvents(false)

      function cleanup() {
        if (!overlayWin.isDestroyed()) overlayWin.destroy()
        mainWindow?.show()
        mainWindow?.focus()
        ipcMain.removeAllListeners('overlay:rect')
        ipcMain.removeAllListeners('overlay:cancel')
      }

      ipcMain.once('overlay:rect', async (_, rect: { x: number; y: number; w: number; h: number }) => {
        const { x, y, w, h } = rect
        cleanup()

        if (w < 4 || h < 4) { resolve(null); return }

        try {
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.round(width * scaleFactor), height: Math.round(height * scaleFactor) },
          })
          const src = sources.find((s) => s.display_id === String(primary.id)) ?? sources[0]
          if (!src) { resolve(null); return }

          const cropped = src.thumbnail.crop({
            x: Math.round(x * scaleFactor),
            y: Math.round(y * scaleFactor),
            width: Math.round(w * scaleFactor),
            height: Math.round(h * scaleFactor),
          })
          resolve(cropped.toDataURL())
        } catch {
          resolve(null)
        }
      })

      ipcMain.once('overlay:cancel', () => {
        cleanup()
        resolve(null)
      })
    })
  })
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  mainWindow = createWindow()
  tray = createTray()
  registerHotkey(settings.hotkey)
  applyAppearance(settings.appearance)
  setupIPC()
  // Show on first launch so the user knows the app started.
  mainWindow.once('ready-to-show', () => mainWindow?.show())
})

app.on('before-quit', () => { isQuitting = true })

// Subscribing prevents Electron's default auto-quit on window-all-closed.
// When actually quitting, isQuitting is true so we let the lifecycle continue.
app.on('window-all-closed', () => {
  if (isQuitting) app.exit(0)
})

app.on('will-quit', () => globalShortcut.unregisterAll())
