export class EnemySystem {
  constructor({ createEnemy, awardMoney, damageBase, log }) {
    this._createEnemy = createEnemy;
    this._awardMoney = awardMoney;
    this._damageBase = damageBase;
    this._log = log;
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
      const windup = baseWindup > 0 && enemy.tags?.has?.("boss") ? baseWindup * 2 : baseWindup;
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
}

function labelForAbility(ability) {
  const type = String(ability?.type || "").toLowerCase();
  if (type === "summon") return "Summon";
  if (type === "shield_pulse") return "Shield Pulse";
  if (type === "heal_pulse") return "Heal Pulse";
  if (type === "haste_pulse") return "Haste Pulse";
  return "Ability";
}
