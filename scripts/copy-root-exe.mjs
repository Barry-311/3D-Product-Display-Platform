/**
 * Place a double-clickable GateDigitalTwinViewer.exe at the project root.
 * Prefers electron-builder portable artifact; otherwise builds a tiny launcher
 * that starts release/win-unpacked/Gate Digital Twin Viewer.exe.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'win32') {
  console.error('package:exe is Windows-only. On macOS run: npm run package:mac')
  process.exit(1)
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(root, 'release')
const targetPath = path.join(root, 'GateDigitalTwinViewer.exe')
const unpackedExe = path.join(
  releaseDir,
  'win-unpacked',
  'Gate Digital Twin Viewer.exe',
)

function findPortableExe() {
  if (!fs.existsSync(releaseDir)) {
    return null
  }
  const files = fs.readdirSync(releaseDir)
  const portable = files.find(
    (f) => f.toLowerCase() === 'gatedigitaltwinviewer.exe',
  )
  if (portable) {
    return path.join(releaseDir, portable)
  }
  return null
}

function buildLauncherExe() {
  if (!fs.existsSync(unpackedExe)) {
    throw new Error(
      `Missing unpacked app: ${unpackedExe}\nRun: npx electron-builder --win dir --x64`,
    )
  }

  const csPath = path.join(root, 'scripts', '_Launcher.cs')
  const cs = `
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class GateDigitalTwinLauncher
{
    [STAThread]
    static void Main()
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string target = Path.GetFullPath(Path.Combine(baseDir, "release", "win-unpacked", "Gate Digital Twin Viewer.exe"));
            if (!File.Exists(target))
            {
                MessageBox.Show(
                    "未找到应用：\\n" + target + "\\n\\n请先在本机执行：npm run package:exe",
                    "Gate Digital Twin Viewer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }
            var info = new ProcessStartInfo
            {
                FileName = target,
                WorkingDirectory = Path.GetDirectoryName(target),
                UseShellExecute = true
            };
            Process.Start(info);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Gate Digital Twin Viewer", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
`
  fs.writeFileSync(csPath, cs, 'utf8')

  const cscCandidates = [
    path.join(
      process.env['WINDIR'] || 'C:\\\\Windows',
      'Microsoft.NET',
      'Framework64',
      'v4.0.30319',
      'csc.exe',
    ),
    path.join(
      process.env['WINDIR'] || 'C:\\\\Windows',
      'Microsoft.NET',
      'Framework',
      'v4.0.30319',
      'csc.exe',
    ),
  ]
  const csc = cscCandidates.find((p) => fs.existsSync(p))
  if (!csc) {
    throw new Error('csc.exe not found. Install .NET Framework developer pack.')
  }

  const result = spawnSync(
    csc,
    ['/nologo', '/target:winexe', `/out:${targetPath}`, '/r:System.Windows.Forms.dll', csPath],
    { encoding: 'utf8' },
  )
  fs.unlinkSync(csPath)
  if (result.status !== 0) {
    throw new Error(`Failed to compile launcher:\n${result.stdout}\n${result.stderr}`)
  }
}

const portable = findPortableExe()
if (portable) {
  fs.copyFileSync(portable, targetPath)
  console.log(`Copied portable exe → ${targetPath}`)
} else {
  buildLauncherExe()
  console.log(`Created launcher exe → ${targetPath}`)
  console.log(`Launches: ${unpackedExe}`)
}

if (!fs.existsSync(targetPath)) {
  process.exit(1)
}
console.log(`Ready: ${targetPath}`)
