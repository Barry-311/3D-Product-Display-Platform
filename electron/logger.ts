import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export function appLog(message: string): void {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`
    const dir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'app.log'), line, 'utf8')
    console.log(`[GateDigitalTwin] ${message}`)
  } catch {
    console.log(`[GateDigitalTwin] ${message}`)
  }
}
