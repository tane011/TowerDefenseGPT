# TowerDefenseGPT
An original tower defense game made entirely with Codex and ChatGPT.

A data-driven, modular tower defense game written in plain HTML + Canvas + ES modules.

## Run locally

From the repo root (easiest):

```bash
npm start
```

Or, to also open the browser automatically:

```bash
npm run start:open
```

If the default port is busy, the server automatically tries the next ports and prints the final URL.

## “Double-click to start”

- macOS: double-click `Start TowerDefenseGPT.command` (Terminal opens; Ctrl+C stops).
- Windows: double-click `Start TowerDefenseGPT.bat` (Command Prompt opens; Ctrl+C stops).

Alternative (no Node scripts):

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5173
```

## Controls

- Click a tower in the Build panel, then click a build tile to place it.
- Click an existing tower to view upgrades and sell.
- Right-click cancels build mode / clears selection.
- Space starts the next wave (or use the Waves panel).
- P pauses.
- F toggles fullscreen.

## Add content (data-driven)

- Towers: `src/data/towers.js`
- Enemies: `src/data/enemies.js`
- Maps (including multi-path): `src/data/maps.js`
- Wave generation: `src/data/waveGenerator.js`

## Automated smoke test (Playwright)

This repo is set up to work with the Codex `$develop-web-game` Playwright loop.

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export WEB_GAME_CLIENT="$CODEX_HOME/skills/develop-web-game/scripts/web_game_playwright_client.js"
export WEB_GAME_ACTIONS="$CODEX_HOME/skills/develop-web-game/references/action_payloads.json"

node "$WEB_GAME_CLIENT" --url http://127.0.0.1:5173 --click-selector "#start-btn" --iterations 3 --pause-ms 250
```
