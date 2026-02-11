import { buildPathInfo, findClosestPathPoint } from "../world/path.js";
import { MapInstance } from "../world/Map.js";
import { Enemy } from "../world/Enemy.js";
import { Tower } from "../world/Tower.js";
import { Ally } from "../world/Ally.js";
import { Projectile } from "../world/Projectile.js";
import { aggregateModifiers, applyEnemyModifiers } from "./modifiers.js";
import { clamp } from "../core/math.js";
import { ensureNextId } from "../core/ids.js";
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

function resolveMapModePair(mapDefs, modeDefs, mapId, modeId) {
  if (!mapDefs?.length || !modeDefs?.length) {
    return { mapId: mapDefs?.[0]?.id ?? mapId ?? null, modeId: modeDefs?.[0]?.id ?? modeId ?? null };
  }
  const mapById = new Map(mapDefs.map((m) => [m.id, m]));
  const modeById = new Map(modeDefs.map((m) => [m.id, m]));
  const mapIds = new Set(mapDefs.map((m) => m.id));
  const currentMapId = mapById.has(mapId) ? mapId : mapDefs[0]?.id ?? null;
  const currentModeId = modeById.has(modeId) ? modeId : modeDefs[0]?.id ?? null;
  const currentMode = modeById.get(currentModeId);
  const required = currentMode?.requiredMap && mapIds.has(currentMode.requiredMap) ? currentMode.requiredMap : "";
  if (required) return { mapId: required, modeId: currentMode.id };
  return { mapId: currentMapId, modeId: currentMode?.id ?? currentModeId };
}

