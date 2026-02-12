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

Notes (2026-02-04):
- Allies now move toward the start of the path (retreat pathing) instead of heading to the base.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5193 --actions-file /tmp/td-actions-summoner-place.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-back`

Notes (2026-02-04):
- Allies now pause movement only while they have a target in range; otherwise they keep moving to the path start and despawn on arrival.
- Summon abilities now round‑robin across all paths within summon radius (multi‑path maps).
- Allies deal contact damage when colliding with enemies (mutual damage), and allies get unique sigils/colors per summoner tower.
- Towers show tier pips under the base to indicate upgrade level; towers also gain a tier crown above them.
- Allies now use unique body shapes by summoner type (summoner/dronebay/marshal/etc).
- Tower/enemy sprites got added core/base details and minigunner emblem.
- Boss ability windups are longer for better readability.
- Added Minigunner tower with unique sprite + upgrades.
- Boss overlay now lists multiple queued abilities; boss speed reduced further.
- Tower tier overlays now use path-specific accent colors; crowns scaled down.
- Path accent colors are now derived per tower from its base color (unique per tower), and the renderer caches static layers for smoother visuals.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5194 --actions-file /tmp/td-actions-summoner-place.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-retreat`

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5196 --actions-file /tmp/td-actions-summoner-place.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-roundrobin`

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-minigunner.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-minigunner-fixed`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-summoner-rr.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-summoner-rr-fixed`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-minigunner.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-minigunner-crown`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-summoner-allyshape.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-shapes`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-archer-up.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-tier-overlay`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-archer-up.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-tier-overlay-3`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-archer-pathcolor.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-pathcolor`

Notes (2026-02-04):
- Added path-color dots to tier-1 upgrade cards (UI) using the same per-tower palette logic as renderer.
- Upgrade name row now aligns dot + label cleanly.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-upgrade-dots.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-upgrade-dots`

Notes (2026-02-04):
- Added a tutorial overlay with 6 steps, accessible from the start screen, side panel, or by pressing H (Esc closes). Tutorial pauses gameplay while open.
- Start screen now includes a Tutorial button and control hint for H; side panel includes a Help card.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-tutorial.json --click-selector "#tutorial-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-tutorial`

Notes (2026-02-04):
- Tutorial “Finish” now closes the overlay on the last step.

Notes (2026-02-04):
- Added in-game coachmark callouts for the first run (Build panel, Start Wave, Upgrades). They pause gameplay and auto-hide after finishing; stored in localStorage to avoid repeats.
- Coachmarks are shown after starting a run, with a dim highlight ring and card.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-coachmarks.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-coachmarks`

Notes (2026-02-04):
- Help panel now lists all keybinds for quick reference.
- Fixed path locking for tier 3+ upgrades by tracing upgrade path roots from tier‑1 choices.
- Upgrades cost more (global +25%) and upgraded towers scale stronger per applied upgrade.
- Added Nightmare/Apocalypse modes with higher difficulty multipliers and Harbinger final boss.
- Final bosses buffed with higher stats and unique base‑strike abilities; added Harbinger boss.
- Support aura rings now render as distinct dashed cyan rings to avoid confusion with range rings.

Notes (2026-02-04):
- Added Settings card with QoL toggles (auto-start waves, show all ranges, show aura rings, reduce VFX) plus Reset Tips.
- Settings persist via localStorage and apply to renderer/game state.
- World settings now include VFX scale for render.

Notes (2026-02-04):
- Moved Help card below Logs and expanded Settings with many advanced toggles (grid, decor, path glow, vignette, projectiles, health bars, status glyphs/auras, boss rings/bar, reduce motion).
- Renderer now respects settings for static layer, rings, status visuals, projectiles, and VFX motion scale.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-coachmarks.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-settings-smoke`

Notes (2026-02-04):
- Moved Settings card below Help in the side panel.
- Added new maps: Sunken Canals, Aurora Ridge, Bastion Circuit, Shattered Causeway with unique layouts and decor.

Notes (2026-02-11):
- Reworked late-game features to be non-gameplay: Theme Pack, Cinematic UI, and Tower & Enemy Codex.
- Removed gameplay-affecting feature effects from runs.
- Added Codex screen (tabs for Towers/Enemies/Bosses) and premium settings for Cinematic UI + Themes.

Notes (2026-02-04):
- Removed the "(active)" suffix from wave HUD/side panel to keep layout stable.
- Fixed ally stat inflation by deep-cloning summon ability data during stat computation.
- Added Prism Beam late-game DPS tower with warm-up/decay beam damage and new beam VFX + sprite.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-ally.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-fix`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-beam.json --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-beam`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-massive.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-massive`

Notes (2026-02-04):
- Fixed aura buffs mutating shared tower definitions (deep-clone aura buffs on stat compute) to prevent infinite buff escalation.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-massive.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-bufffix`

Notes (2026-02-04):
- Endgame towers now have x5 base cost and new tier‑4 upgrades with special abilities.
- Final boss deaths trigger a long kill animation; victory screen is delayed until the animation finishes.
- Added a victory overlay style for the end screen and exposed `pending_victory` in render_game_to_text.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-massive.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-endgame`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-massive.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-finalboss-delay`

