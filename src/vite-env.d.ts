/// <reference types="vite/client" />

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

declare global {
  interface Window {
    gateApi?: GateApi
  }
}

export {}