function parseIdNumber(id) {
  if (typeof id !== "string") return null;
  const match = /_(\d+)$/.exec(id);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

export class Game {
  constructor({ canvas, bossCanvas, input, data, rng, state, ui, unlocks }) {
    this._canvas = canvas;
    this._input = input;
    this._data = data;
    this._rng = rng;
    this.state = state;
    this.ui = ui;
    this._unlocks = unlocks;

    this.map = null;
    this.pathInfos = [];
    this.modeDef = null;
    this.world = { towers: [], enemies: [], allies: [], projectiles: [], vfx: [], modifiers: null };
    this._towerByTile = new Map();
    this._seenEnemyIds = new Set();
    this._upgradeParentById = new Map();
    for (const def of Object.values(this._data.towerDefs || {})) {
      for (const up of def?.upgrades || []) {
        if (up?.id) this._upgradeParentById.set(up.id, def);
      }
    }

    this._uiRenderState = { ghost: null };
    this.modifiers = [];
    this.modifierState = aggregateModifiers([]);

    this.renderer = new Renderer({
      canvas,
      bossCanvas,
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
      onEnemyKilled: (enemy) => this._recordRunKill(enemy),
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

  newRun(mapId, modeId, modifierIds = [], options = {}) {
    const { ignoreUnlocks = false, silent = false } = options || {};
    const baseMapDefs = this._data.mapDefs || [];
    const baseModeDefs = this._data.modeDefs || [];
    const unlockedMaps = ignoreUnlocks
      ? baseMapDefs
      : this._unlocks?.isMapUnlocked
        ? baseMapDefs.filter((m) => this._unlocks.isMapUnlocked(m.id))
        : baseMapDefs;
    const unlockedModes = ignoreUnlocks
      ? baseModeDefs
      : this._unlocks?.isModeUnlocked
        ? baseModeDefs.filter((m) => this._unlocks.isModeUnlocked(m.id))
        : baseModeDefs;
    const mapDefs = unlockedMaps.length ? unlockedMaps : baseMapDefs;
    const modeDefs = unlockedModes.length ? unlockedModes : baseModeDefs;
    const resolved = resolveMapModePair(mapDefs, modeDefs, mapId, modeId);
    let mapDef = mapDefs.find((m) => m.id === resolved.mapId) ?? mapDefs[0];
    let modeDef =
      modeDefs.find((m) => m.id === resolved.modeId) ?? modeDefs[0] ?? { id: "endless", name: "Endless" };
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
    this._resetRunStats();

    const modLabel = modifiers.length ? ` | Mods: ${modifiers.map((m) => m.name).join(", ")}` : "";
    if (!silent) {
      this.log(`New run: ${this.map.name} — ${modeDef?.name || "Endless"}${modLabel}`);
    }
    this._syncUi();
  }

  _resetRunStats() {
    this.state.runStats = {
      damageDealt: 0,
      kills: 0,
    };
  }

  _recordRunDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!this.state.runStats) this._resetRunStats();
    this.state.runStats.damageDealt = (this.state.runStats.damageDealt || 0) + amount;
  }

  _recordRunKill() {
    if (!this.state.runStats) this._resetRunStats();
    this.state.runStats.kills = (this.state.runStats.kills || 0) + 1;
  }

  _attachTowerDamageTracker(tower) {
    if (!tower || tower._tracksRunDamage) return;
    const original = typeof tower.recordDamage === "function" ? tower.recordDamage.bind(tower) : null;
    tower.recordDamage = (amount) => {
      original?.(amount);
      this._recordRunDamage(amount);
    };
    tower._tracksRunDamage = true;
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
    if (this.state.debugInvincible) return;
    this.state.lives -= Math.max(0, Math.round(amount));
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.gameOver("Your base fell.");
    }
  }

  bossReachedBase(enemy) {
    if (this.state.mode !== "playing") return;
    if (this.state.debugInvincible) {
      this.log?.("Admin: Base is invincible.");
      return;
    }
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
    const enemy = new Enemy(def, this.pathInfos[idx], {
      ...opts,
      pathIndex: idx,
      reportDamage: (amount, towerId) => {
        if (!towerId || !Number.isFinite(amount) || amount <= 0) return;
        const tower = this.world.towers.find((t) => t.id === towerId);
        tower?.recordDamage?.(amount);
      },
    });
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

  adminSetTimeScale(scale = 1) {
    const value = Number.parseFloat(scale);
    if (!Number.isFinite(value)) return false;
    const clamped = clamp(value, 0.25, 4);
    this.state.timeScale = clamped;
    this.log?.(`Admin: Time scale ${clamped}x`);
    return true;
  }

  adminSetInvincible(enabled) {
    this.state.debugInvincible = Boolean(enabled);
    this.log?.(`Admin: Base invincible ${this.state.debugInvincible ? "ON" : "OFF"}.`);
  }

  adminSetWave(nextWave = 1, { clearEnemies = true, clearProjectiles = true } = {}) {
    if (this.state.mode !== "playing") return false;
    const target = Math.max(1, Math.round(nextWave));
    const maxWave = this.modeDef?.totalWaves ?? null;
    const clamped = maxWave ? Math.min(target, maxWave) : target;
    this._waveSystem.reset();
    this.state.inWave = false;
    this.state.waveNumber = Math.max(0, clamped - 1);
    this.state.pendingVictory = null;
    if (clearEnemies) this.world.enemies = [];
    if (clearProjectiles) {
      this.world.projectiles = [];
      this.world.vfx = [];
    }
    this.log?.(`Admin: Next wave set to ${clamped}.`);
    return true;
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

  adminClearAllies() {
    this.world.allies = [];
    this.log?.("Admin: Cleared allies.");
  }

  adminClearTowers() {
    this.world.towers = [];
    this._towerByTile = new Map();
    this.state.selectedTowerId = null;
    this.log?.("Admin: Cleared towers.");
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

  adminClearAll() {
    this.world.enemies = [];
    this.world.allies = [];
    this.world.projectiles = [];
    this.world.vfx = [];
    this.world.towers = [];
    this._towerByTile = new Map();
    this.state.selectedTowerId = null;
    this.log?.("Admin: Cleared all entities.");
  }

  adminForceCompleteWave({ clearEnemies = true } = {}) {
    if (this.state.mode !== "playing") return false;
    if (!this._waveSystem.active) {
      this.log?.("Admin: No active wave to complete.");
      return false;
    }
    const waveNum = this.state.waveNumber + 1;
    const bonus = this._waveSystem.waveMeta?.rewardBonus ?? 0;
    this._waveSystem.active = false;
    this._waveSystem._events = [];
    this._waveSystem._time = 0;
    this._waveSystem._autoDelay = 0.75;
    if (clearEnemies) this.world.enemies = [];
    this.state.inWave = false;
    this.state.waveNumber = waveNum;
    if (bonus > 0) this.awardMoney(bonus);
    this.log?.(`Admin: Wave ${waveNum} completed (+${bonus}g).`);
    if (this.state.settings?.pauseOnWaveEnd) {
      this.state.paused = true;
      this.log?.("Paused: wave cleared.");
    }
    const mode = this.modeDef;
    if (mode?.totalWaves && waveNum >= mode.totalWaves) {
      if (!this.state.pendingVictory) this.winRun(mode);
    }
    return true;
  }

  adminSkipBossWave({ clearEnemies = true } = {}) {
    if (this.state.mode !== "playing") return false;
    if (!this._waveSystem.active) {
      this.log?.("Admin: No active wave to skip.");
      return false;
    }
    if (!this._waveSystem.waveMeta?.hasBoss) {
      this.log?.("Admin: Current wave is not a boss wave.");
      return false;
    }
    return this.adminForceCompleteWave({ clearEnemies });
  }

  adminMaxSelectedTower() {
    const tower = this.getSelectedTower();
    if (!tower) {
      this.log?.("Admin: No tower selected.");
      return false;
    }
    const def = this._data.towerDefs[tower.defId];
    if (!def) return false;
    const upgrades = [...(def.upgrades || [])];
    upgrades.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || this.getUpgradeCost(a) - this.getUpgradeCost(b));
    let applied = 0;
    let progress = true;
    let safety = 0;
    while (progress && safety < 100) {
      progress = false;
      safety += 1;
      for (const up of upgrades) {
        if (tower.appliedUpgrades.has(up.id)) continue;
        if ((up.requires || []).some((r) => !tower.appliedUpgrades.has(r))) continue;
        if ((up.excludes || []).some((x) => tower.appliedUpgrades.has(x))) continue;
        tower.applyUpgrade(up);
        tower.totalCost = (tower.totalCost ?? 0) + this.getUpgradeCost(up);
        applied += 1;
        progress = true;
      }
    }
    if (!applied) {
      this.log?.(`Admin: ${def.name} already at max or no upgrades available.`);
      return false;
    }
    this.log?.(`Admin: Maxed ${def.name} (+${applied} upgrades).`);
    return true;
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

  getTowerBaseStats(def) {
    if (!def) return null;
    if (!this._previewTowers) this._previewTowers = new Map();
    let preview = this._previewTowers.get(def.id);
    if (!preview) {
      preview = new Tower(def, 0, 0, { x: 0, y: 0 });
      this._previewTowers.set(def.id, preview);
    }
    preview.appliedUpgrades.clear();
    preview.resetBuffs();
    preview.targetingOverride = null;
    return preview.computeStats(def, { modifiers: this.modifierState });
  }

  getUpgradeCost(upgrade) {
    const base = upgrade?.cost ?? 0;
    const mul = this.modifierState?.tower?.upgradeCostMul ?? 1;
    const balanceMul = 1.05;
    const tier = upgrade?.tier ?? 1;
    const tierMul = tier <= 1 ? 0.6 : tier === 2 ? 0.8 : tier === 3 ? 0.9 : 1.0;
    const parent = this._upgradeParentById?.get(upgrade?.id);
    let endgameMul = 1;
    if (parent?.endgame) {
      endgameMul = tier <= 1 ? 1.4 : tier === 2 ? 1.9 : tier === 3 ? 2.4 : 3.0;
    }
    return Math.max(0, Math.round(base * mul * balanceMul * tierMul * endgameMul));
  }

  placeTower(towerId, tx, ty) {
    if (!this.map?.isBuildableTile(tx, ty)) return { ok: false, reason: "Not buildable" };
    if (this._towerByTile.has(tileKey(tx, ty))) return { ok: false, reason: "Occupied" };
    const def = this._data.towerDefs[towerId];
    if (!def) return { ok: false, reason: "Unknown tower" };
    if (this._unlocks?.isTowerUnlocked && !this._unlocks.isTowerUnlocked(towerId)) {
      this.log?.(`Locked: ${def.name}. Unlock it in the shop.`);
      return { ok: false, reason: "Locked" };
    }
    const cost = this.getTowerCost(def);
    if (this.state.money < cost) return { ok: false, reason: "Not enough money" };

    const pos = this.map.tileToWorldCenter(tx, ty);
    const tower = new Tower(def, tx, ty, pos);
    tower.totalCost = cost;
    this._attachTowerDamageTracker(tower);
    this.world.towers.push(tower);
    this._towerByTile.set(tileKey(tx, ty), tower);

    this.state.money -= cost;
    if (this.state.settings?.autoSelectBuilt !== false) {
      this.state.selectedTowerId = tower.id;
    } else {
      this.state.selectedTowerId = null;
    }
    if (this.state.settings?.keepBuildMode === false) {
      this.state.buildTowerId = null;
    }
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
    tower.totalCost = (tower.totalCost ?? 0) + cost;
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

  _getTimeScale() {
    const raw = Number.parseFloat(this.state.timeScale);
    if (!Number.isFinite(raw)) return 1;
    return clamp(raw, 0.25, 4);
  }

  step(dt, options = {}) {
    // UI + input always runs (even while paused), but simulation is gated.
    this._handleInput();

    if (this.state.mode !== "playing") {
      this._syncUi();
      return;
    }

    const timeScale = options.ignoreTimeScale ? 1 : this._getTimeScale();
    const scaledDt = dt * timeScale;

    if (!this.state.paused) {
      this.state.time += scaledDt;
      this._waveSystem.update(scaledDt);
      this._auraSystem.update(this.world);
      this._towerSystem.update(scaledDt, this.world);
      this._allySystem.update(scaledDt, this.world);
      this._projectileSystem.update(scaledDt, this.world);
      this._enemySystem.update(scaledDt, this.world);
      this._vfxSystem.update(scaledDt, this.world);
    }

    this.state.inWave = this._waveSystem.active;
    if (this.state.pendingVictory) {
      this.state.pendingVictory.remaining = Math.max(0, this.state.pendingVictory.remaining - scaledDt);
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
    if (this._input.consumePressed("KeyC")) this.ui?.toggleCinematicUi?.();
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
    if (this._input.consumePressed("KeyA")) this._buyUpgradeForPath(0);
    if (this._input.consumePressed("KeyS")) this._buyUpgradeForPath(1);

    const clicks = this._input.consumeClicks();
    for (const c of clicks) this._handleClick(c);
  }

  _towerBuildList() {
    // Stable ordering based on insertion order in the data file.
    const ids = Object.keys(this._data.towerDefs);
    if (this._unlocks?.isTowerUnlocked) {
      const unlocked = ids.filter((id) => this._unlocks.isTowerUnlocked(id));
      return unlocked.length ? unlocked : ids;
    }
    return ids;
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

  _buyUpgradeForPath(pathIndex) {
    const tower = this.getSelectedTower();
    if (!tower) return;
    const def = this._data.towerDefs[tower.defId];
    if (!def) return;
    const upgrades = def.upgrades || [];
    if (!upgrades.length) return;

    const upgradeById = new Map(upgrades.map((u) => [u.id, u]));
    const tierOf = (u) => (u?.tier ?? 1);
    const roots = upgrades.filter((u) => tierOf(u) === 1);

    const rootFor = (upgradeId) => {
      let current = upgradeById.get(upgradeId);
      const seen = new Set();
      while (current) {
        const req = (current.requires || []).find((r) => upgradeById.has(r));
        if (!req) break;
        if (seen.has(req)) break;
        seen.add(req);
        current = upgradeById.get(req);
      }
      return current;
    };

    const ownedRoots = new Set();
    for (const id of tower.appliedUpgrades) {
      const root = rootFor(id);
      if (root) ownedRoots.add(root.id);
    }

    // After a path is chosen, both keys should progress the same path.
    let activeRootId = ownedRoots.size ? [...ownedRoots][0] : null;
    if (!activeRootId && roots.length) {
      const fallbackRoot = roots[pathIndex] ?? roots[0];
      activeRootId = fallbackRoot?.id ?? null;
    }

    const rootMatches = (up) => {
      if (!activeRootId) return true;
      const root = rootFor(up.id);
      return root?.id === activeRootId;
    };

    const affordable = upgrades
      .filter((u) => !tower.appliedUpgrades.has(u.id))
      .filter((u) => rootMatches(u))
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
    this._uiRenderState.modeInfo = this.modeDef
      ? {
          id: this.modeDef.id,
          name: this.modeDef.name,
          bossEvery: this.modeDef.bossEvery ?? null,
          totalWaves: this.modeDef.totalWaves ?? null,
          finalBoss: this.modeDef.finalBoss ?? null,
        }
      : null;
    const spawnPending = Boolean(this.state.inWave && this._waveSystem.hasPendingSpawns?.());
    const spawnRemaining = spawnPending ? this._waveSystem.spawnTimeRemaining?.() : 0;
    const spawnTotal = this.state.inWave ? this._waveSystem.spawnTimeTotal?.() : 0;
    this._uiRenderState.status = {
      wave: this.state.waveNumber,
      waveGoal: this.modeDef?.totalWaves ?? null,
      threat: this._waveSystem.waveMeta?.threat ?? null,
      inWave: this.state.inWave,
      paused: this.state.paused,
      auto: this.state.autoNextWave,
      spawnPending,
      spawnRemaining,
      spawnTotal,
      modifiersCount: this.modifierState?.names?.length ?? 0,
    };
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
    const displayWave = this.state.waveNumber + (this.state.inWave ? 1 : 0);
    this.ui?.setStats?.({
      money: this.state.money,
      lives: this.state.lives,
      wave: displayWave,
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
    this.ui?.setAdminStats?.({
      map: this.map?.name ?? "-",
      mode: this.modeDef?.name ?? "-",
      wave: displayWave,
      waveGoal: this.modeDef?.totalWaves ?? null,
      inWave: this.state.inWave,
      time: this.state.time,
      threat: this._waveSystem.waveMeta?.threat ?? null,
      paused: this.state.paused,
      auto: this.state.autoNextWave,
      timeScale: this._getTimeScale(),
      invincible: this.state.debugInvincible,
      counts: {
        towers: this.world.towers.length,
        enemies: this.world.enemies.length,
        allies: this.world.allies.length,
        projectiles: this.world.projectiles.length,
        vfx: this.world.vfx.length,
      },
      seed: this.state.seed,
    });
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

  exportRunState() {
    if (!this.map || !this.modeDef || this.state.mode === "menu") return null;
    const rngState = this._rng?.state
      ? { seed: this._rng.state.seed, calls: this._rng.state.calls }
      : null;
    const wave = this._waveSystem
      ? {
          active: Boolean(this._waveSystem.active),
          time: this._waveSystem._time ?? 0,
          events: Array.isArray(this._waveSystem._events)
            ? this._waveSystem._events.map((ev) => ({
                t: ev.t,
                enemyId: ev.enemyId,
                pathIndex: ev.pathIndex ?? 0,
                opts: ev.opts ? { ...ev.opts } : null,
              }))
            : [],
          meta: this._waveSystem._waveMeta ? { ...this._waveSystem._waveMeta } : null,
          spawnTimeTotal: this._waveSystem._spawnTimeTotal ?? 0,
          autoDelay: this._waveSystem._autoDelay ?? 0,
        }
      : null;

    return {
      version: 1,
      ts: Date.now(),
      rng: rngState,
      map: this.map ? { id: this.map.id, name: this.map.name } : null,
      mode: this.modeDef ? { id: this.modeDef.id, name: this.modeDef.name } : null,
      modifiers: (this.modifiers || []).map((m) => m.id),
      state: {
        mode: this.state.mode,
        paused: this.state.paused,
        time: this.state.time,
        money: this.state.money,
        lives: this.state.lives,
        waveNumber: this.state.waveNumber,
        autoNextWave: this.state.autoNextWave,
        inWave: this.state.inWave,
        pendingVictory: this.state.pendingVictory ? this.state.pendingVictory.remaining : null,
        buildTowerId: this.state.buildTowerId,
        selectedTowerId: this.state.selectedTowerId,
        timeScale: this.state.timeScale,
        debugInvincible: this.state.debugInvincible,
        runStats: this.state.runStats
          ? {
              damageDealt: this.state.runStats.damageDealt ?? 0,
              kills: this.state.runStats.kills ?? 0,
            }
          : { damageDealt: 0, kills: 0 },
      },
      wave,
      seenEnemyIds: [...(this._seenEnemyIds || [])],
      world: {
        towers: this.world.towers.map((t) => this._serializeTower(t)),
        enemies: this.world.enemies.map((e) => this._serializeEnemy(e)),
        allies: this.world.allies.map((a) => this._serializeAlly(a)),
        projectiles: this.world.projectiles.map((p) => this._serializeProjectile(p)),
      },
    };
  }

  importRunState(payload) {
    if (!payload || typeof payload !== "object") return false;
    const mapId = payload.map?.id || payload.mapId;
    const modeId = payload.mode?.id || payload.modeId;
    if (!mapId || !modeId) return false;
    const modifiers = Array.isArray(payload.modifiers) ? payload.modifiers : [];

    this.newRun(mapId, modeId, modifiers, { ignoreUnlocks: true, silent: true });
    if (!this.map || this.map.id !== mapId) return false;
    if (!this.modeDef || this.modeDef.id !== modeId) return false;

    if (payload.rng && this._rng?.reset) {
      this._rng.reset(payload.rng.seed, payload.rng.calls ?? 0);
      if (Number.isFinite(payload.rng.seed)) this.state.seed = payload.rng.seed;
    }

    this._seenEnemyIds = new Set(Array.isArray(payload.seenEnemyIds) ? payload.seenEnemyIds : []);

    this.world.towers = [];
    this.world.enemies = [];
    this.world.allies = [];
    this.world.projectiles = [];
    this.world.vfx = [];
    this._towerByTile = new Map();

    let maxId = 0;
    const updateMaxId = (id) => {
      const num = parseIdNumber(id);
      if (num != null && num > maxId) maxId = num;
    };

    for (const t of payload.world?.towers || []) {
      const tower = this._deserializeTower(t);
      if (!tower) continue;
      this.world.towers.push(tower);
      this._towerByTile.set(tileKey(tower.tx, tower.ty), tower);
      updateMaxId(tower.id);
    }

    for (const e of payload.world?.enemies || []) {
      const enemy = this._deserializeEnemy(e);
      if (!enemy) continue;
      this.world.enemies.push(enemy);
      updateMaxId(enemy.id);
    }

    for (const a of payload.world?.allies || []) {
      const ally = this._deserializeAlly(a);
      if (!ally) continue;
      this.world.allies.push(ally);
      updateMaxId(ally.id);
    }

    for (const p of payload.world?.projectiles || []) {
      const proj = this._deserializeProjectile(p);
      if (!proj) continue;
      this.world.projectiles.push(proj);
      updateMaxId(proj.id);
    }

    ensureNextId(maxId + 1);

    if (this._waveSystem) {
      const wave = payload.wave || {};
      this._waveSystem.active = Boolean(wave.active);
      this._waveSystem._time = Number.isFinite(wave.time) ? wave.time : 0;
      this._waveSystem._events = Array.isArray(wave.events)
        ? wave.events.map((ev) => ({
            t: ev.t ?? 0,
            enemyId: ev.enemyId,
            pathIndex: ev.pathIndex ?? 0,
            opts: ev.opts ? { ...ev.opts } : null,
          }))
        : [];
      this._waveSystem._waveMeta = wave.meta ? { ...wave.meta } : null;
      this._waveSystem._spawnTimeTotal = Number.isFinite(wave.spawnTimeTotal)
        ? wave.spawnTimeTotal
        : this._waveSystem._events.length
          ? this._waveSystem._events[this._waveSystem._events.length - 1].t ?? 0
          : 0;
      this._waveSystem._autoDelay = Number.isFinite(wave.autoDelay) ? wave.autoDelay : 0;
    }

    const s = payload.state || {};
    this.state.mode = s.mode || "playing";
    this.state.paused = Boolean(s.paused);
    this.state.time = Number.isFinite(s.time) ? s.time : 0;
    this.state.money = Number.isFinite(s.money) ? Math.max(0, Math.round(s.money)) : this.state.money;
    this.state.lives = Number.isFinite(s.lives) ? Math.max(1, Math.round(s.lives)) : this.state.lives;
    this.state.waveNumber = Number.isFinite(s.waveNumber) ? Math.max(0, Math.round(s.waveNumber)) : 0;
    this.state.autoNextWave = Boolean(s.autoNextWave);
    this.state.inWave = Boolean(s.inWave ?? this._waveSystem?.active);
    this.state.pendingVictory =
      s.pendingVictory != null ? { remaining: Math.max(0, s.pendingVictory), mode: this.modeDef } : null;
    this.state.buildTowerId = s.buildTowerId ?? null;
    this.state.selectedTowerId = s.selectedTowerId ?? null;
    this.state.timeScale = Number.isFinite(s.timeScale) ? clamp(s.timeScale, 0.25, 4) : this.state.timeScale;
    this.state.debugInvincible = Boolean(s.debugInvincible);
    this.state.gameModeId = this.modeDef?.id ?? this.state.gameModeId;
    const runStats = s.runStats || {};
    this.state.runStats = {
      damageDealt: Number.isFinite(runStats.damageDealt) ? runStats.damageDealt : 0,
      kills: Number.isFinite(runStats.kills) ? Math.max(0, Math.round(runStats.kills)) : 0,
    };

    if (this.state.buildTowerId && !this._data.towerDefs?.[this.state.buildTowerId]) {
      this.state.buildTowerId = null;
    }
    if (this.state.selectedTowerId) {
      const found = this.world.towers.some((t) => t.id === this.state.selectedTowerId);
      if (!found) this.state.selectedTowerId = null;
    }

    this.world.modifiers = this.modifierState;
    this.world.pathInfos = this.pathInfos;
    this.world.settings = this.state.settings;
    this._uiRenderState.ghost = null;
    this._syncUi();
    return true;
  }

  _serializeTower(tower) {
    return {
      id: tower.id,
      defId: tower.defId,
      tx: tower.tx,
      ty: tower.ty,
      x: tower.x,
      y: tower.y,
      cooldown: tower.cooldown,
      abilityCooldown: tower.abilityCooldown,
      appliedUpgrades: [...(tower.appliedUpgrades || [])],
      totalCost: tower.totalCost ?? 0,
      totalDamage: tower.totalDamage ?? 0,
      targetingOverride: tower.targetingOverride ?? null,
      aimAngle: tower.aimAngle ?? 0,
      animRecoil: tower.animRecoil ?? 0,
      animFlash: tower.animFlash ?? 0,
      stunRemaining: tower.stunRemaining ?? 0,
      beamWarmup: tower._beamWarmup ?? 0,
      beamTargetId: tower._beamTargetId ?? null,
      beamFxTimer: tower._beamFxTimer ?? 0,
      summonPathIndex: tower._summonPathIndex ?? 0,
    };
  }

  _deserializeTower(data) {
    if (!data || !data.defId) return null;
    const def = this._data.towerDefs?.[data.defId];
    if (!def) return null;
    const tx = Number.isFinite(data.tx) ? data.tx : 0;
    const ty = Number.isFinite(data.ty) ? data.ty : 0;
    const pos = this.map?.tileToWorldCenter(tx, ty) || { x: data.x ?? 0, y: data.y ?? 0 };
    const tower = new Tower(def, tx, ty, pos);
    if (data.id) tower.id = data.id;
    if (Number.isFinite(data.x)) tower.x = data.x;
    if (Number.isFinite(data.y)) tower.y = data.y;
    tower.cooldown = Number.isFinite(data.cooldown) ? data.cooldown : 0;
    tower.abilityCooldown = Number.isFinite(data.abilityCooldown) ? data.abilityCooldown : 0;
    tower.appliedUpgrades = new Set(Array.isArray(data.appliedUpgrades) ? data.appliedUpgrades : []);
    tower.totalCost = Number.isFinite(data.totalCost) ? data.totalCost : 0;
    tower.totalDamage = Number.isFinite(data.totalDamage) ? data.totalDamage : 0;
    tower.targetingOverride = data.targetingOverride ?? null;
    tower.aimAngle = Number.isFinite(data.aimAngle) ? data.aimAngle : 0;
    tower.animRecoil = Number.isFinite(data.animRecoil) ? data.animRecoil : 0;
    tower.animFlash = Number.isFinite(data.animFlash) ? data.animFlash : 0;
    tower.stunRemaining = Number.isFinite(data.stunRemaining) ? data.stunRemaining : 0;
    tower._beamWarmup = Number.isFinite(data.beamWarmup) ? data.beamWarmup : 0;
    tower._beamTargetId = data.beamTargetId ?? null;
    tower._beamFxTimer = Number.isFinite(data.beamFxTimer) ? data.beamFxTimer : 0;
    tower._summonPathIndex = Number.isFinite(data.summonPathIndex) ? data.summonPathIndex : 0;
    this._attachTowerDamageTracker(tower);
    return tower;
  }

  _serializeEnemy(enemy) {
    return {
      id: enemy.id,
      defId: enemy.defId,
      name: enemy.name,
      maxHp: enemy.maxHp,
      hp: enemy.hp,
      baseSpeed: enemy.baseSpeed,
      armor: enemy.armor,
      resist: enemy.resist ? { ...enemy.resist } : null,
      reward: enemy.reward,
      damageToBase: enemy.damageToBase,
      contactDamage: enemy.contactDamage,
      radius: enemy.radius,
      tags: enemy.tags ? [...enemy.tags] : [],
      ability: enemy.ability ? { ...enemy.ability } : null,
      abilities: enemy.abilities ? enemy.abilities.map((a) => ({ ...a })) : [],
      onDeathSpawn: enemy.onDeathSpawn ? { ...enemy.onDeathSpawn } : null,
      pathIndex: enemy.pathIndex ?? 0,
      segIndex: enemy.segIndex ?? 0,
      segT: enemy.segT ?? 0,
      progress01: enemy.progress01 ?? 0,
      x: enemy.x,
      y: enemy.y,
      shield: enemy._shield ?? 0,
      maxShield: enemy._maxShield ?? 0,
      isFinalBoss: enemy.isFinalBoss ?? false,
      finalBossMode: enemy.finalBossMode ?? null,
      finalBossId: enemy.finalBossId ?? null,
      phase: enemy.phase ?? 1,
      phase2Triggered: enemy._phase2Triggered ?? false,
      phase2Threshold: enemy._phase2Threshold ?? 0,
      phase2Transition: enemy._phase2Transition ? { ...enemy._phase2Transition } : null,
      invulnerableTime: enemy._invulnerableTime ?? 0,
      phase2Ready: enemy._phase2Ready ?? false,
      phase2Afterglow: enemy._phase2Afterglow ?? false,
      phase2AfterglowTime: enemy._phase2AfterglowTime ?? 0,
      effects: enemy.effects ? enemy.effects.map((e) => ({ ...e })) : [],
      slowResist: enemy._slowResist ?? 0,
      stunResist: enemy._stunResist ?? 0,
      regen: enemy._regen ?? 0,
      shieldRegen: enemy._shieldRegen ?? 0,
      rage: enemy._rage ? { ...enemy._rage } : null,
      alive: enemy._alive ?? true,
      pendingAbilities: enemy._pendingAbilities ? enemy._pendingAbilities.map((p) => ({ ...p })) : [],
    };
  }

  _deserializeEnemy(data) {
    if (!data || !data.defId) return null;
    const pathIndex = Number.isFinite(data.pathIndex) ? data.pathIndex : 0;
    const enemy = this.createEnemy(data.defId, pathIndex, {
      segIndex: Number.isFinite(data.segIndex) ? data.segIndex : 0,
      segT: Number.isFinite(data.segT) ? data.segT : 0,
      finalBoss: Boolean(data.isFinalBoss),
      finalBossMode: data.finalBossMode ?? null,
      finalBossId: data.finalBossId ?? null,
    });
    if (data.id) enemy.id = data.id;
    enemy.name = data.name || enemy.name;
    enemy.maxHp = Number.isFinite(data.maxHp) ? data.maxHp : enemy.maxHp;
    enemy.hp = Number.isFinite(data.hp) ? data.hp : enemy.hp;
    enemy.baseSpeed = Number.isFinite(data.baseSpeed) ? data.baseSpeed : enemy.baseSpeed;
    enemy.armor = Number.isFinite(data.armor) ? data.armor : enemy.armor;
    if (data.resist && typeof data.resist === "object") enemy.resist = { ...data.resist };
    enemy.reward = Number.isFinite(data.reward) ? data.reward : enemy.reward;
    enemy.damageToBase = Number.isFinite(data.damageToBase) ? data.damageToBase : enemy.damageToBase;
    enemy.contactDamage = Number.isFinite(data.contactDamage) ? data.contactDamage : enemy.contactDamage;
    enemy.radius = Number.isFinite(data.radius) ? data.radius : enemy.radius;
    if (Array.isArray(data.tags)) enemy.tags = new Set(data.tags);
    enemy.ability = data.ability ? { ...data.ability } : enemy.ability;
    enemy.abilities = Array.isArray(data.abilities) ? data.abilities.map((a) => ({ ...a })) : enemy.abilities;
    enemy.onDeathSpawn = data.onDeathSpawn ? { ...data.onDeathSpawn } : enemy.onDeathSpawn;
    enemy.pathIndex = pathIndex;
    if (Number.isFinite(data.segIndex)) enemy.segIndex = data.segIndex;
    if (Number.isFinite(data.segT)) enemy.segT = data.segT;
    if (Number.isFinite(data.progress01)) enemy.progress01 = data.progress01;
    if (Number.isFinite(data.x)) enemy.x = data.x;
    if (Number.isFinite(data.y)) enemy.y = data.y;
    enemy._shield = Number.isFinite(data.shield) ? data.shield : enemy._shield;
    enemy._maxShield = Number.isFinite(data.maxShield) ? data.maxShield : enemy._maxShield;
    enemy.isFinalBoss = Boolean(data.isFinalBoss);
    enemy.finalBossMode = data.finalBossMode ?? enemy.finalBossMode;
    enemy.finalBossId = data.finalBossId ?? enemy.finalBossId;
    enemy.phase = Number.isFinite(data.phase) ? data.phase : enemy.phase;
    enemy._phase2Triggered = Boolean(data.phase2Triggered);
    enemy._phase2Threshold = Number.isFinite(data.phase2Threshold) ? data.phase2Threshold : enemy._phase2Threshold;
    enemy._phase2Transition = data.phase2Transition ? { ...data.phase2Transition } : null;
    enemy._invulnerableTime = Number.isFinite(data.invulnerableTime) ? data.invulnerableTime : 0;
    enemy._phase2Ready = Boolean(data.phase2Ready);
    enemy._phase2Afterglow = Boolean(data.phase2Afterglow);
    enemy._phase2AfterglowTime = Number.isFinite(data.phase2AfterglowTime) ? data.phase2AfterglowTime : 0;
    enemy.effects = Array.isArray(data.effects) ? data.effects.map((e) => ({ ...e })) : [];
    enemy._slowResist = Number.isFinite(data.slowResist) ? data.slowResist : enemy._slowResist;
    enemy._stunResist = Number.isFinite(data.stunResist) ? data.stunResist : enemy._stunResist;
    enemy._regen = Number.isFinite(data.regen) ? data.regen : enemy._regen;
    enemy._shieldRegen = Number.isFinite(data.shieldRegen) ? data.shieldRegen : enemy._shieldRegen;
    enemy._rage = data.rage ? { ...data.rage } : enemy._rage;
    enemy._alive = data.alive !== false;
    enemy._pendingAbilities = Array.isArray(data.pendingAbilities) ? data.pendingAbilities.map((p) => ({ ...p })) : [];
    return enemy;
  }

  _serializeAlly(ally) {
    const pathIndex = this.pathInfos?.indexOf(ally.pathInfo) ?? 0;
    return {
      id: ally.id,
      defId: ally.defId,
      name: ally.name,
      maxHp: ally.maxHp,
      hp: ally.hp,
      speed: ally.speed,
      range: ally.range,
      fireRate: ally.fireRate,
      damage: ally.damage,
      damageType: ally.damageType,
      projectileSpeed: ally.projectileSpeed,
      splashRadius: ally.splashRadius,
      onHitEffects: ally.onHitEffects ? ally.onHitEffects.map((e) => ({ ...e })) : [],
      bonusTags: ally.bonusTags ? [...ally.bonusTags] : null,
      bonusMult: ally.bonusMult ?? 1,
      chain: ally.chain ? { ...ally.chain } : null,
      radius: ally.radius,
      lifetime: ally.lifetime,
      color: ally.color,
      pathIndex: pathIndex >= 0 ? pathIndex : 0,
      segIndex: ally.segIndex ?? 0,
      segT: ally.segT ?? 0,
      progress01: ally.progress01 ?? 0,
      x: ally.x,
      y: ally.y,
      age: ally.age ?? 0,
      cooldown: ally.cooldown ?? 0,
      aimAngle: ally.aimAngle ?? 0,
      animFlash: ally.animFlash ?? 0,
      sourceTowerId: ally.sourceTowerId ?? null,
      sourceDefId: ally.sourceDefId ?? null,
      alive: ally._alive ?? true,
    };
  }

  _deserializeAlly(data) {
    if (!data) return null;
    const pathIndex = Number.isFinite(data.pathIndex) ? data.pathIndex : 0;
    const pathInfo = this.pathInfos?.[pathIndex] ?? this.pathInfos?.[0];
    if (!pathInfo) return null;
    const def = {
      id: data.defId || "ally",
      name: data.name || "Ally",
      hp: data.maxHp ?? 40,
      speed: data.speed ?? 60,
      range: data.range ?? 100,
      fireRate: data.fireRate ?? 1,
      damage: data.damage ?? 6,
      damageType: data.damageType ?? "physical",
      projectileSpeed: data.projectileSpeed ?? 220,
      splashRadius: data.splashRadius ?? 0,
      onHitEffects: Array.isArray(data.onHitEffects) ? data.onHitEffects.map((e) => ({ ...e })) : [],
      bonusTags: Array.isArray(data.bonusTags) ? [...data.bonusTags] : null,
      bonusMult: data.bonusMult ?? 1,
      chain: data.chain ? { ...data.chain } : null,
      radius: data.radius ?? 8,
      lifetime: data.lifetime ?? 16,
      color: data.color ?? "rgba(52,211,153,0.9)",
    };
    const ally = new Ally(def, pathInfo, {
      segIndex: Number.isFinite(data.segIndex) ? data.segIndex : 0,
      segT: Number.isFinite(data.segT) ? data.segT : 0,
      sourceTowerId: data.sourceTowerId ?? null,
      sourceDefId: data.sourceDefId ?? null,
    });
    if (data.id) ally.id = data.id;
    ally.hp = Number.isFinite(data.hp) ? data.hp : ally.hp;
    ally.maxHp = Number.isFinite(data.maxHp) ? data.maxHp : ally.maxHp;
    ally.progress01 = Number.isFinite(data.progress01) ? data.progress01 : ally.progress01;
    if (Number.isFinite(data.x)) ally.x = data.x;
    if (Number.isFinite(data.y)) ally.y = data.y;
    ally.age = Number.isFinite(data.age) ? data.age : ally.age;
    ally.cooldown = Number.isFinite(data.cooldown) ? data.cooldown : ally.cooldown;
    ally.aimAngle = Number.isFinite(data.aimAngle) ? data.aimAngle : ally.aimAngle;
    ally.animFlash = Number.isFinite(data.animFlash) ? data.animFlash : ally.animFlash;
    ally._alive = data.alive !== false;
    return ally;
  }

  _serializeProjectile(projectile) {
    return {
      id: projectile.id,
      x: projectile.x,
      y: projectile.y,
      prevX: projectile.prevX,
      prevY: projectile.prevY,
      speed: projectile.speed,
      radius: projectile.radius,
      targetId: projectile.targetId ?? null,
      targetLast: projectile.targetLast ? { ...projectile.targetLast } : null,
      damage: projectile.damage,
      damageType: projectile.damageType,
      splashRadius: projectile.splashRadius,
      onHitEffects: projectile.onHitEffects ? projectile.onHitEffects.map((e) => ({ ...e })) : [],
      sourceTowerId: projectile.sourceTowerId ?? null,
      vfxColor: projectile.vfxColor,
      chain: projectile.chain ? { ...projectile.chain } : null,
      bonusTags: projectile.bonusTags ? [...projectile.bonusTags] : null,
      bonusMult: projectile.bonusMult ?? 1,
      executeThreshold: projectile.executeThreshold ?? null,
      executeMult: projectile.executeMult ?? null,
      dead: projectile._dead ?? false,
    };
  }

  _deserializeProjectile(data) {
    if (!data) return null;
    const proj = new Projectile({
      x: data.x ?? 0,
      y: data.y ?? 0,
      speed: data.speed ?? 260,
      radius: data.radius ?? 3,
      targetId: data.targetId ?? null,
      targetLast: data.targetLast ? { ...data.targetLast } : null,
      damage: data.damage ?? 5,
      damageType: data.damageType ?? "physical",
      splashRadius: data.splashRadius ?? 0,
      onHitEffects: Array.isArray(data.onHitEffects) ? data.onHitEffects.map((e) => ({ ...e })) : [],
      sourceTowerId: data.sourceTowerId ?? null,
      vfxColor: data.vfxColor ?? "rgba(231,236,255,0.9)",
      chain: data.chain ? { ...data.chain } : null,
      bonusTags: Array.isArray(data.bonusTags) ? [...data.bonusTags] : null,
      bonusMult: data.bonusMult ?? 1,
      executeThreshold: data.executeThreshold ?? null,
      executeMult: data.executeMult ?? null,
    });
    if (data.id) proj.id = data.id;
    proj.prevX = Number.isFinite(data.prevX) ? data.prevX : proj.prevX;
    proj.prevY = Number.isFinite(data.prevY) ? data.prevY : proj.prevY;
    if (data.dead) proj.kill();
    return proj;
  }
}