Notes (2026-02-04):
- Added a secret admin panel toggled by `~` (or `B` during Playwright) with money/lives controls, enemy and summon spawns, and quick actions.
- Admin spawns use summon definitions from summoner towers and render with correct sigils even without a source tower.
- Added fun enemy modifier tools in the admin panel (presets + custom multipliers, apply-to-live, clear effects).
- Admin enemy modifiers now apply post-spawn to avoid double scaling.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-admin.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-admin-panel`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-admin-open.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-admin-open`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-admin-open.json --click-selector "#start-btn" --iterations 1 --pause-ms 240 --screenshot-dir output/web-game-admin-open-3`

Notes (2026-02-04):
- Moved Settings card below Help and added two more maps: Citadel Confluence (three lanes) and Wyrmcoil Basin (gauntlet).
- Reworked newer maps for longer paths and tighter merges.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-coachmarks.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-map-smoke`

Notes (2026-02-04):
- Added wave scaling by wave number (mode-driven hpScale + hpMul), and "seen enemy" shields that grow as waves progress.
- Final bosses scale harder via new finalBossMult per mode; Apocalypse/Nightmare bosses now extremely high HP.
- Added "All Paths" modifier to spawn each wave on all lanes (non-bosses).
- Rebalanced towers globally: higher base cost (x1.35) and higher upgrade cost (x1.5) with stronger base/ability/summon stats.
- Boss windups lengthened further and boss speed reduced to improve readability.
- Tier crowns/pips/overlays are smaller and rendered in a separate pass to avoid recoil flash.
- Maxed towers now show a colored "Maxed" panel instead of upgrades (path color).
- Summoner towers now labeled role "summoner".
- Added new maps: Rift Gardens, Ember Labyrinth, Skybreak Junction.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-smoke.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-balance`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-upgrade-max.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-maxed`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-select.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-select`

Notes (2026-02-04):
- Added shield badge over enemy health bars to show shield amount.
- Rebalanced costs/stats again for higher-impact towers (higher costs + stronger damage/ability/summons).
- Increased per-mode HP scaling and final-boss multipliers for harder late-game difficulty.
- Default seen-enemy shield scaling increased for better visibility.

Notes (2026-02-04):
- Added shield badge overlay above enemy health bars (shows shield value).
- Tuned balance again: higher tower/upgrade costs and stronger base/ability/summon scaling; increased per-mode HP scaling and final boss multipliers.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-shield.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-shield`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-smoke.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-shield-2`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-shield-3.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-shield-3`

Notes (2026-02-04):
- Added two late-game DPS towers: Obliterator (single-target heavy) and Sunbreaker (splash heavy) with branching upgrades.
- Added unique emblems for Obliterator and Sunbreaker sprites.

Notes (2026-02-04):
- Added two late-game DPS towers: Obliterator (single-target heavy) and Sunbreaker (splash heavy) with branching upgrades.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5174 --actions-file /tmp/td-actions-smoke.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-late-dps`

Notes (2026-02-04):
- Fixed summon stat runaway by deep-cloning ability.summon in computeStats (prevents infinite ally stats).
- HUD wave line no longer appends "(active)" to avoid layout shifting.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-smoke.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ally-fix`

Notes (2026-02-04):
- Added Prism Beam late-game DPS tower with continuous beam damage and upgrades.
- Implemented beam VFX and beam damage handling (damage per second + optional on-hit effects).

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-beam`

Notes (2026-02-04):
- Added warm-up mechanic for beam towers (ramp up damage while locked; decays when idle).
- Removed "(active)" suffix from side-panel wave counter to avoid layout shift.

Notes (2026-02-04):
- Expanded secret admin panel with enemy modifier presets + custom sliders, including live-apply and clear-effects actions.
- Admin enemy spawns now accept modifier configs and apply scaling safely (no double-scaling).
- Added admin functions to apply/clear modifiers on existing enemies.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-admin-mods.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-admin-mods`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-admin-open.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-admin-open-3`

Notes (2026-02-04):
- Maxed towers now hide upgrade tiers entirely and show the Maxed panel when no available upgrades remain (path-locked-only upgrades count as maxed).

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-maxed.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-maxed`

Notes (2026-02-04):
- Tower ability UI now shows a generated ability effect description (uses ability.description when provided, otherwise auto‑summarizes type + effects).
- Added new bosses: Tempest Regent, Abyssal Titan, Solar Phoenix with high HP and multi‑ability kits.
- Existing bosses now include ability descriptions for readability.
- Wave generator boss pool expanded to include the new bosses at later waves.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-bosses.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bosses`

Notes (2026-02-04):
- Boss cast bar now shows ability descriptions beneath the cast label (truncated to fit).
- Added three more bosses with high HP + multi-ability kits: Mirror Warden, Gravemaw, Aether Oracle.
- Boss pool expanded to include the new bosses at later waves.
- Tower ability tooltip now auto-describes abilities based on type/effects if no description is provided.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-bosses.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bosses-2`

Notes (2026-02-04):
- Boss cast bar spacing increased again (taller rows + desc line spacing) to avoid overlap.
- Ally collision now kills the ally instantly on contact while still applying a hit to the enemy.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-bosses.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bossbar-spacing-2`

Notes (2026-02-04):
- Rebalanced overall pacing: tower global scaling reduced slightly, costs eased, and wave HP scaling smoothed with a late-game ramp.
- Mode difficulty multipliers softened to keep challenge without runaway HP spikes.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-balance.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-balance`

