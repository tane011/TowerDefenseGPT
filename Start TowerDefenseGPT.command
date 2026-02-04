#!/bin/bash
set -euo pipefail

# Double-click this file (macOS) to start the game server.
# A Terminal window will open and keep running until you press Ctrl+C.

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found on PATH."
  echo "Install Node.js from https://nodejs.org and try again."
  read -r -p "Press Enter to close..." _
  exit 1
fi

node scripts/start.mjs --open

