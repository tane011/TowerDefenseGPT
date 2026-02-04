Original prompt: Create a **tower defense game** with depth and replayability, not a simple prototype.

Requirements:
* Path-based enemies that spawn in waves and move toward a base.
* Multiple tower types with distinct roles (single-target, splash, slowing, debuff, support).
* Towers have meaningful upgrade paths, including branching choices.
* Enemies have varied traits (speed, armor, resistances, special abilities).
* Currency earned from defeating enemies and completing waves.
* A wave system with scaling difficulty and occasional elite or boss enemies.
* A lives or base-health system that ends the game when depleted.

Advanced systems:
* Status effects (slow, burn, poison, stun, armor reduction).
* Tower synergies and buff interactions.
* Basic UI displaying money, lives, wave number, and tower stats.
* Map layout support for multiple levels or paths.

Technical expectations:
* Clean, modular, well-commented code.
* Separate systems for towers, enemies, waves, and game state.
* Data-driven design so new towers, enemies, and maps can be added easily.

Build the core architecture first, then implement a minimal playable version showing tower placement, upgrades, waves, and enemy behavior working together.

---

Notes (2026-02-03):
- Repo started empty; building a lightweight static HTML/ESM project (no bundler required).
- Using the `$develop-web-game` Playwright loop; game exposes `window.render_game_to_text` and deterministic `window.advanceTime(ms)` when `navigator.webdriver` is true.

Implemented (2026-02-03):
- Core modular systems: `WaveSystem`, `EnemySystem`, `TowerSystem`, `ProjectileSystem`, `AuraSystem`.
- Data-driven content in `src/data/` (maps, enemies, towers, wave generator).
- Status effects: slow, burn, poison, stun, armor reduction.
- Tower roles + branching upgrades: Archer, Cannon, Frost, Alchemist, Banner (support aura).
- Multi-map support including a two-path map.
- Minimal UI: money/lives/wave/threat, build palette, selection panel with upgrades + sell, wave controls.
- Smoke-tested via Playwright; screenshots and `render_game_to_text` output confirm waves + towers functioning.
- Added `npm start` script (zero-dependency static server) for easy startup.
- Fixed upgrade UX by making selected UI persistent (no per-frame DOM rebuild) and adding tiered upgrade cards with lock reasons.
- Added targeting mode selector (First/Last/Strongest/Weakest/Closest/Farthest/Random).
- Improved visuals: procedural sprites for towers/enemies, simple animations (bobbing/tilt/recoil/muzzle flash), projectile trails, and a boss HP bar.

TODO:
- Add additional maps (multi-path) and enemy abilities beyond the core set.
- Add more upgrade tiers and late-game mechanics (interest, rerolls, map mods).
- Add save/load run state (localStorage) for replayability.

Notes (2026-02-04):
- Added new towers (Sniper, Tesla, Mortar, Flamethrower, Hex, Overseer) with branching upgrades and new enemy roster (skirmisher, brute, shellback, mystic, leech, specter, glacier, phase, bombardier) plus boss rotation (hydra, lich, colossus).
- Implemented VFX system for explosions/hits/zaps; added chain lightning and bonus damage vs tags; extended sprites for new units and status glyphs.
- Added support for vulnerability debuff and enemy regen/shield regen/rage.
- Added empty `favicon.ico` to avoid console 404s during tests.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5174 --actions-file /tmp/td-actions.json --click-selector "#start-btn" --iterations 3 --pause-ms 300` (captures `output/web-game/*`).
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5174 --actions-file /tmp/td-actions-cycle.json --click-selector "#start-btn" --iterations 1 --pause-ms 200 --screenshot-dir output/web-game-cycle`.
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5174 --actions-file /tmp/td-actions-mortar.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-mortar`.

Notes (2026-02-04):
- Added game modes (Endless, Expedition, Siege) with final-boss wave logic and victory state; UI now selects map + mode and shows wave goal.
- Added new maps: Cinder Switchbacks, Triad Crossing, Delta Split.
- Added new gimmick towers with abilities: Chronomancer (time rift nova), Stormcaller (lightning volley), Geomancer (seismic pulse), plus ability support in TowerSystem.
- Upgrade UI now shows only the active tier and hides the opposite branch after a path choice (with a single-tier focus).
- Added final boss enemy Overlord and new sprites for new towers/boss.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5175 --actions-file /tmp/td-actions-storm.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-storm`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5175 --actions-file /tmp/td-actions-geo.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-geo`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5175 --actions-file /tmp/td-actions-upgrades.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-upgrades`

Notes (2026-02-04):
- Upgrade UI now keeps path-locked options visible (greyed, with reason) while still showing only the current tier.
- Added long-form modes (Marathon, Ascension, Eclipse) with difficulty multipliers and configurable elite/boss cadence.
- Added high-cost DPS/support towers (Railgun, Rocket Pod, Beacon, Citadel) and sprites.
- Added late-wave enemies (Dreadwing, Bulwark, Siphon, Carapace, Wyrm) and updated wave pool.
- Added map decorations and two new maps (Obsidian Loop, Crystal Divide) plus decor to existing maps.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5176 --actions-file /tmp/td-actions-new.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-new`

Notes (2026-02-04):
- Added full modifier system (30+ modifiers) with aggregation + effects across towers/enemies/waves/start resources.
- Modifier selection UI on start screen with randomize/clear, plus active modifiers list in side panel.
- Map preview canvas added to the start screen (renders paths, base, spawns, decor).
- Costs, stats, abilities, and status effects now scale with selected modifiers.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5177 --actions-file /tmp/td-actions-mods.json --iterations 1 --pause-ms 200 --screenshot-dir output/web-game-mods-start`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5177 --actions-file /tmp/td-actions-mods-play.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-mods-play`

Notes (2026-02-04):
- Added "Add All" modifiers button plus extra QoL (Esc cancels build/selection, Q quick-sell, disabled start-wave while active, unaffordable tower highlighting).
- Fixed upgrade tier selection so path-locked tier 3 options still appear (greyed) without blocking progression.
- Added Summoner tower (Vanguard Kennel) that spawns allied units walking the path with HP and ranged attacks; allies render in-world and take contact damage.
- Added bleed + haste effects, enemy ability pulses, and death VFX; enemies now render with a faceted hex base and extra status auras.
- Bosses gained special abilities (summons, shield/heal/haste pulses).
 - Added new ally-focused towers: Drone Bay (chain‑lightning drones) and Marshal Post (support aura + squire summons).
 - Allies now support chain lightning and render with their own health bars.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5178 --actions-file /tmp/td-actions-summon.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-summon`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5179 --actions-file /tmp/td-actions-summon.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-summon-2`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5181 --actions-file /tmp/td-actions-marshal.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-marshal`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5182 --actions-file /tmp/td-actions-drone.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-drone`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5183 --actions-file /tmp/td-actions-marshal.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-ui`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5184 --actions-file /tmp/td-actions-marshal.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hud`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5185 --actions-file /tmp/td-actions-bosscast.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bosscast`

Notes (2026-02-04):
- Boss abilities now telegraph with dashed warning rings and show a boss cast bar when winding up; render_game_to_text exposes `boss_cast`.
- Summoned allies have per‑tower caps; new summon upgrades increase cap and auto‑despawn oldest summons when capped.
- HUD shows active summon count; upgrade cards show tag badges (summon/ability/aura/chain/crit).
- Added summon cap data to summoner/dronebay/marshal definitions and new ally source tracking.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5190 --actions-file /tmp/td-actions-marshal.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-summoncap`