Notes (2026-02-04):
- Added Field Medic tower: support aura grants tower stun immunity + cleanses stuns; ability "Field Triage" periodically restores base lives.
- Added boss tower-stun mechanic: bosses emit a tower-stun pulse ability; medics prevent stuns within their aura.
- Tower system now respects tower stun, pausing attacks while stunned.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-balance.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-medic`

Notes (2026-02-04):
- Rebuilt selected/upgrade panel DOM every update and added a self-healing `_ensureSelectedCardDom()` so the “Selected” content can’t disappear even if the DOM gets clobbered by CSS/hidden state.
- Selected card now always removes `hidden` when shown; content containers get reattached if missing.
- Coachmarks no longer auto-open during Playwright runs (skip when `navigator.webdriver`).

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-selected-panel.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-selected-panel` (selected panel shows full info + upgrades)
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-unselect.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-selected-panel-unselect` (unselect clears selection)
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-unselect-after.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-selected-panel-unselect-after` (reselect works)

Notes (2026-02-04):
- Fixed Selected panel layout collapsing by forcing it to opt out of flex shrinking (`flex: 0 0 auto`) and removing fragile RAF timing.
- Selected panel now hard-rebuilds its DOM every update and forces display for info/actions to prevent disappearing content.
- Cache-busted main script and CSS to ensure browsers load the new UI.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-show-selected-full.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-selected-panel-show`
- Manual Playwright DOM inspection via `/tmp/inspect-styles.mjs` confirmed selected card height/opacity correct.

Notes (2026-02-04):
- Selected panel now shows only the current upgrade tier for the chosen path, and shows a maxed-path summary when fully completed.
- Fixed selected panel buttons: verified upgrade purchase works and panel updates to the next tier; sell button works.

Tests (2026-02-04):
- Playwright custom: `/tmp/test-click-panel.mjs` (upgrade button + sell button clickable; upgrades apply)
- Playwright custom: `/tmp/test-tier-progression.mjs` (tier advances after buying an upgrade)

Notes (2026-02-04):
- Fixed Selected UI interactivity regression by only rebuilding DOM when the tier/path view changes, preserving event listeners.
- Tier 1 now correctly shows both path options before a path is chosen; after choosing, a “Path chosen” badge appears and only the current tier is shown.

Tests (2026-02-04):
- Playwright custom: `/tmp/sidebar-tier1.mjs` (Tier 1 shows both options)
- Playwright custom: `/tmp/show-path-badge.mjs` (Path chosen badge + Tier 2 only)
- Playwright custom: `/tmp/test-click-panel.mjs` (upgrade + sell buttons clickable)

Notes (2026-02-04):
- Added Skip Wave button to end the active wave immediately, clearing remaining spawns/enemies while still awarding the wave-clear bonus.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-skip` (shot-0.png showed only canvas; full UI verified separately).
- Manual Playwright MCP: started a run, clicked Start Next Wave, confirmed Skip Wave enabled and visible in `output/web-game-skip/fullpage.png`.

Notes (2026-02-04):
- Boss waves are now unskippable (Skip Wave disabled + blocked in WaveSystem), and any boss reaching the base causes immediate game over.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-boss-skip`
- Manual Playwright MCP: opened debug menu, spawned a boss with high speed, closed menu, and confirmed Game Over triggered when the boss reached the base (log + overlay).

Notes (2026-02-04):
- Skip Wave now shows a tooltip: boss waves are unskippable, inactive waves show a hint, and active waves show the action.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-boss-tooltip`

Notes (2026-02-04):
- Added an always-visible Skip Wave hint line under the wave controls (inactive/boss/active states).

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-skip-hint`

Notes (2026-02-04):
- Skip Wave now requires all spawns to finish first and no longer clears enemies; it only ends the wave early with remaining enemies still active.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-skip-spawn`

Notes (2026-02-04):
- Added a skip-status dot and countdown hint showing when spawn waves finish; hint switches to ready/locked states.

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-skip-countdown`

Notes (2026-02-04):
- Skipping a wave now auto-starts the next wave (keeps enemies alive).

Tests (2026-02-04):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-skip-autonext`

Notes (2026-02-04):
- Rebalanced easier modes (Endless, Expedition, Siege) to be far more forgiving: slower spawns, lower HP scaling, softer elite/boss multipliers, fewer elite/boss waves, and reduced seen-enemy shields; updated mode descriptions to match.

Notes (2026-02-05):
- Easy modes now grant extra starting money/lives via mode.start, and higher wave clear bonuses via difficulty.rewardBonusMul/Add (applied in wave generator).

Notes (2026-02-05):
- Added Cataclysm mode (80 waves) as the new hardest mode with a structured 3‑act enemy roster and Void Emperor final boss.
- Wave generator now supports per-mode enemy/elite/boss pools (min/max wave gating).
- Added new Cataclysm enemies with unique abilities: Riftling (Blink), Veilwalker (Phase Cloak), Nullguard (Shield Surge), Ironweaver (Armor Weave), Chronarch (Overclock), Abyss Herald (Rift Call), Void Sapper (Life Drain), Stasis Reaver (Stasis Burst).
- Added Void Emperor final boss with Phase 1 abilities (Rift Wave, Void Gate, Oblivion Burst) and a Phase 2 trigger at ~20% HP that heals to full once and swaps to new abilities (Collapse Pulse, Starfall, Phase Dash).
- Implemented new enemy ability types (blink, phase_cloak, shield_surge, armor_boost, overclock, rift_call, life_drain, stasis_burst, rift_wave, void_gate, oblivion_burst, collapse_pulse, starfall, phase_dash).
- Added phase-shift system to Enemy with mitigation effects, armor boosts, and phase2 stats/abilities, plus VFX/logging.
- Added detailed Void Emperor sprite and extra boss visual effects + boss bar phase label. render_game_to_text now exposes boss phase.

