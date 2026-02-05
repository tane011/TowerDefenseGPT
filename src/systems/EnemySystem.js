import { clamp } from "../core/math.js";

export class EnemySystem {
  constructor({ createEnemy, awardMoney, damageBase, log, onFinalBossDeath, onBossLeak }) {
    this._createEnemy = createEnemy;
    this._awardMoney = awardMoney;
    this._damageBase = damageBase;
    this._log = log;
    this._onFinalBossDeath = onFinalBossDeath;
    this._onBossLeak = onBossLeak;
  }

  update(dt, world) {
    const spawnedOnDeath = [];
    const abilitySpawns = [];
    const survivors = [];

    for (const enemy of world.enemies) {
      const { reachedBase, phaseShifted, phaseStage } = enemy.update(dt);

      if (!enemy.alive) {
        this._awardMoney(enemy.reward);
        world.vfx?.push({
          type: "explosion",
          x: enemy.x,
          y: enemy.y,
          radius: Math.max(18, (enemy.radius ?? 10) * 2),
          color: enemy.tags?.has?.("boss") ? "rgba(251,113,133,0.8)" : "rgba(231,236,255,0.7)",
          life: 0.3,
          maxLife: 0.3,
        });
        if (enemy.isFinalBoss) {
          const duration = this._spawnFinalBossDeath(world, enemy);
          this._onFinalBossDeath?.(enemy, duration);
        }
        if (enemy.onDeathSpawn) {
          const cfg = enemy.onDeathSpawn;
          for (let i = 0; i < cfg.count; i++) {
            spawnedOnDeath.push(
              this._createEnemy(cfg.enemyId, cfg.pathIndex ?? enemy.pathIndex, {
                segIndex: enemy.segIndex,
                segT: enemy.segT,
                eliteMult: cfg.eliteMult ?? 1,
              })
            );
          }
        }
        continue;
      }

      if (phaseShifted || phaseStage) {
        if (phaseStage === "start") {
          this._spawnPhaseShift(world, enemy, "start");
          if (enemy.tags?.has?.("boss")) {
            this._log?.(`${enemy.name} becomes untouchable and begins to shift!`);
          }
        } else if (phaseStage === "complete") {
          if (enemy._phase2?.jumpToStart) this._jumpBossToStart(world, enemy);
          enemy.completePhase2Transition?.();
          this._spawnPhaseShift(world, enemy, "complete");
          if (enemy.tags?.has?.("boss")) {
            this._log?.(`${enemy.name} returns to the front and reveals new powers!`);
          }
        }
      } else {
        this._handleAbilities(enemy, dt, world, abilitySpawns);
      }

      if (reachedBase) {
        if (enemy.tags?.has?.("boss")) {
          this._onBossLeak?.(enemy);
        } else {
          this._damageBase(enemy.damageToBase);
        }
        continue;
      }

      survivors.push(enemy);
    }

    world.enemies = survivors;
    for (const e of spawnedOnDeath) world.enemies.push(e);
    for (const e of abilitySpawns) world.enemies.push(e);
  }

