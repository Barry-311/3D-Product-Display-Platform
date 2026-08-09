import { contextBridge, ipcRenderer } from 'electron'

export type PrepareProgress = {
  message: string
  progress: number
}

export type PreparedModelPayload = {
  fileName: string
  relativePath: string
  convertedFromStp: boolean
  modelUrl: string
  byteLength: number
}

export type GateApi = {
  getAppVersion: () => Promise<string>
  getResourcesPath: () => Promise<string>
  pathExists: (targetPath: string) => Promise<boolean>
  prepareModel: (relativePath: string) => Promise<PreparedModelPayload>
  onPrepareProgress: (callback: (progress: PrepareProgress) => void) => () => void
  log: (message: string) => Promise<void>
}

const gateApi: GateApi = {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getResourcesPath: () => ipcRenderer.invoke('app:getResourcesPath'),
  pathExists: (targetPath: string) => ipcRenderer.invoke('fs:pathExists', targetPath),
  prepareModel: (relativePath: string) => ipcRenderer.invoke('model:prepare', relativePath),
  log: (message: string) => ipcRenderer.invoke('app:log', message),
  onPrepareProgress: (callback) => {
    const listener = (_event: unknown, payload: PrepareProgress) => {
      callback(payload)
    }
    ipcRenderer.on('model:prepare-progress', listener)
    return () => {
      ipcRenderer.removeListener('model:prepare-progress', listener)
    }
  },
}

contextBridge.exposeInMainWorld('gateApi', gateApi)