Tests (2026-02-05):
- Playwright (custom): spawned Void Emperor at phase trigger, confirmed phase 2 visuals/boss bar: `output/web-game-cataclysm/shot-phase.png` + `state-phase.json`.
- Playwright (custom): started Cataclysm, wave 1 spawns new enemies: `output/web-game-cataclysm-start/shot-1.png` + `state-1.json`.

Notes (2026-02-05):
- Added new map: Void Crucible (tri-lane rift) with three weaving paths, extra decor crystals/ruins, and higher starting resources.

Tests (2026-02-05):
- Playwright (custom): selected Void Crucible map and started run: `output/web-game-void-crucible/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Cataclysm now recommends the Void Crucible map; selecting the mode auto-switches the map preview.
- Phase 2 transition updated: boss becomes immune, plays a phase-shift window, then jumps to the start of its current lane before activating new abilities.
- Added lane-jump ability for phase 2 that switches the boss to another lane at the same relative progress.

Tests (2026-02-05):
- Playwright (custom): phase 2 transition jump-to-start on Void Crucible: `output/web-game-cataclysm-phase2/shot-1.png` + `state-1.json`.
- Playwright (custom): lane-jump behavior on Void Crucible: `output/web-game-cataclysm-lanejump/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Lane-jump ability now picks smarter targets (prefer lanes with more enemies; avoids tiny jumps; preserves relative progress) and telegraphs the destination ring during windup.
- Phase-2 transition now shows a distinct animation overlay while the boss is damage-immune.
- Void Crucible now has a rift-themed background treatment (both in-game and map preview).

Tests (2026-02-05):
- Playwright (custom): Void Crucible background theme: `output/web-game-void-crucible-theme/shot-0.png` + `state-0.json`.
- Playwright (custom): lane-jump telegraph destination: `output/web-game-cataclysm-telegraph/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Cataclysm <-> Void Crucible pairing is now enforced both in UI selection and in Game.newRun. Switching modes/maps automatically resolves to a valid pair while still allowing users to exit the lock.

Tests (2026-02-05):
- Playwright (custom): mode/map lock behavior verified in `output/web-game-cataclysm-lock/state.json`.

Notes (2026-02-05):
- Added a “Locked Pair” badge on the start screen when map/mode are tied, and the Start button now uses a Cataclysm-specific gradient.

Tests (2026-02-05):
- Playwright (custom): badge + button styling captured in `output/web-game-cataclysm-badge/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Added early-wave easing parameters to the wave generator and tuned Cataclysm early game (waves 1–12) for fairer pacing: lower HP and shields, slightly slower cadence, and higher budget.

Tests (2026-02-05):
- Playwright (custom): Cataclysm wave 1 after early-game tuning in `output/web-game-cataclysm-early/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Cataclysm early-game easing now ramps through wave 18 (wider on-ramp) and adds a small wave-clear bonus for the first 10 waves to keep the early economy fair while difficulty ramps.

Tests (2026-02-05):
- Playwright (custom): Cataclysm wave 1 after extended easing + early bonus in `output/web-game-cataclysm-early-4/shot-0.png` + `state-0.json`.

Notes (2026-02-05):
- Build palette hover tooltip now shows primary damage type and base DPS (e.g., "physical | 12.0").

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip` (hover tooltip is browser-native; not visible in headless screenshot).

Notes (2026-02-05):
- Build palette hover tooltip now uses total tier-0 DPS (base + ability) instead of base-only.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip-total` (tooltip not visible in headless capture).

Notes (2026-02-05):
- Replaced native title tooltip with a styled palette tooltip (uppercase pill) showing primary damage type + total tier-0 DPS; uses modifier-adjusted base stats.
- Tooltip now positions next to hovered build button and updates after start/modifier changes.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip-ui`
- Playwright (hover attempt): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-hover.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip-ui-2` (tooltip may not appear in headless capture depending on cursor/viewport).

Notes (2026-02-05):
- Palette tooltip label now uses role/status tags (DPS, SUPPORT, SUMMONER, STUN, SLOW, DEBUFF, BURN, POISON, BLEED) instead of elemental damage types; tier-0 effects determine the tag.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip-tag`

Notes (2026-02-05):
- Palette tooltip now renders inline above the Build list (pill style) instead of floating over other tower names.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-hover-tooltip-inline-nice`

Notes (2026-02-05):
- Build palette now shows an always-visible meta line inside each tower button (TAG | DPS).
- Added small color icon per tower and reduced tile sizing to fit more entries per row.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-icons-small`

Notes (2026-02-05):
- Build tiles now use a tower silhouette icon (SVG mask) colored per tower; text is constrained with ellipsis to always fit.
- Slightly roomier tile sizing + polished icon styling for better readability while still fitting more per row.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-icons-silhouette`

Notes (2026-02-05):
- Build palette now uses actual base tower sprites for icons (generated from render sprite sheets) and moved cost into the meta line so full tower names can wrap.
- Tile layout widened to keep full labels visible without truncation; meta + label wrap cleanly.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-icons-sprite-4`

Notes (2026-02-05):
- Build palette now groups towers by role (cheapest to most expensive within each), adds group headers, and removes the type label from per-tower line.
- Cost is now bold gold in the meta line; DPS moved to subtext, and non-DPS towers show their primary ability/aura summary instead.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-grouped`

Notes (2026-02-05):
- Group headers now use a renamed label for DPS (Assault).
- Prism Beam DPS now computed from beam stats (warmup-averaged) instead of showing 0.
- Non-DPS towers show primary ability/aura text in the subline; DPS towers show DPS only.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-grouped-3`

