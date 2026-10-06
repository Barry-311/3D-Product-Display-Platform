@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo 未找到 Node.js。请先安装 Node.js 后再双击本文件。
  echo.
  echo 按任意键关闭此窗口。
  pause >nul
  exit /b 1
)
if not defined ELECTRON_MIRROR set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
if not defined ELECTRON_BUILDER_BINARIES_MIRROR set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
node scripts/launch-dev.mjs
if errorlevel 1 (
  echo.
  echo 按任意键关闭此窗口。
  pause >nul
  exit /b 1
)
