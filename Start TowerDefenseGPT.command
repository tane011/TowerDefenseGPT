#!/bin/bash
set -euo pipefail

# Double-click this file (macOS) to start the game server.
# A Terminal window will open and keep running until you press Ctrl+C.

cd "$(dirname "$0")"

# Close other Terminal windows so this is the only running session (best-effort).
if [ "$(uname -s)" = "Darwin" ] && command -v osascript >/dev/null 2>&1; then
  osascript <<'EOF' >/dev/null 2>&1 || true
with timeout of 2 seconds
  tell application "Terminal"
    if (count of windows) is 0 then return
    set frontId to id of front window
    repeat with w in windows
      if id of w is not frontId then
        try
          close w
        end try
      end if
    end repeat
  end tell
end timeout
EOF
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found on PATH."
  echo "Install Node.js from https://nodejs.org and try again."
  read -r -p "Press Enter to close..." _
  exit 1
fi

node scripts/start.mjs --open