Notes (2026-02-05):
- Non-DPS towers now show their ability description in the subline (fallback to aura summary/utility if no ability).

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-build-grouped-4`

Notes (2026-02-05):
- Sidebar now locks (dim + non-interactive) while the start screen is open; Settings card stays active.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-start-lock`

Notes (2026-02-05):
- Sidebar now greys out entirely during start screen; settings moved into a dropdown on the start screen for easy access.
- Non-DPS towers now show a clear ability description; summoner towers show summon name + tier-0 DPS.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-start-settings`

Notes (2026-02-05):
- Start screen Modifiers and Settings are now clear dropdowns with summary arrow + hint; modifiers show selected count inline.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-start-dropdowns`

Notes (2026-02-05):
- Modifiers + Settings dropdowns now default collapsed; summaries include clear caret + hint (modifiers show "click to expand").
- Support/Slowing/Debuff towers now use short plain-language summaries (no stats); summoners show summon name + tier-0 DPS.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-start-dropdowns-2`

Notes (2026-02-05):
- Modifiers list now expands fully (no max-height/scroll) to match settings dropdown behavior.
- Added QoL settings: keep build mode active after placement + auto-select newly built towers.
- Added setting wiring + persistence, and tower placement respects new settings.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-modifiers-full`

Notes (2026-02-05):
- Added QoL settings: keep build mode, auto-select built towers, auto-pause after wave, auto-pause on boss wave.
- Wave system now respects pause-on-boss and pause-on-wave-clear settings.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-qol-settings`

Notes (2026-02-05):
- Settings dropdown now grouped by category (Gameplay, Visuals, Accessibility, HUD).
- Added Reset Defaults button to restore settings to defaults (and apply + persist).

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-settings-grouped`

Notes (2026-02-05):
- Support tower summaries now call out their primary support benefit (fire rate, damage, range, etc.) based on aura buffs.

Notes (2026-02-05):
- Support tower summaries now describe overall usage (boosts nearby towers) and call out the primary benefit.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-support-summary`

Notes (2026-02-05):
- Modifiers are now grouped into nested dropdowns by effect category (Economy, Tower Offense, Abilities, Chains, Auras, Enemy Toughness, Enemy Speed/Control, Wave Flow, Elites/Bosses).
- Group summaries show selected counts; modifiers sorted alphabetically within groups.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-modifier-groups`

Notes (2026-02-05):
- Added per-group Modifiers actions (Randomize, Add All, Clear) inside each category dropdown.
- Global modifier actions removed since groups now control their own sets.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-modifier-groups-actions`

Notes (2026-02-05):
- Added global modifier actions (All Modifiers) with distinct styling; group-level actions remain.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-modifier-groups-global`

Notes (2026-02-05):
- Cataclysm early game softened: extra starting resources, longer early ramp (24 waves), slower spawns, lower HP scaling, reduced early shields/elite pressure, and higher early clear bonuses.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-cataclysm-early.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-cataclysm-early-tuned`

Notes (2026-02-05):
- Further eased Cataclysm early game: higher start money/lives, slower early spawns, reduced early budget/HP/shields, longer early ramp, slightly softer base HP/interval scaling.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-cataclysm-early-2.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-cataclysm-early-tuned-2`

Notes (2026-02-05):
- Rebalanced upgrade value: tier-1 upgrades cheaper (per-tier cost multiplier) and upgrades now grant larger early stat scaling with tapered gains for later tiers.

Notes (2026-02-05):
- Major upgrade overhaul: tier-1–3 costs slashed and upgrade scaling now massively boosts damage/rate/range/status/aura/summons with added cooldown reduction; designed to make upgrades clearly superior to buying duplicate towers.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-upgrade-balance`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-upgrade-balance-2`

Notes (2026-02-05):
- Made the stats HUD (Money/Lives/Wave/Threat) sticky so it stays visible while scrolling the side panel.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats`

Notes (2026-02-05):
- Strengthened sticky stats bar divider/shadow and slightly increased background opacity for clearer separation during scroll.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-divider`

Notes (2026-02-05):
- Added a subtle inner bottom divider to the sticky stats bar for clearer separation from the scrollable panel.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-divider-2`

Notes (2026-02-05):
- Replaced the inner divider with a soft gradient fade under the sticky stats bar for a cleaner separation.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-fade`

Notes (2026-02-05):
- Replaced enemy status debuff letters with color-coded icon badges (snowflake, flame, droplet, target, shield, etc.) so debuffs are readable at a glance.
- Status icons now sort by priority (stun/armor shred/vuln first) and render slightly larger with better spacing.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-debuff-icons.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-debuff-icons-2`

Notes (2026-02-05):
- Status icons now use a glow + darker outline, slightly larger sizing, and a compact "+N" overflow badge when more than 4 debuffs are active.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-debuff-icons.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-debuff-icons-3`

Notes (2026-02-05):
- Added two endgame single-target towers with unique tier-4 finishers: Judicator (arcane execution edict/null decree) and Rift Piercer (lightning rift lance/storm requiem).
- Added matching sprite emblems for Judicator and Rift Piercer for build icons/in-world render.

Tests (2026-02-05):
- Playwright: node  --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-endgame.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-endgame-single
- Playwright: node  --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-start-screen.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-endgame-start-3

