import { buildPathInfo, findClosestPathPoint } from "../world/path.js";
import { MapInstance } from "../world/Map.js";
import { Enemy } from "../world/Enemy.js";
import { Tower } from "../world/Tower.js";
import { Ally } from "../world/Ally.js";
import { aggregateModifiers, applyEnemyModifiers } from "./modifiers.js";
import { clamp } from "../core/math.js";
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
    this._seenEnemyIds = new Set();

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
      addLives: (amount) => this.addLives(amount),
    });
    this._allySystem = new AllySystem({ rng: this._rng });
    this._projectileSystem = new ProjectileSystem();
    this._vfxSystem = new VfxSystem();
    this._enemySystem = new EnemySystem({
      createEnemy: (enemyId, pathIndex, opts) => this.createEnemy(enemyId, pathIndex, opts),
      awardMoney: (amt) => this.awardMoney(amt),
      damageBase: (amt) => this.damageBase(amt),
      log: (msg) => this.log(msg),
      onFinalBossDeath: (enemy, duration) => this._handleFinalBossDeath(enemy, duration),
      onBossLeak: (enemy) => this.bossReachedBase(enemy),
    });
    this._waveSystem = new WaveSystem({
      createWave: (waveNumber) => {
        const wave = this._data.createWave(waveNumber, this._rng, this.map, this.modeDef, this.modifierState, this._seenEnemyIds);
        for (const ev of wave.events || []) this._seenEnemyIds.add(ev.enemyId);
        return wave;
      },
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
    this.world.pathInfos = this.pathInfos;

    this.world.towers.length = 0;
    this.world.enemies.length = 0;
    this.world.allies.length = 0;
    this.world.projectiles.length = 0;
    this.world.vfx.length = 0;
    this.world.settings = this.state.settings;
    this._towerByTile = new Map();
    this._waveSystem.reset?.();
    this._seenEnemyIds.clear();

    this.state.mode = "playing";
    this.state.paused = false;
    const baseMoney = mapDef.startingMoney ?? 150;
    const baseLives = mapDef.startingLives ?? 20;
    const modeStart = modeDef?.start || {};
    const modeMoney = (baseMoney + (modeStart.moneyAdd ?? 0)) * (modeStart.moneyMul ?? 1);
    const modeLives = (baseLives + (modeStart.livesAdd ?? 0)) * (modeStart.livesMul ?? 1);
    this.state.money = Math.max(0, Math.round((modeMoney + this.modifierState.start.moneyAdd) * this.modifierState.start.moneyMul));
    this.state.lives = Math.max(1, Math.round((modeLives + this.modifierState.start.livesAdd) * this.modifierState.start.livesMul));
    this.state.waveNumber = 0;
    this.state.autoNextWave = this.state.settings?.autoStartWaves ?? false;
    this.state.gameModeId = modeDef?.id ?? null;
    this.state.selectedTowerId = null;
    this.state.buildTowerId = null;
    this.state.inWave = false;
    this.state.time = 0;
    this.state.pendingVictory = null;

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

  addLives(amount) {
    const value = Math.max(0, Math.round(amount));
    if (!value) return;
    this.state.lives += value;
    this.log?.(`Base reinforced: +${value} lives.`);
  }

  damageBase(amount) {
    this.state.lives -= Math.max(0, Math.round(amount));
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.gameOver("Your base fell.");
    }
  }

  bossReachedBase(enemy) {
    if (this.state.mode !== "playing") return;
    this.state.lives = 0;
    const name = enemy?.name || "Boss";
    this.log?.(`${name} breached the base!`);
    this.gameOver("A boss reached the base.");
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

  _handleFinalBossDeath(enemy, duration = 3) {
    if (this.state.mode !== "playing") return;
    if (this.state.pendingVictory) return;
    const mode = this.modeDef;
    this.state.pendingVictory = {
      remaining: Math.max(0.6, duration),
      mode,
    };
    this.log(`${enemy.name} defeated! Victory incoming...`);
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
    const enemy = new Enemy(def, this.pathInfos[idx], { ...opts, pathIndex: idx });
    enemy.pathIndex = idx;
    applyEnemyModifiers(enemy, this.modifierState);
    if (this._seenEnemyIds) this._seenEnemyIds.add(enemyId);
    return enemy;
  }

  adminAddMoney(amount = 0) {
    const value = Number.isFinite(amount) ? amount : 0;
    this.state.money = Math.max(0, Math.round(this.state.money + value));
    this.log?.(`Admin: +${Math.round(value)}g`);
  }

  adminSetMoney(amount = 0) {
    const value = Number.isFinite(amount) ? amount : 0;
    this.state.money = Math.max(0, Math.round(value));
    this.log?.(`Admin: Money set to ${this.state.money}g`);
  }

  adminAddLives(amount = 0) {
    const value = Number.isFinite(amount) ? amount : 0;
    this.state.lives = Math.max(1, Math.round(this.state.lives + value));
    this.log?.(`Admin: +${Math.round(value)} lives`);
  }

  adminSetLives(amount = 0) {
    const value = Number.isFinite(amount) ? amount : 0;
    this.state.lives = Math.max(1, Math.round(value));
    this.log?.(`Admin: Lives set to ${this.state.lives}`);
  }

  adminSpawnEnemy(enemyId, count = 1, pathIndex = null, modConfig = null) {
    if (!enemyId || !this._data.enemyDefs[enemyId]) return false;
    if (!this.pathInfos.length) return false;
    const amount = Math.max(1, Math.round(count));
    const mod = this._buildEnemyAdminMod(modConfig);
    for (let i = 0; i < amount; i++) {
      const pick =
        pathIndex == null
          ? Math.floor(this._rng() * this.pathInfos.length)
          : Math.max(0, Math.min(this.pathInfos.length - 1, pathIndex));
      const enemy = this.spawnEnemy(enemyId, pick, {});
      this._applyEnemyAdminMod(enemy, mod);
    }
    this.log?.(`Admin: Spawned ${amount}x ${this._data.enemyDefs[enemyId].name}`);
    return true;
  }

  adminApplyEnemyModifiers(modConfig = null) {
    const mod = this._buildEnemyAdminMod(modConfig);
    for (const enemy of this.world.enemies) {
      if (!enemy.alive) continue;
      this._applyEnemyAdminMod(enemy, mod);
    }
    this.log?.("Admin: Applied modifiers to live enemies.");
  }

  adminClearEnemyEffects() {
    for (const enemy of this.world.enemies) {
      if (!enemy.alive) continue;
      enemy.effects = [];
    }
    this.log?.("Admin: Cleared enemy effects.");
  }

  adminSpawnSummons(towerDefId, count = 1, pathIndex = null) {
    const towerDef = this._data.towerDefs[towerDefId];
    if (!towerDef || !this.pathInfos.length) return false;
    const dummy = new Tower(towerDef, 0, 0, { x: 0, y: 0 });
    const stats = dummy.computeStats(towerDef, { modifiers: this.modifierState });
    const ability = stats.ability;
    if (!ability || ability.type !== "summon" || !ability.summon) return false;
    const summon = ability.summon;
    const amount = Math.max(1, Math.round(count));
    for (let i = 0; i < amount; i++) {
      const pick =
        pathIndex == null
          ? Math.floor(this._rng() * this.pathInfos.length)
          : Math.max(0, Math.min(this.pathInfos.length - 1, pathIndex));
      const pathInfo = this.pathInfos[pick];
      const segIndex = Math.max(0, pathInfo.segLens.length - 1);
      const segT = Math.max(0, Math.min(1, 1 - (summon.spawnOffset ?? 0) * (i + 1)));
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
        segIndex,
        segT,
        sourceTowerId: null,
        sourceDefId: towerDef.id,
      });
      this.world.allies.push(ally);
    }
    this.log?.(`Admin: Summoned ${amount}x ${towerDef.name} unit`);
    return true;
  }

  adminClearEnemies() {
    this.world.enemies = [];
    this.log?.("Admin: Cleared enemies.");
  }

  adminClearProjectiles() {
    this.world.projectiles = [];
    this.world.vfx = [];
    this.log?.("Admin: Cleared projectiles + VFX.");
  }

  adminResetCooldowns() {
    for (const t of this.world.towers) {
      t.cooldown = 0;
      t.abilityCooldown = 0;
    }
    for (const a of this.world.allies) {
      a.cooldown = 0;
    }
    this.log?.("Admin: Reset tower/ally cooldowns.");
  }

  _buildEnemyAdminMod(config) {
    const preset = String(config?.preset || "none");
    const mod = {
      hpMul: Number.isFinite(config?.hpMul) ? config.hpMul : 1,
      speedMul: Number.isFinite(config?.speedMul) ? config.speedMul : 1,
      eliteMult: Number.isFinite(config?.eliteMult) ? config.eliteMult : 1,
      shieldAdd: Number.isFinite(config?.shieldAdd) ? config.shieldAdd : 0,
      armorAdd: Number.isFinite(config?.armorAdd) ? config.armorAdd : 0,
      resistAdd: Number.isFinite(config?.resistAdd) ? config.resistAdd : 0,
      regenAdd: 0,
      shieldRegenAdd: 0,
      damageToBaseMul: 1,
      effects: [],
    };
    const presets = {
      fast: { speedMul: 1.5, hpMul: 0.85 },
      tanky: { hpMul: 1.8, speedMul: 0.75, armorAdd: 2 },
      shielded: { shieldAdd: 30 },
      elite: { eliteMult: 1.6, hpMul: 1.2 },
      berserk: { hpMul: 1.3, speedMul: 1.2, damageToBaseMul: 1.4 },
      arcane: { resistAdd: 0.25, hpMul: 1.1 },
      haste: { effects: [{ type: "haste", magnitude: 0.4, duration: 6 }] },
      regen: { regenAdd: 2 },
    };
    const presetData = presets[preset];
    if (presetData) {
      if (presetData.hpMul) mod.hpMul *= presetData.hpMul;
      if (presetData.speedMul) mod.speedMul *= presetData.speedMul;
      if (presetData.eliteMult) mod.eliteMult *= presetData.eliteMult;
      if (presetData.damageToBaseMul) mod.damageToBaseMul *= presetData.damageToBaseMul;
      if (presetData.shieldAdd) mod.shieldAdd += presetData.shieldAdd;
      if (presetData.armorAdd) mod.armorAdd += presetData.armorAdd;
      if (presetData.resistAdd) mod.resistAdd += presetData.resistAdd;
      if (presetData.regenAdd) mod.regenAdd += presetData.regenAdd;
      if (presetData.shieldRegenAdd) mod.shieldRegenAdd += presetData.shieldRegenAdd;
      if (presetData.effects) mod.effects.push(...presetData.effects.map((e) => ({ ...e })));
    }
    return mod;
  }

  _applyEnemyAdminMod(enemy, mod) {
    if (!enemy || !mod) return;
    if (mod.speedMul && mod.speedMul !== 1) enemy.baseSpeed *= mod.speedMul;
    if (mod.hpMul && mod.hpMul !== 1) {
      const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * mod.hpMul));
      enemy.hp = Math.min(enemy.maxHp, Math.max(1, Math.round(enemy.maxHp * ratio)));
    }
    if (mod.eliteMult && mod.eliteMult > 1) {
      enemy.tags?.add?.("elite");
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * mod.eliteMult));
      enemy.hp = enemy.maxHp;
      enemy.reward = Math.round(enemy.reward * Math.max(1, mod.eliteMult * 0.6));
      enemy.radius = Math.round(enemy.radius * Math.min(1.25, 1 + (mod.eliteMult - 1) * 0.2));
    }
    if (mod.shieldAdd) {
      enemy._maxShield = Math.max(0, (enemy._maxShield ?? 0) + mod.shieldAdd);
      enemy._shield = Math.min(enemy._maxShield, (enemy._shield ?? 0) + mod.shieldAdd);
    }
    if (mod.armorAdd) enemy.armor = Math.max(0, (enemy.armor ?? 0) + mod.armorAdd);
    if (mod.resistAdd) {
      const types = ["physical", "fire", "ice", "poison", "arcane", "lightning"];
      for (const type of types) {
        const cur = enemy.resist?.[type] ?? 0;
        if (!enemy.resist) enemy.resist = {};
        enemy.resist[type] = clamp(cur + mod.resistAdd, -0.9, 0.95);
      }
    }
    if (mod.regenAdd) enemy._regen = Math.max(0, (enemy._regen ?? 0) + mod.regenAdd);
    if (mod.shieldRegenAdd) enemy._shieldRegen = Math.max(0, (enemy._shieldRegen ?? 0) + mod.shieldRegenAdd);
    if (mod.damageToBaseMul && mod.damageToBaseMul !== 1) {
      enemy.damageToBase = Math.max(1, Math.round(enemy.damageToBase * mod.damageToBaseMul));
    }
    if (mod.effects?.length) {
      for (const fx of mod.effects) enemy.applyEffect(fx);
    }
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
        sourceDefId: tower.defId,
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
    const balanceMul = 1.3;
    const endgameMul = def?.endgame ? 5 : 1;
    return Math.max(0, Math.round(base * mul * balanceMul * endgameMul));
  }

  getUpgradeCost(upgrade) {
    const base = upgrade?.cost ?? 0;
    const mul = this.modifierState?.tower?.upgradeCostMul ?? 1;
    const balanceMul = 1.45;
    return Math.max(0, Math.round(base * mul * balanceMul));
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

  skipWave() {
    if (this.state.mode !== "playing") return false;
    return this._waveSystem.skipWave();
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
    if (this.state.pendingVictory) {
      this.state.pendingVictory.remaining = Math.max(0, this.state.pendingVictory.remaining - dt);
      if (this.state.pendingVictory.remaining <= 0 && !this.state.inWave && this.world.enemies.length === 0) {
        const mode = this.state.pendingVictory.mode;
        this.state.pendingVictory = null;
        this.winRun(mode);
      }
    }
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
    if (this._input.consumePressed("Backquote")) this.ui?.toggleAdmin?.();
    if (!this.ui?.isAdminOpen?.() && navigator.webdriver && this._input.consumePressed("KeyB")) this.ui?.toggleAdmin?.();
    if (this._input.consumePressed("KeyH")) this.ui?.toggleTutorial?.();
    if (this.ui?.isAdminOpen?.()) {
      if (this._input.consumePressed("Escape") || this._input.consumePressed("Backquote") || (navigator.webdriver && this._input.consumePressed("KeyB"))) {
        this.ui?.hideAdmin?.();
      }
      this._input.consumeClicks();
      return;
    }
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
    this._uiRenderState.settings = this.state.settings;
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
    const bossWave = Boolean(this.state.inWave && this._waveSystem.waveMeta?.hasBoss);
    const spawnPending = Boolean(this.state.inWave && this._waveSystem.hasPendingSpawns?.());
    const spawnRemaining = spawnPending ? this._waveSystem.spawnTimeRemaining?.() : 0;
    this.ui?.setStats?.({
      money: this.state.money,
      lives: this.state.lives,
      wave: this.state.waveNumber,
      inWave: this.state.inWave,
      bossWave,
      spawnPending,
      spawnRemaining,
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
    const boss = this.world.enemies.find((e) => e.alive && e.tags?.has?.("boss"));
    const payload = {
      coord: "origin top-left; x right; y down; units = canvas px",
      mode: this.state.mode,
      paused: this.state.paused,
      seed: this.state.seed,
      money: this.state.money,
      lives: this.state.lives,
      wave_cleared: this.state.waveNumber,
      wave_active: this.state.inWave,
      pending_victory: this.state.pendingVictory ? Math.round(this.state.pendingVictory.remaining * 10) / 10 : null,
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
    if (boss) {
      payload.boss = {
        id: boss.defId,
        name: boss.name,
        hp: Math.round(boss.hp),
        maxHp: boss.maxHp,
        phase: boss.phase ?? 1,
      };
    }
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
