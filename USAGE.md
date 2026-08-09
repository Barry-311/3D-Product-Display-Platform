# Gate Digital Twin Viewer — 使用说明

## 直接运行（无需 npm）

双击项目根目录下的：

`F:\3D_Display_Platform\3D-Product-Display-Platform\GateDigitalTwinViewer.exe`

首次打开 **BC411** 时，程序会自动把 `BC411.stp` 转成 GLB 并缓存，之后再打开会更快。

---

## STEP 自动转换

产品 JSON 可直接写：

```json
"model": "models/BC411.stp"
```

应用会在 Electron 主进程中自动：

1. 检测 `.stp` / `.step`
2. 用 OpenCascade（occt-import-js）三角化
3. 生成 GLB（缓存到用户目录 `stp-cache`）
4. 在 3D 视图中显示

**不需要**再手动执行 `npm run convert:stp`（该命令仅作离线工具保留）。

---

## 开发调试（可选）

```bash
npm install
npm run dev
```

重新生成根目录 exe：

```bash
npm run package:exe
```

会构建 portable 包并复制为根目录 `GateDigitalTwinViewer.exe`。

---

## 操作

| 操作 | 作用 |
|------|------|
| 左键拖动 | 旋转 |
| 滚轮 | 缩放 |
| 右键拖动 | 平移 |
| 单击零件 | 高亮 + 右侧知识 |
| Reset / Fit / Auto Rotate | 工具栏 |