Notes (2026-02-05):
- Removed the in-canvas HUD text (money/lives/wave/summons) since the sidebar already displays these stats.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-no-hud`

Notes (2026-02-05):
- Added finisher VFX + execute mechanics for the new endgame single-target towers. Tier-4 abilities now spawn custom beam/zap/pulse VFX and can execute low-HP targets (Execution Edict).
- Ability VFX are data-driven via ability.vfx (beam/zap/pulse) and projectile executeThreshold/executeMult.

Tests (2026-02-05):
- Playwright: node  --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-endgame.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-endgame-vfx
- Playwright (headed): node  --url http://127.0.0.1:5173 --actions-file /tmp/td-actions-endgame.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --headless false --screenshot-dir output/web-game-endgame-vfx-headed

Notes (2026-02-05):
- Softened the sticky stats bar shadow to remove the heavy rectangular edge and keep the panel separation subtle.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-soft`

Notes (2026-02-05):
- Fixed startup crash: stray helper methods were outside the UI class in `src/ui/UI.js`, causing `SyntaxError: Unexpected token '{'`. Moved helpers to top-level functions and updated call sites.

Tests (2026-02-05):
- Syntax check: `find src -name '*.js' -print0 | xargs -0 -n1 node --check`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-smoke-2`

Notes (2026-02-05):
- Added side-panel scroll detection to shrink the sticky stats bar slightly when scrolled; returns to full size at top.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-shrink`

Notes (2026-02-05):
- Increased the scrolled HUD shrink slightly (smaller padding/gap and font sizes).

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-shrink-2`

Notes (2026-02-05):
- Replaced the binary scrolled class with a proportional shrink based on side panel scrollTop (smoothly scales padding, gap, and font sizes over the first 80px).

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-sticky-stats-scroll`

Notes (2026-02-05):
- Void Emperor phase-2 transition now lasts 10s, heals to full during the shift, and shows a clearer telegraph: swirling phase rings around the boss, an anchor ring + tether at the path start, and a boss-bar “Phase Shift” timer.
- Added a webdriver-only `?voidPhaseTest=1` shortcut to spawn the Void Emperor and auto-trigger the transition for visual testing.

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase`

Notes (2026-02-05):
- Added phase-shift screen tint + subtle camera shake during Void Emperor transition.
- Added rift spark particles along the path toward the start point during the 10s phase shift.
- VFX system now supports simple velocity/rotation to animate drifting sparks.

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase-2`

Notes (2026-02-05):
- Phase-shift screen shake + tint now persist for Void Emperor after phase transition (until it dies).

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase-long.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase-3`

Notes (2026-02-05):
- Void Emperor phase 2 now has a distinct visual form (core glow, spikes, and brighter aura), plus ongoing void aura VFX and orbiting sparks to signal strength.

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase-long.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase-4`

Notes (2026-02-05):
- Boss bar now uses a fixed-height canvas above the map and shows a "Boss Intel" panel when no boss is present (next boss wave + cadence). Layout spacing increased and text is truncated to avoid overlaps.
- Boss ability list is sorted by soonest-to-fire (remaining windup) so the next cast is always at the top.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bossbar-layout`
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-bossbar-layout-2`

Notes (2026-02-05):
- Void Emperor phase 2 now spams a stronger Void Gate summon (count 6) with a shorter cooldown, and all phase-2 ability cooldowns are reduced to increase stress.

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase-long.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase-5`

Notes (2026-02-05):
- Phase 2 shake now ramps from minimal to intense over ~8s after phase start; tint intensity ramps with it.

Tests (2026-02-05):
- Playwright (custom): `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173?voidPhaseTest=1 --actions-file /tmp/td-actions-void-phase-long.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-void-phase-6`

Notes (2026-02-05):
- Boss bar repurposed to a Run Status panel when no boss is active (map + mode header, wave state, auto toggle, threat, modifiers).
- Panel spacing increased; draws consistently using fixed height without layout shifts.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-runstatus`
- Playwright (manual): Full-page screenshot via Playwright to verify Run Status panel: `output/web-game-runstatus/full-page-advanced.png`

Notes (2026-02-05):
- Run Status bar now animates with a moving pulse tied to game time (pauses when paused; faster during active wave).

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-runstatus-motion`
- Playwright (manual): `output/web-game-runstatus-motion/full-page-1.png` and `full-page-2.png` to confirm motion.

Notes (2026-02-05):
- Run Status bar now fills based on wave spawn progress (spawnRemaining / spawnTotal) when a wave is active; shows % on the right.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-runstatus-progress`
- Playwright (manual): started wave and captured `output/web-game-runstatus-progress/canvas-wave.png` to verify progress fill.

Notes (2026-02-05):
- Run Status bar now fills by run progress for fixed-length modes, and by boss-cycle progress for endless (wave-to-boss). Shows label like "Boss in 11w".

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-runstatus-progress2`
- Playwright (manual): `output/web-game-runstatus-progress2/full-page-1.png` and `full-page-2.png` to confirm progress bar fill and label updates.

Notes (2026-02-05):
- Run Status bar now counts the active wave (current wave = cleared + 1 when in wave). Progress uses current wave for fixed-length modes and for boss cadence in Endless.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-runstatus-progress3`
- Playwright (manual): `output/web-game-runstatus-progress3/full-page-1.png` confirms Wave 1 during active wave.

Notes (2026-02-05):
- Side panel wave display now shows the active wave (cleared + 1 when in wave), consistent with Run Status bar.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-wave-display`
- Playwright (manual): `output/web-game-wave-display/full-page-wave.png` shows Wave 1 during active wave.

Notes (2026-02-05):
- Sidebar wave display now uses current wave (in-wave = waveNumber + 1), matching bossbar/run status. Verified during active wave.

Tests (2026-02-05):
- Playwright: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-wave-display`

