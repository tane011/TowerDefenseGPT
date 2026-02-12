#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="TowerDefenseGPT"
DIST_DIR="${ROOT_DIR}/dist"
APP_DIR="${DIST_DIR}/${APP_NAME}.app"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
GAME_DIR="${RESOURCES_DIR}/game"

rm -rf "${APP_DIR}"
mkdir -p "${MACOS_DIR}" "${GAME_DIR}"

cp "${ROOT_DIR}/index.html" "${GAME_DIR}/"
cp "${ROOT_DIR}/style.css" "${GAME_DIR}/"
cp "${ROOT_DIR}/favicon.ico" "${GAME_DIR}/"
cp -R "${ROOT_DIR}/src" "${GAME_DIR}/"

cat > "${MACOS_DIR}/${APP_NAME}" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="${APP_DIR}/Resources/game"
PYTHON_BIN="$(command -v python3 || true)"

if [ -z "${PYTHON_BIN}" ]; then
  /usr/bin/osascript -e 'display alert "Python 3 is required to run TowerDefenseGPT."'
  exit 1
fi

PORT=5173
for _ in $(seq 0 20); do
  if ! /usr/sbin/lsof -iTCP -sTCP:LISTEN -n -P | /usr/bin/grep -q ":${PORT} "; then
    break
  fi
  PORT=$((PORT + 1))
done

cd "${GAME_DIR}"
"${PYTHON_BIN}" - <<'PY' "${PORT}" &
import http.server
import socketserver
import sys

port = int(sys.argv[1])
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
    httpd.serve_forever()
PY

SERVER_PID=$!
/usr/bin/open "http://127.0.0.1:${PORT}/"
wait "${SERVER_PID}"
SH

chmod +x "${MACOS_DIR}/${APP_NAME}"

cat > "${CONTENTS_DIR}/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>TowerDefenseGPT</string>
    <key>CFBundleIdentifier</key>
    <string>com.towerdefensegpt.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>TowerDefenseGPT</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
  </dict>
</plist>
PLIST

echo "Built ${APP_DIR}"