  _handleAbilities(enemy, dt, world, abilitySpawns) {
    const abilities = enemy.abilities || [];
    if (!abilities.length) return;

    if (!enemy._pendingAbilities) enemy._pendingAbilities = [];
    if (enemy._pendingAbilities.length) {
      const pendingNext = [];
      for (const pending of enemy._pendingAbilities) {
        pending.remaining -= dt;
        if (pending.remaining <= 0) {
          this._executeAbility(enemy, pending.ability, world, abilitySpawns, pending);
        } else {
          pendingNext.push(pending);
        }
      }
      enemy._pendingAbilities = pendingNext;
    }

    for (const ability of abilities) {
      ability.timer -= dt;
      if (ability.timer > 0) continue;
      ability.timer = Math.max(1, ability.cooldown ?? 8);
      const baseWindup = ability.windup ?? 0;
      const windup = baseWindup > 0 && enemy.tags?.has?.("boss") ? baseWindup * 2.6 : baseWindup;
      if (windup > 0) {
        const pending = {
          ability,
          remaining: windup,
          total: windup,
          label: ability.name || labelForAbility(ability),
          desc: ability.description || null,
          target: null,
        };
        if (String(ability.type || "").toLowerCase() === "lane_jump") {
          const target = this._getLaneJumpTarget(enemy, world, ability);
          if (target) {
            pending.target = target;
            this._spawnTelegraph(
              world,
              target.x,
              target.y,
              ability.telegraphRadius ?? ability.radius ?? 110,
              ability.color ?? "rgba(231,236,255,0.5)",
              windup
            );
          } else {
            this._spawnTelegraph(world, enemy.x, enemy.y, ability.radius ?? 110, ability.color ?? "rgba(231,236,255,0.5)", windup);
          }
        } else {
          this._spawnTelegraph(world, enemy.x, enemy.y, ability.radius ?? 110, ability.color ?? "rgba(231,236,255,0.5)", windup);
        }
        enemy._pendingAbilities.push(pending);
      } else {
        this._executeAbility(enemy, ability, world, abilitySpawns, null);
      }
    }
  }

  _executeAbility(enemy, ability, world, abilitySpawns, pending = null) {
    const type = String(ability.type || "").toLowerCase();

    if (type === "blink") {
      const distance = ability.distance ?? 120;
      enemy.advanceBy(distance);
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 70, ability.color ?? "rgba(56,189,248,0.75)");
      return;
    }