Notes (2026-02-05):
- Added custom gamemode creator (start menu only) with full settings, enemy pools, templates, import/export, and localStorage save/load; custom modes show in mode selector under a "Custom" group.
- Added custom map creator (start menu only) with path editing, decor placement, templates, import/export, validation, and localStorage save/load; custom maps show in map selector under a "Custom" group.
- Fixed invalid map/mode combos when both are locked (custom or built-in): new map/mode pair resolver picks a valid pair and updates selects, preventing startup breaks when multiple locks exist.

Tests (2026-02-05):
- Playwright: `node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-mapmode-lock`

Notes (2026-02-05):
- Overhauled lock rules: maps no longer lock to modes. Removed required mode from map defs + custom map editor; only modes may lock to a map.
- Updated map/mode pairing resolution to respect mode->map locks only; map changes now choose an unlocked mode if needed.
- Mode description/badge now show only map locks; recommended maps are informational (no auto-select).

Tests (2026-02-05):
- Playwright: `node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-mapmode-nolock`

Notes (2026-02-05):
- Endgame tower upgrades now cost more: upgrade costs for endgame towers are multiplied by 2x via a parent lookup in `Game.getUpgradeCost`.

Tests (2026-02-05):
- Playwright: `node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-endgame-upgrade-costs`

Notes (2026-02-05):
- Endgame upgrade costs now scale by tier (1.4x / 1.9x / 2.4x / 3.0x for tiers 1-4) so early upgrades stay approachable while later tiers get expensive.

Tests (2026-02-05):
- Playwright: `node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-endgame-upgrade-costs-tiered`

Notes (2026-02-05):
- Beam towers now lock onto their current target until it dies or the tower is stunned; target is cleared on kill or stun.

Tests (2026-02-05):
- Playwright: `node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --click-selector "#start-btn" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-beam-lock`

Notes (2026-02-10):
- Added persistent Coins + unlock system with a data-driven shop catalog. Basic towers (Archer/Cannon/Frost/Alchemist/Banner) and core modes/maps are free; all other towers, maps, modes, and optional features (Modifiers, Custom Maps/Modes) are locked behind coin costs.
- New modules: `src/meta/Progression.js` (localStorage save/load for coins+unlocks), `src/meta/Shop.js` (purchase logic + queries), `src/meta/unlocks.js` (unlock keys + default unlocks), `src/meta/rewards.js` (coin rewards), `src/data/shop.js` (catalog builder).
- Start screen now shows Coins and a Shop button. Shop overlay lists items by category, shows lock status + costs, and handles purchases.
- Modes/maps select show locked items with cost, disable selection; start run resolves to valid unlocked pairs. Build palette shows locked towers with coin cost; clicking locked towers opens shop.
- Modifiers/Custom Map/Custom Mode features are locked until purchased; UI disables and shows “Locked” messaging.
- Coin rewards are granted at game over/victory based on waves cleared + difficulty, with a victory bonus for fixed-length modes; rewards displayed on game-over panel.
- Added `?uiCapture=1` webdriver hook to hide canvases so Playwright screenshots capture UI overlays.

Tests (2026-02-10):
- Syntax check: `find src -name '*.js' -print0 | xargs -0 -n1 node --check`
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file /tmp/td-actions-shop.json --click-selector "#shop-open" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-shop-ui-2`
  - Verified Shop overlay renders with locked/unlocked items and coin costs.

TODO:
- If you want explicit visual verification of coin rewards on game over, run a manual loss and confirm the Coins panel on the Game Over screen.

Notes (2026-02-10):
- Coin rewards now include a modifier-based multiplier that scales up for challenge modifiers and down for helpful modifiers. The multiplier is inferred from modifier effects (with optional `coinBias` override), then clamped to keep results sane.
- Game Over coin breakdown now shows the modifier multiplier when it differs from 1.0x.

Tests (2026-02-10):
- Syntax check: `find src -name '*.js' -print0 | xargs -0 -n1 node --check`
- Playwright attempt: `node $WEB_GAME_CLIENT --url http://127.0.0.1:5173 --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-modcoins` (UI captured; menu only)

Notes (2026-02-10):
- Revamped the start flow into two dedicated overlays: a Title screen (story + Play/Shop/Tutorial) and a separate Run Setup screen (map/mode/modifiers/settings).
- Coins now show globally via a fixed HUD pill; removed the extra coin pill from the Shop header to avoid duplication.
- Menu-only screens (Shop/Custom Map/Custom Mode) now open only from Title/Setup overlays.

