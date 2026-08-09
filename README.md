# Gate Digital Twin Viewer

Windows desktop application for browsing industrial gate machine 3D models and product knowledge.

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

**可直接双击（项目根目录）：**

`GateDigitalTwinViewer.exe`

产品 JSON 可直接配置 `.stp` / `.step`，程序会在运行时自动转换为 GLB 并缓存，无需手动转换。

## Scripts

```bash
npm install
npm run package:exe      # 构建并生成根目录 GateDigitalTwinViewer.exe
npm run generate:model   # create placeholder gate.glb
npm run convert:stp      # optional offline STP→GLB tool
npm run dev              # Electron + Vite development
npm run build            # production renderer + electron bundles
npm run build:win        # Windows installer under release/
```

If `electron` fails to download, set a mirror then reinstall:

```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install electron --save-dev
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
