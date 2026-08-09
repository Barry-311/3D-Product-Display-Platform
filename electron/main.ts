import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fromGateModelUrl, prepareModelFile } from './modelPrepare'
import { appLog } from './logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** Set by vite-plugin-electron during `npm run dev`. */
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'gatemodel',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
])

function getResourcesRoot(): string {
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'public')
  }
  return process.resourcesPath
}

function resolvePreloadPath(): string {
  const mjs = path.join(__dirname, 'preload.mjs')
  const js = path.join(__dirname, 'preload.js')
  if (fs.existsSync(mjs)) {
    return mjs
  }
  return js
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Gate Digital Twin Viewer',
    backgroundColor: '#0f1419',
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      appLog(`renderer[${level}] ${message} (${sourceId}:${line})`)
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  protocol.handle('gatemodel', async (request) => {
    try {
      appLog(`gatemodel request: ${request.url}`)
      const filePath = fromGateModelUrl(request.url)
      if (!fs.existsSync(filePath)) {
        appLog(`gatemodel 404: ${filePath}`)
        return new Response(`Not Found: ${filePath}`, { status: 404 })
      }
      const data = await fs.promises.readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const contentType =
        ext === '.glb' || ext === '.gltf' ? 'model/gltf-binary' : 'application/octet-stream'
      appLog(`gatemodel serve OK: ${filePath} (${data.byteLength} bytes)`)
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(data.byteLength),
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (err) {
      appLog(`gatemodel error: ${err instanceof Error ? err.message : String(err)}`)
      return new Response('Bad Request', { status: 400 })
    }
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getResourcesPath', () => getResourcesRoot())
  ipcMain.handle('fs:pathExists', (_event, targetPath: string) => {
    try {
      return fs.existsSync(targetPath)
    } catch {
      return false
    }
  })
  ipcMain.handle('app:log', (_event, message: string) => {
    appLog(`renderer: ${message}`)
  })

  ipcMain.handle('model:prepare', async (event, relativePath: string) => {
    try {
      appLog(`IPC model:prepare ${relativePath}`)
      const prepared = await prepareModelFile(relativePath, (message, progress) => {
        event.sender.send('model:prepare-progress', { message, progress })
      })
      appLog(`IPC model:prepare done url=${prepared.modelUrl}`)
      return prepared
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      appLog(`IPC model:prepare failed: ${message}`)
      throw new Error(message)
    }
  })

  createWindow()
  appLog('App window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