Tests (2026-02-10):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-ui-revamp-title`
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --click-selector "#open-setup" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-ui-revamp-setup`
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --click-selector "#shop-open" --iterations 1 --pause-ms 250 --screenshot-dir output/web-game-ui-revamp-shop`

Notes (2026-02-11):
- Shop sections now render as distinct shop panels with themed headers and gated modifier purchases (requires Modifier Access).
- Mode selector now labels map-bundled modes and disables them until the map is unlocked; mode description/badge updated to reflect bundles.
- Modifier list now groups by Challenge vs Helpful, shows coin multiplier per modifier, and respects individual modifier unlocks with lock pills.
- Run Intel panel now summarizes mode stats and live coin multiplier based on selected modifiers.
- Modifier actions (randomize/add all/clear) now operate only on unlocked modifiers.
- Progression stats now record runs on game over for the new Stats screen.

TODO:
- Run Playwright smoke tests and inspect new UI screenshots for title/setup/shop/modifiers.
- Verify modifier unlock gating and bundled mode unlock behavior in the UI.

Notes (2026-02-11):
- Ran Playwright UI smoke test after title screen redesign; title screen renders in automated capture.
- Output: /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-home-ui/shot-0.png and state-0.json.
- No blank-screen repro in local test; requesting user repro details (browser/URL/console errors).

Tests (2026-02-11):
- Playwright: node /Users/dylantanenbaum/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url "http://127.0.0.1:5173?uiCapture=1" --actions-file /Users/dylantanenbaum/.codex/skills/develop-web-game/references/action_payloads.json --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-home-ui

Notes (2026-02-11):
- Investigated blank "Loading..." screen: Playwright canvas-only capture reproduces Loading-only view when not using `?uiCapture=1` (expected, canvas screenshot only). UI overlay renders correctly in uiCapture mode.
- Added a guard to ensure title screen is visible on init when not in a run: `UI._ensureMenuVisible()`.
- Removed `position: relative` from `#title-screen` to avoid any stacking/positioning oddities with overlay layers.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-blank-check`
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-ensure-menu`

Notes (2026-02-11):
- Title page updated to feel more like a game menu: removed section labels (Command Center, kicker, tips), tightened copy, and turned feature blocks into pill badges.
- Increased button sizes substantially for Play/Shop/Stats to emphasize a game-title CTA stack.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-title-buttons`

Notes (2026-02-11):
- Refined title screen to lean into classic game start screens: bold sci-fi title font, reduced copy, right-anchored CTA stack, and added a subtle "Press Enter / Click" prompt.
- Repositioned layout to a two-column hero/actions split and removed feature pills for a cleaner title presentation.
- Increased button sizes again and tightened CTA grouping to keep focus on Play.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-title-inspo-4`

Notes (2026-02-11):
- Title screen refined toward clean, console-style start screen: removed feature pills, tightened copy to two short lines, added "Press Enter / Click" prompt, and emphasized large logo + minimal CTA stack.
- Layout now uses a simple hero/actions split with more negative space; buttons sized up further.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-title-inspo-4b`

Notes (2026-02-11):
- Removed Codex button from title screen per request and ensured title/menu layout prevents overlap by switching to a flex-based title panel.
- Title now splits cleanly into two lines via dedicated spans and the Stats button always reads "Stats" (locked state still dimmed).

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-title-clean-5`

Notes (2026-02-11):
- Shop Modes now use a large left-side icon (final boss portrait) like towers, and replaced the oversized Final Boss pill with compact mode info (waves/elite/boss cadence).
- Modes without a final boss show a generic infinity icon.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --click-selector "#shop-open" --iterations 1 --pause-ms 300 --screenshot-dir /Users/dylantanenbaum/Documents/TowerDefenseGPT/output/web-game-shop-modes-icon`

Notes (2026-02-11):
- Bosses now pause movement while an ability is winding up (pending abilities), resuming once the cast fires.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?voidPhaseTest=1" --actions-file /tmp/td-actions-boss-ability.json --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-boss-ability-pause`
  - Note: default click-selector flow failed because `#start-btn` is on the setup screen; ran voidPhaseTest without clicking.

Notes (2026-02-11):
- Added a Themes pill next to Saves on the title screen. When locked, it uses the same disabled treatment as other locked tabs and opens Shop with a lock notice. When unlocked, it opens Settings and scrolls to the Theme selector.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-themes-pill`

Notes (2026-02-11):
- Moved Themes into its own overlay (separate from Settings). Themes pill now opens the Themes menu; cards apply theme immediately and persist. Locked behavior routes to Shop.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1&unlockThemes=1" --actions-file $WEB_GAME_ACTIONS --click-selector "#themes-open" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-themes-menu`

Notes (2026-02-11):
- Theme system now drives shared UI variables (`--panel`, `--panel-2`, `--panel-3`, `--accent`), so switching themes actually recolors panels, buttons, tabs, and cards.
- Added two more themes: Verdant and Nebula.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1&unlockThemes=1&theme=nebula" --actions-file $WEB_GAME_ACTIONS --click-selector "#themes-open" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-themes-nebula`
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1&unlockThemes=1&theme=verdant" --actions-file $WEB_GAME_ACTIONS --click-selector "#themes-open" --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-themes-verdant`

Notes (2026-02-11):
- Refined startup profile picker UI: header kicker, card gradients, highlight bar, stat box styling, badges, and CTA separation for a cleaner, more premium layout.
- Added richer save meta in the picker (win rate, totals) and a more structured stat grid.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-2`

Notes (2026-02-11):
- Profile picker stats now stretch to fill the cards; added subtle ruled lines and accent glow to occupy vertical space cleanly.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-3`

Notes (2026-02-11):
- Added animated ambient artwork per profile card to make the profile picker feel more alive, plus hover lift for a bit of depth.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-4`

Notes (2026-02-11):
- Replaced ambient background art with a data-driven visual block per profile: win-rate ring + unlock progress summary and mini stats.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-5`

Notes (2026-02-11):
- Profile picker visual ring now represents unlock progress; mini “Progress” line shows win-rate decimal. CTA button spans full card width.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-6`

Notes (2026-02-11):
- Progress ring now measures paid unlocks only (free items excluded). Mini “Progress” stat shows win rate as a decimal. Paid unlock total derives from shop catalog grants.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-7`

Notes (2026-02-11):
- Continue button now uses a distinct teal-blue gradient to stand apart from Select.

Tests (2026-02-11):
- Playwright: `node $WEB_GAME_CLIENT --url "http://127.0.0.1:5173?uiCapture=1" --actions-file $WEB_GAME_ACTIONS --iterations 1 --pause-ms 300 --screenshot-dir output/web-game-profile-select-ui-8`
