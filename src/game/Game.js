import { buildPathInfo, findClosestPathPoint } from "../world/path.js";
import { MapInstance } from "../world/Map.js";
import { Enemy } from "../world/Enemy.js";
import { Tower } from "../world/Tower.js";
import { Ally } from "../world/Ally.js";
import { aggregateModifiers, applyEnemyModifiers } from "./modifiers.js";
import { AuraSystem } from "../systems/AuraSystem.js";
import { EnemySystem } from "../systems/EnemySystem.js";
import { AllySystem } from "../systems/AllySystem.js";
import { ProjectileSystem } from "../systems/ProjectileSystem.js";
import { VfxSystem } from "../systems/VfxSystem.js";
import { TowerSystem } from "../systems/TowerSystem.js";
import { WaveSystem } from "../systems/WaveSystem.js";
import { Renderer } from "../render/Renderer.js";

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

export class Game {
  constructor({ canvas, input, data, rng, state, ui }) {
    this._canvas = canvas;
    this._input = input;
    this._data = data;
    this._rng = rng;
    this.state = state;
    this.ui = ui;

    this.map = null;
    this.pathInfos = [];
    this.modeDef = null;
    this.world = { towers: [], enemies: [], allies: [], projectiles: [], vfx: [], modifiers: null };
    this._towerByTile = new Map();

    this._uiRenderState = { ghost: null };
    this.modifiers = [];
    this.modifierState = aggregateModifiers([]);

    this.renderer = new Renderer({
      canvas,
      towerDefs: data.towerDefs,
      enemyDefs: data.enemyDefs,
    });

    this._auraSystem = new AuraSystem({ towerDefs: data.towerDefs });
    this._towerSystem = new TowerSystem({
      towerDefs: data.towerDefs,
      rng: this._rng,
      spawnAlly: (tower, stats, ability) => this.spawnAlly(tower, stats, ability),
    });
    this._allySystem = new AllySystem({ rng: this._rng });
    this._projectileSystem = new ProjectileSystem();
    this._vfxSystem = new VfxSystem();
    this._enemySystem = new EnemySystem({
      createEnemy: (enemyId, pathIndex, opts) => this.createEnemy(enemyId, pathIndex, opts),
      awardMoney: (amt) => this.awardMoney(amt),
      damageBase: (amt) => this.damageBase(amt),
      log: (msg) => this.log(msg),
    });
    this._waveSystem = new WaveSystem({
      createWave: (waveNumber) => this._data.createWave(waveNumber, this._rng, this.map, this.modeDef, this.modifierState),
      spawnEnemy: (enemyId, pathIndex, opts) => this.spawnEnemy(enemyId, pathIndex, opts),
      awardMoney: (amt) => this.awardMoney(amt),
      log: (msg) => this.log(msg),
      getMode: () => this.modeDef,
      onVictory: (mode) => this.winRun(mode),
      state: this.state,
      world: this.world,
    });
  }

  newRun(mapId, modeId, modifierIds = []) {
    const mapDef = this._data.mapDefs.find((m) => m.id === mapId) ?? this._data.mapDefs[0];
    const modeDef =
      (this._data.modeDefs || []).find((m) => m.id === modeId) ?? (this._data.modeDefs || [])[0] ?? { id: "endless", name: "Endless" };
    const modifiers = (modifierIds || [])
      .map((id) => (this._data.modifierDefs || []).find((m) => m.id === id))
      .filter(Boolean);
    this.map = new MapInstance(mapDef);
    this.pathInfos = this.map.paths.map((p) => buildPathInfo(p));
    this.modeDef = modeDef;
    this.modifiers = modifiers;
    this.modifierState = aggregateModifiers(modifiers);
    this.world.modifiers = this.modifierState;

    this.world.towers.length = 0;
    this.world.enemies.length = 0;
    this.world.allies.length = 0;
    this.world.projectiles.length = 0;
    this.world.vfx.length = 0;
    this._towerByTile = new Map();
    this._waveSystem.reset?.();

    this.state.mode = "playing";
    this.state.paused = false;
    const baseMoney = mapDef.startingMoney ?? 150;
    const baseLives = mapDef.startingLives ?? 20;
    this.state.money = Math.max(0, Math.round((baseMoney + this.modifierState.start.moneyAdd) * this.modifierState.start.moneyMul));
    this.state.lives = Math.max(1, Math.round((baseLives + this.modifierState.start.livesAdd) * this.modifierState.start.livesMul));
    this.state.waveNumber = 0;
    this.state.autoNextWave = false;
    this.state.gameModeId = modeDef?.id ?? null;
    this.state.selectedTowerId = null;
    this.state.buildTowerId = null;
    this.state.inWave = false;
    this.state.time = 0;

    const modLabel = modifiers.length ? ` | Mods: ${modifiers.map((m) => m.name).join(", ")}` : "";
    this.log(`New run: ${this.map.name} — ${modeDef?.name || "Endless"}${modLabel}`);
    this._syncUi();
  }

