/**
 * Start the dev app on Windows or macOS.
 * If this project already holds the Vite port, stop that old session first.
 */
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = 5173

process.env.ELECTRON_MIRROR ??= 'https://npmmirror.com/mirrors/electron/'
process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  'https://npmmirror.com/mirrors/electron-builder-binaries/'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function commandOf(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
        ],
        { encoding: 'utf8' },
      ).trim()
    }
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

function listeningPids() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' })
      const pids = new Set()
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes('LISTENING') || !line.includes(`:${port}`)) {
          continue
        }
        const pid = line.trim().split(/\s+/).at(-1)
        if (pid && /^\d+$/.test(pid)) {
          pids.add(pid)
        }
      }
      return [...pids]
    }
    const out = execFileSync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8' },
    )
    return [...new Set(out.split(/\s+/).filter((pid) => /^\d+$/.test(pid)))]
  } catch {
    return []
  }
}

function isOurProcess(pid) {
  const command = commandOf(pid).replaceAll('\\', '/')
  return command.includes(root.replaceAll('\\', '/'))
}

function projectElectronPids() {
  try {
    if (process.platform === 'win32') {
      const needle = root.replaceAll("'", "''")
      const out = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'electron*' -and $_.CommandLine -like '*${needle}*' } | Select-Object -ExpandProperty ProcessId`,
        ],
        { encoding: 'utf8' },
      )
      return out.split(/\s+/).filter((pid) => /^\d+$/.test(pid))
    }
    const out = execFileSync(
      'pgrep',
      ['-f', path.join(root, 'node_modules', 'electron', 'dist')],
      { encoding: 'utf8' },
    )
    return out.split(/\s+/).filter((pid) => /^\d+$/.test(pid))
  } catch {
    return []
  }
}

function killPid(pid, force) {
  const numeric = Number(pid)
  if (!Number.isInteger(numeric) || numeric <= 1 || numeric === process.pid) {
    return
  }
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(numeric), '/T', '/F'], { stdio: 'ignore' })
      return
    }
    process.kill(numeric, force ? 'SIGKILL' : 'SIGTERM')
  } catch {
    // Process already exited.
  }
}

async function freeOurDevServer() {
  const holders = listeningPids()
  const foreign = holders.filter((pid) => !isOurProcess(pid))
  if (foreign.length > 0) {
    console.error(`端口 ${port} 已被其他程序占用，无法启动。`)
    for (const pid of foreign) {
      console.error(`  PID ${pid}: ${commandOf(pid) || '(unknown)'}`)
    }
    process.exit(1)
  }

  const ours = [
    ...new Set([...holders.filter(isOurProcess), ...projectElectronPids()]),
  ]
  if (ours.length === 0) {
    return
  }

  console.log('检测到本项目已有开发服务，正在关闭后重新启动…')
  for (const pid of ours) {
    killPid(pid, false)
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (listeningPids().length === 0) {
      return
    }
    await sleep(200)
  }

  for (const pid of listeningPids().filter(isOurProcess)) {
    killPid(pid, true)
  }
  await sleep(300)

  if (listeningPids().length > 0) {
    console.error(`端口 ${port} 仍被占用，无法启动。`)
    process.exit(1)
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', (error) => {
      console.error(error.message)
      resolve(1)
    })
  })
}

if (!fs.existsSync(path.join(root, 'node_modules', 'electron'))) {
  const installCode = await run('npm', ['install'])
  if (installCode !== 0) {
    process.exit(installCode)
  }
}

await freeOurDevServer()
process.exit(await run('npm', ['start']))
