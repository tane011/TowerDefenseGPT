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