  log(message) {
    this.ui?.log?.(message);
  }

  awardMoney(amount) {
    this.state.money += Math.max(0, Math.round(amount));
  }

  damageBase(amount) {
    this.state.lives -= Math.max(0, Math.round(amount));
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.gameOver("Your base fell.");
    }
  }

  gameOver(reason) {
    if (this.state.mode === "gameover") return;
    this.state.mode = "gameover";
    this.state.paused = false;
    this.ui?.showGameOver?.(reason);
  }

  winRun(mode) {
    if (this.state.mode === "gameover") return;
    this.state.mode = "gameover";
    this.state.paused = false;
    const name = mode?.name || "Victory";
    this.ui?.showGameOverWithTitle?.("Victory!", `Final boss defeated. ${name} complete.`);
  }

  togglePause() {
    if (this.state.mode !== "playing") return;
    this.state.paused = !this.state.paused;
    this.log(this.state.paused ? "Paused." : "Unpaused.");
  }

  spawnEnemy(enemyId, pathIndex = 0, opts = {}) {
    const enemy = this.createEnemy(enemyId, pathIndex, opts);
    this.world.enemies.push(enemy);
    return enemy;
  }

  createEnemy(enemyId, pathIndex = 0, opts = {}) {
    const def = this._data.enemyDefs[enemyId];
    if (!def) throw new Error(`Unknown enemyId: ${enemyId}`);
    const idx = Math.max(0, Math.min(this.pathInfos.length - 1, pathIndex));
    const enemy = new Enemy(def, this.pathInfos[idx], opts);
    enemy.pathIndex = idx;
    applyEnemyModifiers(enemy, this.modifierState);
    return enemy;
  }

  spawnAlly(tower, stats, ability) {
    const summon = ability?.summon;
    if (!summon || !this.pathInfos.length) return false;
    const summonRange = ability.radius ?? stats.range ?? 120;
    const candidates = this._findPathPointsInRange(tower.x, tower.y, summonRange);
    const fallback = this._findNearestPathPoint(tower.x, tower.y);
    if (!fallback && !candidates.length) return false;
    let count = Math.max(1, ability.count ?? 1);
    const spawnOffset = summon.spawnOffset ?? 0;
    const towerDef = this._data.towerDefs[tower.defId];

    const cap = summon.cap ?? ability.summonCap ?? stats.summonCap ?? null;
    if (cap != null && cap > 0) {
      const owned = this.world.allies.filter((a) => a.alive && a.sourceTowerId === tower.id);
      if (owned.length >= cap) {
        const removeCount = Math.min(count, owned.length);
        owned.sort((a, b) => b.age - a.age);
        for (let i = 0; i < removeCount; i++) owned[i]._alive = false;
        this.world.allies = this.world.allies.filter((a) => a.alive);
      }
      const nowOwned = this.world.allies.filter((a) => a.alive && a.sourceTowerId === tower.id);
      count = Math.max(0, Math.min(count, cap - nowOwned.length));
      if (count <= 0) return false;
    }

    const pathCycleSize = candidates.length;
    let pathCycleIndex = tower._summonPathIndex ?? 0;

    for (let i = 0; i < count; i++) {
      const pick = pathCycleSize
        ? candidates[(pathCycleIndex + i) % pathCycleSize]
        : fallback;
      if (!pick) break;
      const pathInfo = this.pathInfos[pick.pathIndex];
      const allyDef = {
        id: summon.id || "summoned",
        name: summon.name || "Ally",
        hp: summon.hp ?? 40,
        speed: summon.speed ?? 60,
        range: summon.range ?? 100,
        fireRate: summon.fireRate ?? 1,
        damage: summon.damage ?? 6,
        damageType: summon.damageType ?? stats.damageType,
        projectileSpeed: summon.projectileSpeed ?? stats.projectileSpeed,
        splashRadius: summon.splashRadius ?? 0,
        onHitEffects: summon.onHitEffects || [],
        bonusTags: summon.bonusTags || null,
        bonusMult: summon.bonusMult ?? 1,
        chain: summon.chain || null,
        radius: summon.radius ?? 8,
        lifetime: summon.lifetime ?? 16,
        color: summon.color ?? towerDef?.color ?? "#34d399",
      };
      const ally = new Ally(allyDef, pathInfo, {
        segIndex: pick.segIndex,
        segT: Math.max(0, Math.min(1, pick.segT + spawnOffset * (i + 1))),
        sourceTowerId: tower.id,
      });
      this.world.allies.push(ally);
    }
    if (pathCycleSize) tower._summonPathIndex = (pathCycleIndex + count) % pathCycleSize;
    return true;
  }

  _findNearestPathPoint(x, y) {
    let best = null;
    for (let i = 0; i < this.pathInfos.length; i++) {
      const hit = findClosestPathPoint(this.pathInfos[i], x, y);
      if (!hit) continue;
      if (!best || hit.dist2 < best.dist2) {
        best = { ...hit, pathIndex: i };
      }
    }
    return best;
  }

  _findPathPointsInRange(x, y, range) {
    const r2 = Math.max(0, range) ** 2;
    const hits = [];
    for (let i = 0; i < this.pathInfos.length; i++) {
      const hit = findClosestPathPoint(this.pathInfos[i], x, y);
      if (!hit) continue;
      if (hit.dist2 <= r2) hits.push({ ...hit, pathIndex: i });
    }
    return hits;
  }

  getTowerCost(def) {
    const base = def?.cost ?? 0;
    const mul = this.modifierState?.tower?.costMul ?? 1;
    return Math.max(0, Math.round(base * mul));
  }

  getUpgradeCost(upgrade) {
    const base = upgrade?.cost ?? 0;
    const mul = this.modifierState?.tower?.upgradeCostMul ?? 1;
    return Math.max(0, Math.round(base * mul));
  }

  placeTower(towerId, tx, ty) {
    if (!this.map?.isBuildableTile(tx, ty)) return { ok: false, reason: "Not buildable" };
    if (this._towerByTile.has(tileKey(tx, ty))) return { ok: false, reason: "Occupied" };
    const def = this._data.towerDefs[towerId];
    if (!def) return { ok: false, reason: "Unknown tower" };
    const cost = this.getTowerCost(def);
    if (this.state.money < cost) return { ok: false, reason: "Not enough money" };

    const pos = this.map.tileToWorldCenter(tx, ty);
    const tower = new Tower(def, tx, ty, pos);
    this.world.towers.push(tower);
    this._towerByTile.set(tileKey(tx, ty), tower);

    this.state.money -= cost;
    this.state.selectedTowerId = tower.id;
    this.log(`Built ${def.name} (-${cost}g).`);
    return { ok: true, tower };
  }

  getSelectedTower() {
    if (!this.state.selectedTowerId) return null;
    return this.world.towers.find((t) => t.id === this.state.selectedTowerId) ?? null;
  }

  sellSelectedTower() {
    const tower = this.getSelectedTower();
    if (!tower) return false;
    const def = this._data.towerDefs[tower.defId];
    if (!def) return false;

    let spent = this.getTowerCost(def);
    for (const up of def.upgrades || []) {
      if (tower.appliedUpgrades.has(up.id)) spent += this.getUpgradeCost(up);
    }
    const refund = Math.floor(spent * 0.7);

    this.world.towers = this.world.towers.filter((t) => t !== tower);
    this._towerByTile.delete(tileKey(tower.tx, tower.ty));
    this.state.selectedTowerId = null;
    this.state.money += refund;
    this.log(`Sold ${def.name} (+${refund}g).`);
    return true;
  }

  buyUpgrade(upgradeId) {
    const tower = this.getSelectedTower();
    if (!tower) return { ok: false, reason: "No tower selected" };
    const def = this._data.towerDefs[tower.defId];
    if (!def) return { ok: false, reason: "Unknown tower" };
    const up = (def.upgrades || []).find((u) => u.id === upgradeId);
    if (!up) return { ok: false, reason: "Unknown upgrade" };
    if (tower.appliedUpgrades.has(up.id)) return { ok: false, reason: "Already owned" };
    const cost = this.getUpgradeCost(up);
    if (this.state.money < cost) return { ok: false, reason: "Not enough money" };
    for (const req of up.requires || []) {
      if (!tower.appliedUpgrades.has(req)) return { ok: false, reason: "Missing prerequisite" };
    }
    for (const ex of up.excludes || []) {
      if (tower.appliedUpgrades.has(ex)) return { ok: false, reason: "Conflicts with owned upgrade" };
    }
    tower.applyUpgrade(up);
    this.state.money -= cost;
    this.log(`Upgrade: ${up.name} (-${cost}g).`);
    return { ok: true };
  }

  setTowerTargetingOverride(towerId, modeOrNull) {
    const tower = this.world.towers.find((t) => t.id === towerId);
    if (!tower) return false;
    tower.targetingOverride = modeOrNull;
    return true;
  }

  startNextWave() {
    if (this.state.mode !== "playing") return false;
    return this._waveSystem.startNextWave();
  }

  toggleAuto() {
    this.state.autoNextWave = !this.state.autoNextWave;
    this.log(this.state.autoNextWave ? "Auto waves: ON" : "Auto waves: OFF");
  }

  step(dt) {
    // UI + input always runs (even while paused), but simulation is gated.
    this._handleInput();

    if (this.state.mode !== "playing") {
      this._syncUi();
      return;
    }

    if (!this.state.paused) {
      this.state.time += dt;
      this._waveSystem.update(dt);
      this._auraSystem.update(this.world);
      this._towerSystem.update(dt, this.world);
      this._allySystem.update(dt, this.world);
      this._projectileSystem.update(dt, this.world);
      this._enemySystem.update(dt, this.world);
      this._vfxSystem.update(dt, this.world);
    }

    this.state.inWave = this._waveSystem.active;
    this._syncUi();
  }

  render() {
    this._computeUiRenderState();
    this.renderer.render({
      map: this.map,
      world: this.world,
      state: this.state,
      ui: this._uiRenderState,
    });
  }

  _handleInput() {
    if (this._input.consumePressed("KeyH")) this.ui?.toggleTutorial?.();
    if (this.ui?.isTutorialOpen?.()) {
      if (this._input.consumePressed("Escape")) this.ui?.hideTutorial?.();
      this._input.consumeClicks();
      return;
    }
    if (this._input.consumePressed("KeyP")) this.togglePause();
    if (this._input.consumePressed("Space")) this.startNextWave();
    if (this._input.consumePressed("ArrowLeft")) this._cycleBuild(-1);
    if (this._input.consumePressed("ArrowRight")) this._cycleBuild(1);
    if (this._input.consumePressed("Enter")) this._toggleBuild();
    if (this._input.consumePressed("KeyB")) {
      this.state.buildTowerId = null;
      this.state.selectedTowerId = null;
    }
    if (this._input.consumePressed("Escape")) {
      this.state.buildTowerId = null;
      this.state.selectedTowerId = null;
    }
    if (this._input.consumePressed("KeyQ")) this.sellSelectedTower();
    if (this._input.consumePressed("KeyA")) this._buyFirstAvailableUpgrade();

    const clicks = this._input.consumeClicks();
    for (const c of clicks) this._handleClick(c);
  }

  _towerBuildList() {
    // Stable ordering based on insertion order in the data file.
    return Object.keys(this._data.towerDefs);
  }

  _cycleBuild(dir) {
    if (this.state.mode !== "playing") return;
    const ids = this._towerBuildList();
    if (!ids.length) return;
    const cur = this.state.buildTowerId;
    const idx = cur ? ids.indexOf(cur) : -1;
    const next = idx === -1 ? (dir > 0 ? 0 : ids.length - 1) : (idx + dir + ids.length) % ids.length;
    this.state.buildTowerId = ids[next];
  }

  _toggleBuild() {
    if (this.state.mode !== "playing") return;
    if (this.state.buildTowerId) this.state.buildTowerId = null;
    else this.state.buildTowerId = this._towerBuildList()[0] ?? null;
  }

  _buyFirstAvailableUpgrade() {
    const tower = this.getSelectedTower();
    if (!tower) return;
    const def = this._data.towerDefs[tower.defId];
    if (!def) return;
    const affordable = (def.upgrades || [])
      .filter((u) => !tower.appliedUpgrades.has(u.id))
      .filter((u) => this.state.money >= this.getUpgradeCost(u))
      .filter((u) => (u.requires || []).every((r) => tower.appliedUpgrades.has(r)))
      .filter((u) => (u.excludes || []).every((x) => !tower.appliedUpgrades.has(x)));
    if (!affordable.length) return;
    affordable.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || this.getUpgradeCost(a) - this.getUpgradeCost(b));
    this.buyUpgrade(affordable[0].id);
  }

  _handleClick(c) {
    if (this.state.mode !== "playing") return;
    if (!this.map) return;
    const { tx, ty } = this.map.worldToTile(c.x, c.y);

    if (c.button === "right") {
      this.state.buildTowerId = null;
      this.state.selectedTowerId = null;
      return;
    }

    // Build mode
    if (this.state.buildTowerId) {
      this.placeTower(this.state.buildTowerId, tx, ty);
      return;
    }

    // Select tower at tile
    const tower = this._towerByTile.get(tileKey(tx, ty)) || null;
    this.state.selectedTowerId = tower?.id ?? null;
  }

  _computeUiRenderState() {
    const ghost = { x: 0, y: 0, ok: false, range: null };
    if (this.state.mode === "playing" && this.map && this.state.buildTowerId && this._input.mouse.inside) {
      const { tx, ty } = this.map.worldToTile(this._input.mouse.x, this._input.mouse.y);
      const pos = this.map.tileToWorldCenter(tx, ty);
      ghost.x = pos.x;
      ghost.y = pos.y;
      ghost.ok = this.map.isBuildableTile(tx, ty) && !this._towerByTile.has(tileKey(tx, ty));
      const def = this._data.towerDefs[this.state.buildTowerId];
      const baseRange = def?.stats?.range ?? null;
      const rangeMul = this.modifierState?.tower?.rangeMul ?? 1;
      ghost.range = baseRange != null ? baseRange * rangeMul : null;
      ghost.towerId = this.state.buildTowerId;
      this._uiRenderState.ghost = ghost;
      return;
    }
    this._uiRenderState.ghost = null;
  }

  _syncUi() {
    this.ui?.setStats?.({
      money: this.state.money,
      lives: this.state.lives,
      wave: this.state.waveNumber,
      inWave: this.state.inWave,
      auto: this.state.autoNextWave,
      threat: this._waveSystem.waveMeta?.threat ?? null,
      waveGoal: this.modeDef?.totalWaves ?? null,
    });
    this.ui?.setActiveModifiers?.(this.modifierState?.names || []);

    const selected = this.getSelectedTower();
    if (!selected) {
      this.ui?.setSelected?.(null);
    } else {
      const def = this._data.towerDefs[selected.defId];
      const stats = def ? selected.computeStats(def, { modifiers: this.modifierState }) : null;
      this.ui?.setSelected?.({ tower: selected, def, stats });
    }

    this.ui?.setWavePreview?.(this._waveSystem.waveMeta);
    this.ui?.setBuildSelection?.(this.state.buildTowerId);
  }

  // Used by the Playwright-based loop to “see” the game without graphics.
  renderGameToText() {
    const selected = this.getSelectedTower();
    const payload = {
      coord: "origin top-left; x right; y down; units = canvas px",
      mode: this.state.mode,
      paused: this.state.paused,
      seed: this.state.seed,
      money: this.state.money,
      lives: this.state.lives,
      wave_cleared: this.state.waveNumber,
      wave_active: this.state.inWave,
      build_selection: this.state.buildTowerId,
      game_mode: this.modeDef
        ? {
            id: this.modeDef.id,
            name: this.modeDef.name,
            waveGoal: this.modeDef.totalWaves ?? null,
          }
        : null,
      modifiers: this.modifierState?.ids?.length ? [...this.modifierState.ids] : [],
      modifier_names: this.modifierState?.names?.length ? [...this.modifierState.names] : [],
      map: this.map ? { id: this.map.id, name: this.map.name } : null,
      selected: selected
        ? {
            id: selected.id,
            towerId: selected.defId,
            tx: selected.tx,
            ty: selected.ty,
            upgrades: [...selected.appliedUpgrades],
            targetingOverride: selected.targetingOverride ?? null,
          }
        : null,
      towers: this.world.towers.map((t) => ({
        id: t.id,
        towerId: t.defId,
        tx: t.tx,
        ty: t.ty,
        targetingOverride: t.targetingOverride ?? null,
      })),
      allies: this.world.allies.map((a) => ({
        id: a.id,
        hp: Math.round(a.hp),
        maxHp: a.maxHp,
        x: Math.round(a.x),
        y: Math.round(a.y),
        p: Math.round(a.progress01 * 1000) / 1000,
      })),
      enemies: this.world.enemies
        .filter((e) => e.alive)
        .map((e) => ({
          id: e.id,
          enemyId: e.defId,
          hp: Math.round(e.hp),
          maxHp: e.maxHp,
          x: Math.round(e.x),
          y: Math.round(e.y),
          p: Math.round(e.progress01 * 1000) / 1000,
          fx: e.effects.map((fx) => fx.type),
        })),
    };
    const boss = this.world.enemies.find((e) => e.alive && e.tags?.has?.("boss"));
    if (boss?._pendingAbilities?.length) {
      const cast = boss._pendingAbilities[0];
      payload.boss_cast = {
        label: cast.label || "Ability",
        remaining: Math.round(cast.remaining * 10) / 10,
        total: Math.round((cast.total ?? 0) * 10) / 10,
      };
    }
    return JSON.stringify(payload);
  }
}
