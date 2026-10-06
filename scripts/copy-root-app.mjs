/**
 * Copy the unpacked macOS app to the project root so it can be double-clicked.
 * electron-builder writes it under release/mac or release/mac-arm64.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(root, 'release')
const appName = 'Gate Digital Twin Viewer.app'
const targetPath = path.join(root, appName)

function findAppBundle(dir) {
  if (!fs.existsSync(dir)) {
    return null
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.name === appName) {
      return full
    }
    if (entry.name.startsWith('mac')) {
      const nested = findAppBundle(full)
      if (nested) {
        return nested
      }
    }
  }
  return null
}

const preferredDir =
  process.arch === 'arm64'
    ? path.join(releaseDir, 'mac-arm64', appName)
    : path.join(releaseDir, 'mac', appName)

const source = fs.existsSync(preferredDir) ? preferredDir : findAppBundle(releaseDir)
if (!source) {
  throw new Error(
    `Missing macOS app under ${releaseDir}. Run: npx electron-builder --mac dir`,
  )
}

fs.rmSync(targetPath, { recursive: true, force: true })
fs.cpSync(source, targetPath, { recursive: true })

if (process.platform === 'darwin') {
  spawnSync('xattr', ['-cr', targetPath], { stdio: 'inherit' })
}

console.log(`Copied macOS app → ${targetPath}`)
console.log(`Ready: ${targetPath}`)
