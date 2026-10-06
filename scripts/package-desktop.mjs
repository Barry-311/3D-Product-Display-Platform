/**
 * Package a double-clickable app for the current operating system.
 * Windows → GateDigitalTwinViewer.exe
 * macOS   → Gate Digital Twin Viewer.app
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const script =
  process.platform === 'win32'
    ? 'package:exe'
    : process.platform === 'darwin'
      ? 'package:mac'
      : null

if (!script) {
  console.error(
    `Unsupported platform: ${process.platform}. Use "npm start" to run in development.`,
  )
  process.exit(1)
}

const result = spawnSync('npm', ['run', script], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)
