export class EnemySystem {
  constructor({ createEnemy, awardMoney, damageBase, log, onFinalBossDeath }) {
    this._createEnemy = createEnemy;
    this._awardMoney = awardMoney;
    this._damageBase = damageBase;
    this._log = log;
    this._onFinalBossDeath = onFinalBossDeath;
  }

  update(dt, world) {
    const spawnedOnDeath = [];
    const abilitySpawns = [];
    const survivors = [];

    for (const enemy of world.enemies) {
      const { reachedBase } = enemy.update(dt);

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

      this._handleAbilities(enemy, dt, world, abilitySpawns);

      if (reachedBase) {
        this._damageBase(enemy.damageToBase);
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
          this._executeAbility(enemy, pending.ability, world, abilitySpawns);
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
        enemy._pendingAbilities.push({
          ability,
          remaining: windup,
          total: windup,
          label: ability.name || labelForAbility(ability),
        });
        this._spawnTelegraph(world, enemy.x, enemy.y, ability.radius ?? 110, ability.color ?? "rgba(231,236,255,0.5)", windup);
      } else {
        this._executeAbility(enemy, ability, world, abilitySpawns);
      }
    }
  }

  _executeAbility(enemy, ability, world, abilitySpawns) {
    const type = String(ability.type || "").toLowerCase();

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

function labelForAbility(ability) {
  const type = String(ability?.type || "").toLowerCase();
  if (type === "summon") return "Summon";
  if (type === "shield_pulse") return "Shield Pulse";
  if (type === "heal_pulse") return "Heal Pulse";
  if (type === "haste_pulse") return "Haste Pulse";
  if (type === "base_strike") return "Base Strike";
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
  };
  if (enemy.finalBossMode && byMode[enemy.finalBossMode]) return byMode[enemy.finalBossMode];
  const byBoss = {
    overlord: { core: "rgba(251,113,133,0.95)", accent: "rgba(190,24,93,0.8)" },
    colossus: { core: "rgba(96,165,250,0.95)", accent: "rgba(148,163,184,0.8)" },
    harbinger: { core: "rgba(217,70,239,0.95)", accent: "rgba(139,92,246,0.8)" },
  };
  if (enemy.finalBossId && byBoss[enemy.finalBossId]) return byBoss[enemy.finalBossId];
  return { core: "rgba(231,236,255,0.9)", accent: "rgba(148,163,184,0.7)" };
}