    if (type === "phase_cloak") {
      const duration = ability.duration ?? 2.4;
      const mitigation = ability.mitigation ?? 0.9;
      enemy.applyEffect({ type: "phase", duration, magnitude: mitigation });
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 80, ability.color ?? "rgba(129,140,248,0.75)");
      return;
    }

    if (type === "shield_surge") {
      const radius = ability.radius ?? 110;
      const shield = ability.shield ?? 22;
      const selfShield = ability.selfShield ?? shield;
      enemy.addShield(selfShield);
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => e.addShield(shield));
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(125,211,252,0.8)");
      return;
    }

    if (type === "armor_boost") {
      const radius = ability.radius ?? 0;
      const amount = ability.armor ?? ability.magnitude ?? 4;
      const duration = ability.duration ?? 4;
      const mode = ability.mode ?? "add";
      const apply = (e) => e.applyEffect({ type: "armor_boost", magnitude: amount, duration, mode });
      if (radius > 0) this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, apply);
      else apply(enemy);
      this._spawnPulse(world, enemy.x, enemy.y, radius > 0 ? radius : 70, ability.color ?? "rgba(148,163,184,0.8)");
      return;
    }

    if (type === "overclock") {
      const magnitude = ability.magnitude ?? 0.45;
      const duration = ability.duration ?? 3.2;
      enemy.applyEffect({ type: "haste", magnitude, duration });
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 70, ability.color ?? "rgba(250,204,21,0.8)");
      return;
    }

    if (type === "rift_call") {
      const count = Math.max(1, ability.count ?? 2);
      const enemyIds = Array.isArray(ability.enemyIds) ? ability.enemyIds : [ability.enemyId || "swarm"];
      for (let i = 0; i < count; i++) {
        const pick = enemyIds[Math.floor(Math.random() * enemyIds.length)];
        abilitySpawns.push(
          this._createEnemy(pick, ability.pathIndex ?? enemy.pathIndex, {
            segIndex: enemy.segIndex,
            segT: Math.max(0, Math.min(1, enemy.segT - 0.02 * i)),
            eliteMult: ability.eliteMult ?? 1,
          })
        );
      }
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 90, ability.color ?? "rgba(167,139,250,0.75)");
      return;
    }

    if (type === "life_drain") {
      const radius = ability.radius ?? 120;
      const damage = ability.damage ?? 2;
      const heal = ability.heal ?? 60;
      const shield = ability.selfShield ?? 0;
      this._damageBase(damage);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      if (shield > 0) enemy.addShield(shield);
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(248,113,113,0.8)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} triggers ${name}!`);
      }
      return;
    }

    if (type === "stasis_burst") {
      const radius = ability.radius ?? 120;
      const duration = ability.duration ?? 1.8;
      this._forTowersInRadius(world, enemy.x, enemy.y, radius, (tower) => {
        if (tower.buffs?.stunImmune) return;
        tower.stunRemaining = Math.max(tower.stunRemaining ?? 0, duration);
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(244,114,182,0.85)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} unleashes ${name}!`);
      }
      return;
    }

    if (type === "rift_wave") {
      const radius = ability.radius ?? 160;
      const distance = ability.distance ?? 120;
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => {
        if (e === enemy) return;
        e.advanceBy(distance);
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(56,189,248,0.8)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} unleashes ${name}!`);
      }
      return;
    }

    if (type === "void_gate") {
      const count = Math.max(1, ability.count ?? 3);
      const enemyIds = Array.isArray(ability.enemyIds) ? ability.enemyIds : [ability.enemyId || "swarm"];
      for (let i = 0; i < count; i++) {
        const pick = enemyIds[Math.floor(Math.random() * enemyIds.length)];
        abilitySpawns.push(
          this._createEnemy(pick, ability.pathIndex ?? enemy.pathIndex, {
            segIndex: enemy.segIndex,
            segT: Math.max(0, Math.min(1, enemy.segT - 0.03 * i)),
            eliteMult: ability.eliteMult ?? 1,
          })
        );
      }
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 120, ability.color ?? "rgba(99,102,241,0.8)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} opens ${name}!`);
      }
      return;
    }

    if (type === "oblivion_burst") {
      const radius = ability.radius ?? 160;
      const duration = ability.duration ?? 2;
      const damage = ability.damage ?? 3;
      const shield = ability.shield ?? 50;
      this._damageBase(damage);
      this._forTowersInRadius(world, enemy.x, enemy.y, radius, (tower) => {
        if (tower.buffs?.stunImmune) return;
        tower.stunRemaining = Math.max(tower.stunRemaining ?? 0, duration);
      });
      enemy.addShield(shield);
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(217,70,239,0.85)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} unleashes ${name}!`);
      }
      return;
    }

    if (type === "collapse_pulse") {
      const radius = ability.radius ?? 170;
      const fortify = ability.fortify ?? 0.35;
      const duration = ability.duration ?? 4;
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => {
        e.effects = [];
        e.applyEffect({ type: "fortify", magnitude: fortify, duration });
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(14,165,233,0.85)");
      return;
    }

    if (type === "starfall") {
      const radius = ability.radius ?? 170;
      const damage = ability.damage ?? 3;
      const magnitude = ability.magnitude ?? 0.35;
      const duration = ability.duration ?? 3.6;
      this._damageBase(damage);
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => {
        e.applyEffect({ type: "haste", magnitude, duration });
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(251,113,133,0.85)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} calls ${name}!`);
      }
      return;
    }

    if (type === "phase_dash") {
      const distance = ability.distance ?? 150;
      const radius = ability.radius ?? 130;
      const duration = ability.duration ?? 1.4;
      enemy.advanceBy(distance);
      this._forTowersInRadius(world, enemy.x, enemy.y, radius, (tower) => {
        if (tower.buffs?.stunImmune) return;
        tower.stunRemaining = Math.max(tower.stunRemaining ?? 0, duration);
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(56,189,248,0.9)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} surges with ${name}!`);
      }
      return;
    }

    if (type === "lane_jump") {
      const paths = world?.pathInfos || [];
      if (paths.length <= 1) return;
      const target =
        pending?.target ||
        this._getLaneJumpTarget(enemy, world, ability) || {
          pathIndex: Math.max(0, Math.min(paths.length - 1, (enemy.pathIndex ?? 0) + 1)),
          progress: clamp(enemy.progress01 ?? 0, 0, 1),
          x: enemy.x,
          y: enemy.y,
        };
      if (!target || target.pathIndex == null) return;
      enemy.setPath(paths[target.pathIndex], target.pathIndex, target.progress);
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 120, ability.color ?? "rgba(56,189,248,0.9)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} uses ${name}!`);
      }
      return;
    }

    if (type === "summon") {
      const count = Math.max(1, ability.count ?? 2);
      const enemyIds = Array.isArray(ability.enemyIds) ? ability.enemyIds : [ability.enemyId || "swarm"];
      for (let i = 0; i < count; i++) {
        const pick = enemyIds[Math.floor(Math.random() * enemyIds.length)];
        abilitySpawns.push(
          this._createEnemy(pick, ability.pathIndex ?? enemy.pathIndex, {
            segIndex: enemy.segIndex,
            segT: Math.max(0, Math.min(1, enemy.segT - 0.02 * i)),
            eliteMult: ability.eliteMult ?? 1,
          })
        );
      }
      this._spawnPulse(world, enemy.x, enemy.y, ability.radius ?? 80, ability.color ?? "rgba(251,113,133,0.7)");
      return;
    }

    if (type === "shield_pulse") {
      const radius = ability.radius ?? 110;
      const shield = ability.shield ?? 16;
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => e.addShield(shield));
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(96,165,250,0.7)");
      return;
    }

    if (type === "heal_pulse") {
      const radius = ability.radius ?? 120;
      const heal = ability.heal ?? 40;
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => {
        e.hp = Math.min(e.maxHp, e.hp + heal);
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(52,211,153,0.7)");
      return;
    }

    if (type === "haste_pulse") {
      const radius = ability.radius ?? 110;
      const magnitude = ability.magnitude ?? 0.25;
      const duration = ability.duration ?? 3;
      this._forEnemiesInRadius(world, enemy.x, enemy.y, radius, (e) => {
        e.applyEffect({ type: "haste", magnitude, duration });
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(251,191,36,0.7)");
      return;
    }

    if (type === "tower_stun") {
      const radius = ability.radius ?? 120;
      const duration = ability.duration ?? 1.6;
      this._forTowersInRadius(world, enemy.x, enemy.y, radius, (tower) => {
        if (tower.buffs?.stunImmune) return;
        tower.stunRemaining = Math.max(tower.stunRemaining ?? 0, duration);
      });
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(244,114,182,0.75)");
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} unleashes ${name}!`);
      }
      return;
    }

    if (type === "base_strike") {
      const radius = ability.radius ?? 140;
      const damage = ability.damage ?? 2;
      this._spawnPulse(world, enemy.x, enemy.y, radius, ability.color ?? "rgba(248,113,113,0.8)");
      this._damageBase(damage);
      if (ability.log !== false) {
        const name = ability.name || labelForAbility(ability);
        this._log?.(`${enemy.name} unleashes ${name}!`);
      }
    }
  }

  _forEnemiesInRadius(world, x, y, radius, fn) {
    const r2 = radius * radius;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2) fn(e);
    }
  }

  _forTowersInRadius(world, x, y, radius, fn) {
    const r2 = radius * radius;
    for (const t of world.towers) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (dx * dx + dy * dy <= r2) fn(t);
    }
  }

  _spawnPulse(world, x, y, radius, color) {
    world.vfx?.push({
      type: "pulse",
      x,
      y,
      radius,
      color,
      life: 0.45,
      maxLife: 0.45,
    });
  }

  _spawnPhaseShift(world, enemy, stage = "start") {
    const radius = Math.max(120, (enemy.radius ?? 12) * 6);
    const isPhase2 = enemy.phase >= 2 || stage === "complete";
    const core = isPhase2 ? "rgba(244,114,182,0.95)" : "rgba(129,140,248,0.9)";
    const accent = isPhase2 ? "rgba(251,146,60,0.85)" : "rgba(56,189,248,0.85)";
    const life = stage === "complete" ? 0.9 : 0.7;
    world.vfx?.push({
      type: "pulse",
      x: enemy.x,
      y: enemy.y,
      radius,
      color: core,
      life,
      maxLife: life,
    });
    world.vfx?.push({
      type: "telegraph",
      x: enemy.x,
      y: enemy.y,
      radius: radius * 0.7,
      color: accent,
      life: life + 0.15,
      maxLife: life + 0.15,
    });
  }

  _jumpBossToStart(world, enemy) {
    const paths = world?.pathInfos || [];
    if (!paths.length || !enemy?.setPath) return;
    const idx = Math.max(0, Math.min(paths.length - 1, enemy.pathIndex ?? 0));
    enemy.setPath(paths[idx], idx, 0);
    this._spawnPulse(world, enemy.x, enemy.y, Math.max(100, (enemy.radius ?? 12) * 5), "rgba(14,165,233,0.85)");
  }

  _getLaneJumpTarget(enemy, world, ability) {
    const paths = world?.pathInfos || [];
    if (paths.length <= 1) return null;
    const current = Math.max(0, Math.min(paths.length - 1, enemy.pathIndex ?? 0));
    const progress = clamp(enemy.progress01 ?? 0, 0, 1);
    const minDist = ability?.minJumpDistance ?? 90;
    const currentCount = this._countEnemiesOnPath(world, current);

    const candidates = [];
    for (let i = 0; i < paths.length; i++) {
      if (i === current) continue;
      const point = pointAtProgress(paths[i], progress);
      const dx = point.x - enemy.x;
      const dy = point.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) continue;
      const count = this._countEnemiesOnPath(world, i);
      candidates.push({ pathIndex: i, progress, x: point.x, y: point.y, count, dist });
    }

    const pool = candidates.length ? candidates : this._fallbackLaneJumpCandidates(enemy, world, progress, current);
    if (!pool.length) return null;

    let maxCount = 0;
    for (const c of pool) maxCount = Math.max(maxCount, c.count);
    const filtered = pool.filter((c) => c.count >= currentCount || c.count === maxCount);

    let best = null;
    for (const c of filtered) {
      const score = c.count * 2 + (c.count >= currentCount ? 2 : 0) + c.dist * 0.01 + Math.random() * 0.2;
      if (!best || score > best.score) best = { ...c, score };
    }
    return best ? { pathIndex: best.pathIndex, progress, x: best.x, y: best.y } : null;
  }

  _fallbackLaneJumpCandidates(enemy, world, progress, current) {
    const paths = world?.pathInfos || [];
    const out = [];
    for (let i = 0; i < paths.length; i++) {
      if (i === current) continue;
      const point = pointAtProgress(paths[i], progress);
      const count = this._countEnemiesOnPath(world, i);
      const dx = point.x - enemy.x;
      const dy = point.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      out.push({ pathIndex: i, progress, x: point.x, y: point.y, count, dist });
    }
    return out;
  }

  _countEnemiesOnPath(world, pathIndex) {
    if (!world?.enemies?.length) return 0;
    let count = 0;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (e.pathIndex === pathIndex) count += 1;
    }
    return count;
  }

  _spawnTelegraph(world, x, y, radius, color, duration) {
    world.vfx?.push({
      type: "telegraph",
      x,
      y,
      radius,
      color,
      life: Math.max(0.3, duration ?? 0.8),
      maxLife: Math.max(0.3, duration ?? 0.8),
    });
  }

  _spawnFinalBossDeath(world, enemy) {
    const theme = finalBossTheme(enemy);
    const baseRadius = Math.max(160, (enemy.radius ?? 14) * 6);
    const duration = 3.2;
    world.vfx?.push({
      type: "boss_death",
      x: enemy.x,
      y: enemy.y,
      radius: baseRadius,
      color: theme.core,
      accent: theme.accent,
      life: duration,
      maxLife: duration,
      rings: 3,
      shards: 14,
    });
    world.vfx?.push({
      type: "pulse",
      x: enemy.x,
      y: enemy.y,
      radius: baseRadius * 0.65,
      color: theme.accent,
      life: duration * 0.45,
      maxLife: duration * 0.45,
    });
    return duration;
  }
}

function pointAtProgress(info, progress01) {
  const total = Math.max(1e-6, info.totalLen ?? 1);
  let remaining = clamp(progress01, 0, 1) * total;
  for (let i = 0; i < info.segLens.length; i++) {
    const segLen = info.segLens[i] || 1e-6;
    if (remaining <= segLen) {
      const t = segLen <= 0 ? 0 : remaining / segLen;
      const a = info.points[i];
      const b = info.points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLen;
  }
  const last = info.points[info.points.length - 1];
  return { x: last.x, y: last.y };
}

function labelForAbility(ability) {
  const type = String(ability?.type || "").toLowerCase();
  if (type === "summon") return "Summon";
  if (type === "blink") return "Blink";
  if (type === "phase_cloak") return "Phase Cloak";
  if (type === "shield_surge") return "Shield Surge";
  if (type === "armor_boost") return "Armor Weave";
  if (type === "overclock") return "Overclock";
  if (type === "rift_call") return "Rift Call";
  if (type === "life_drain") return "Life Drain";
  if (type === "stasis_burst") return "Stasis Burst";
  if (type === "rift_wave") return "Rift Wave";
  if (type === "void_gate") return "Void Gate";
  if (type === "oblivion_burst") return "Oblivion Burst";
  if (type === "collapse_pulse") return "Collapse Pulse";
  if (type === "starfall") return "Starfall";
  if (type === "phase_dash") return "Phase Dash";
  if (type === "lane_jump") return "Lane Rift";
  if (type === "shield_pulse") return "Shield Pulse";
  if (type === "heal_pulse") return "Heal Pulse";
  if (type === "haste_pulse") return "Haste Pulse";
  if (type === "base_strike") return "Base Strike";
  if (type === "tower_stun") return "Tower Shock";
  return "Ability";
}

function finalBossTheme(enemy) {
  const byMode = {
    expedition: { core: "rgba(96,165,250,0.95)", accent: "rgba(191,219,254,0.8)" },
    siege: { core: "rgba(251,146,60,0.95)", accent: "rgba(253,186,116,0.8)" },
    marathon: { core: "rgba(52,211,153,0.95)", accent: "rgba(110,231,183,0.8)" },
    ascension: { core: "rgba(167,139,250,0.95)", accent: "rgba(216,180,254,0.8)" },
    eclipse: { core: "rgba(248,113,113,0.95)", accent: "rgba(251,113,133,0.8)" },
    nightmare: { core: "rgba(244,114,182,0.95)", accent: "rgba(251,146,60,0.8)" },
    apocalypse: { core: "rgba(220,38,38,0.95)", accent: "rgba(251,113,113,0.8)" },
    cataclysm: { core: "rgba(99,102,241,0.95)", accent: "rgba(14,165,233,0.8)" },
  };
  if (enemy.finalBossMode && byMode[enemy.finalBossMode]) return byMode[enemy.finalBossMode];
  const byBoss = {
    overlord: { core: "rgba(251,113,133,0.95)", accent: "rgba(190,24,93,0.8)" },
    colossus: { core: "rgba(96,165,250,0.95)", accent: "rgba(148,163,184,0.8)" },
    harbinger: { core: "rgba(217,70,239,0.95)", accent: "rgba(139,92,246,0.8)" },
    void_emperor: { core: "rgba(129,140,248,0.95)", accent: "rgba(14,165,233,0.8)" },
  };
  if (enemy.finalBossId && byBoss[enemy.finalBossId]) return byBoss[enemy.finalBossId];
  return { core: "rgba(231,236,255,0.9)", accent: "rgba(148,163,184,0.7)" };
}
