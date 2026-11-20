#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '請先安裝 Node.js 24 LTS：https://nodejs.org/'
  exit 1
fi
node scripts/start-local.mjs
