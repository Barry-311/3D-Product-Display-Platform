# Gate Digital Twin Viewer

Desktop application for Windows and macOS. Browse industrial gate machine 3D models and product knowledge.

**Stack:** Electron · React · TypeScript · Tailwind CSS · Three.js

## Features

- Product catalog from JSON (`SG800`, `SG1200`)
- GLB/glTF model loading driven by product configuration
- Orbit controls (rotate / zoom / pan)
- Reset View · Auto Rotate · Fit Model
- Clickable components with knowledge panel
- UpdateManager interfaces prepared for future cloud sync
- `knowledge/` folder prepared for future AI assistant content

## Quick start

中文使用说明见 [USAGE.md](USAGE.md)。

**开发运行（Windows 和 macOS 相同）：**

```bash
npm install
npm start
```

也可以双击项目根目录的 `start.bat`（Windows）或 `start.command`（macOS）。

**打包后双击：**

- Windows：`npm run package:exe` → `GateDigitalTwinViewer.exe`
- macOS：`npm run package:mac` → `Gate Digital Twin Viewer.app`
- 当前系统：`npm run package`

产品 JSON 可直接配置 `.stp` / `.step`，程序会在运行时自动转换为 GLB 并缓存，无需手动转换。

## Scripts

```bash
npm install
npm start                # Electron + Vite（Windows / macOS）
npm run package          # 按当前系统打包可双击的应用
npm run package:exe      # Windows：根目录 GateDigitalTwinViewer.exe
npm run package:mac      # macOS：根目录 Gate Digital Twin Viewer.app
npm run generate:model   # create placeholder gate.glb
npm run convert:stp      # optional offline STP→GLB tool
npm run build            # production renderer + electron bundles
npm run build:win        # Windows installer under release/
npm run build:mac        # macOS dmg/zip under release/
```

`start.command` and `start.bat` set the Electron download mirror automatically. If you run `npm install` yourself and the download fails, set the mirror and reinstall:

```bash
# macOS / Linux
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# Windows Command Prompt
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# Windows PowerShell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

npm install
```

Windows packaging uses `signAndEditExecutable: false` to avoid winCodeSign symlink permission errors on machines without Developer Mode. Enable Windows Developer Mode if you need executable signing/metadata editing.

## Controls

| Input | Action |
|-------|--------|
| Left mouse | Rotate |
| Mouse wheel | Zoom |
| Right mouse | Pan |
| Click mesh | Select component |

## Data

- Catalog: `public/data/products.json`
- Product knowledge: `public/data/products/*.json`
- Versions: `public/data/version.json`
- Models: `public/models/*.glb`
