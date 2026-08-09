import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { app } from 'electron'
import { writeGlbFromMeshes } from './glbWriter'

const require = createRequire(import.meta.url)

type OcctModule = {
  ReadStepFile: (
    content: Uint8Array,
    params: Record<string, unknown> | null,
  ) => {
    success?: boolean
    meshes?: Array<{
      name?: string
      color?: number[]
      attributes?: {
        position?: { array: number[] }
        normal?: { array: number[] }
      }
      index?: { array: number[] }
    }>
  }
}

let occtPromise: Promise<OcctModule> | null = null

function resolveOcctEntry(): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules/occt-import-js/dist/occt-import-js.js'),
    path.join(app.getAppPath(), 'node_modules/occt-import-js/dist/occt-import-js.js'),
    // asar.unpacked fallback
    path.join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/occt-import-js/dist/occt-import-js.js',
    ),
    path.join(process.resourcesPath, 'occt-import-js/occt-import-js.js'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Last resort: node resolution
  return require.resolve('occt-import-js/dist/occt-import-js.js')
}

async function getOcct(): Promise<OcctModule> {
  if (!occtPromise) {
    occtPromise = (async () => {
      const entry = resolveOcctEntry()
      const factory = require(entry) as () => Promise<OcctModule>
      return factory()
    })()
  }
  return occtPromise
}

export function isStepFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.stp' || ext === '.step'
}

export async function convertStepFileToGlb(
  stepFilePath: string,
  onProgress?: (message: string, progress: number) => void,
): Promise<Buffer> {
  onProgress?.('Loading STEP converter…', 0.05)
  const occt = await getOcct()

  onProgress?.('Reading STEP file…', 0.15)
  const fileContent = fs.readFileSync(stepFilePath)

  onProgress?.('Tessellating CAD geometry…', 0.35)
  const result = occt.ReadStepFile(new Uint8Array(fileContent), {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.001,
    angularDeflection: 0.5,
  })

  if (!result?.success || !Array.isArray(result.meshes) || result.meshes.length === 0) {
    throw new Error(`Failed to import STEP file: ${path.basename(stepFilePath)}`)
  }

  const meshes = result.meshes.filter(
    (m) => m?.attributes?.position?.array?.length && m?.index?.array?.length,
  )
  if (meshes.length === 0) {
    throw new Error(`STEP file contains no displayable meshes: ${path.basename(stepFilePath)}`)
  }

  onProgress?.('Building GLB…', 0.75)
  const glb = writeGlbFromMeshes(
    meshes as Parameters<typeof writeGlbFromMeshes>[0],
  )
  onProgress?.('Conversion complete', 1)
  return glb
}

export function getStepCachePath(stepFilePath: string): string {
  const stat = fs.statSync(stepFilePath)
  const base = path.basename(stepFilePath, path.extname(stepFilePath))
  const key = `${base}_${stat.size}_${stat.mtimeMs}.glb`
  const cacheDir = path.join(app.getPath('userData'), 'stp-cache')
  fs.mkdirSync(cacheDir, { recursive: true })
  return path.join(cacheDir, key)
}

export async function convertStepFileCached(
  stepFilePath: string,
  onProgress?: (message: string, progress: number) => void,
): Promise<Buffer> {
  const cachePath = getStepCachePath(stepFilePath)
  if (fs.existsSync(cachePath)) {
    onProgress?.('Using cached GLB…', 1)
    return fs.readFileSync(cachePath)
  }

  const glb = await convertStepFileToGlb(stepFilePath, onProgress)
  fs.writeFileSync(cachePath, glb)
  return glb
}
