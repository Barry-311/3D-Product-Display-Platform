#!/bin/bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js。请先安装 Node.js 后再双击本文件。"
  echo
  echo "按回车键关闭此窗口。"
  read -r
  exit 1
fi

export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
export ELECTRON_BUILDER_BINARIES_MIRROR="${ELECTRON_BUILDER_BINARIES_MIRROR:-https://npmmirror.com/mirrors/electron-builder-binaries/}"

node scripts/launch-dev.mjs
status=$?
if [ "$status" -ne 0 ]; then
  echo
  echo "按回车键关闭此窗口。"
  read -r
fi
exit "$status"
