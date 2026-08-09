import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { convertStepFileCached, getStepCachePath, isStepFile } from './stpConverter'
import { appLog } from './logger'

export type PreparedModel = {
  fileName: string
  relativePath: string
  convertedFromStp: boolean
  /** Custom-protocol URL safe for the renderer (no giant IPC payloads). */
  modelUrl: string
  byteLength: number
}

function getAssetRoots(): string[] {
  if (!app.isPackaged) {
    return [
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'dist'),
      process.cwd(),
    ]
  }
  return [
    process.resourcesPath,
    path.join(process.resourcesPath, 'app.asar'),
    path.join(app.getAppPath()),
  ]
}

export function resolveAssetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/')
  for (const root of getAssetRoots()) {
    const candidate = path.join(root, normalized)
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  throw new Error(`Model file not found: ${relativePath}`)
}

/**
 * Build a Chromium-safe custom URL.
 * IMPORTANT: Do NOT put drive letters in the host segment (breaks URL parsing).
 * Use: gatemodel://local/file?path=<encoded absolute path>
 */
export function toGateModelUrl(absolutePath: string): string {
  const resolved = path.resolve(absolutePath)
  return `gatemodel://local/file?path=${encodeURIComponent(resolved)}`
}

export function fromGateModelUrl(requestUrl: string): string {
  const url = new URL(requestUrl)
  const encoded = url.searchParams.get('path')
  if (!encoded) {
    throw new Error(`gatemodel URL missing path query: ${requestUrl}`)
  }
  return path.resolve(encoded)
}

export async function prepareModelFile(
  relativePath: string,
  onProgress?: (message: string, progress: number) => void,
): Promise<PreparedModel> {
  const absolutePath = resolveAssetPath(relativePath)
  const fileName = path.basename(absolutePath)
  appLog(`prepareModel: ${relativePath} -> ${absolutePath}`)

  if (isStepFile(absolutePath)) {
    onProgress?.('Converting STEP to GLB…', 0.1)
    const glbBuffer = await convertStepFileCached(absolutePath, onProgress)
    const cachePath = getStepCachePath(absolutePath)
    if (!fs.existsSync(cachePath)) {
      fs.writeFileSync(cachePath, glbBuffer)
    }
    const modelUrl = toGateModelUrl(cachePath)
    appLog(`STEP ready: ${cachePath} (${glbBuffer.byteLength} bytes) url=${modelUrl}`)
    onProgress?.('Model ready', 1)
    return {
      fileName: fileName.replace(/\.(stp|step)$/i, '.glb'),
      relativePath,
      convertedFromStp: true,
      modelUrl,
      byteLength: glbBuffer.byteLength,
    }
  }

  onProgress?.('Loading model…', 0.5)
  const stat = fs.statSync(absolutePath)
  const modelUrl = toGateModelUrl(absolutePath)
  appLog(`GLB/GLTF ready: ${absolutePath} url=${modelUrl}`)
  onProgress?.('Model ready', 1)
  return {
    fileName,
    relativePath,
    convertedFromStp: false,
    modelUrl,
    byteLength: stat.size,
  }
}
