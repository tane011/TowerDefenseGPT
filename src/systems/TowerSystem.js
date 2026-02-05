import { dist2, clamp } from "../core/math.js";
import { Projectile } from "../world/Projectile.js";

function chooseTarget(stats, inRange, rng, towerX, towerY) {
  if (!inRange.length) return null;
  const mode = String(stats.targeting || "first").toLowerCase();

  if (mode === "strong" || mode === "strongest") {
    let best = inRange[0];
    for (const e of inRange) {
      const ehp = e.hp + (e.shield || 0);
      const bhp = best.hp + (best.shield || 0);
      if (ehp > bhp) best = e;
    }
    return best;
  }
  if (mode === "weakest") {
    let best = inRange[0];
    for (const e of inRange) {
      const ehp = e.hp + (e.shield || 0);
      const bhp = best.hp + (best.shield || 0);
      if (ehp < bhp) best = e;
    }
    return best;
  }
  if (mode === "closest") {
    let best = inRange[0];
    let bestD2 = dist2(towerX, towerY, best.x, best.y);
    for (const e of inRange) {
      const d2 = dist2(towerX, towerY, e.x, e.y);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }
  if (mode === "farthest") {
    let best = inRange[0];
    let bestD2 = dist2(towerX, towerY, best.x, best.y);
    for (const e of inRange) {
      const d2 = dist2(towerX, towerY, e.x, e.y);
      if (d2 > bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }
  if (mode === "last") {
    let best = inRange[0];
    for (const e of inRange) if (e.progress01 < best.progress01) best = e;
    return best;
  }
  if (mode === "random") {
    return inRange[Math.floor(rng() * inRange.length)];
  }
  // default "first": enemy with highest progress toward base.
  let best = inRange[0];
  for (const e of inRange) if (e.progress01 > best.progress01) best = e;
  return best;
}

export class TowerSystem {
  constructor({ towerDefs, rng, spawnAlly, addLives }) {
    this._towerDefs = towerDefs;
    this._rng = rng;
    this._spawnAlly = spawnAlly;
    this._addLives = addLives;
  }

  update(dt, world) {
    for (const tower of world.towers) {
      tower.stunRemaining = Math.max(0, (tower.stunRemaining ?? 0) - dt);
      tower.animRecoil = Math.max(0, tower.animRecoil - dt * 8);
      tower.animFlash = Math.max(0, tower.animFlash - dt * 10);

      const def = this._towerDefs[tower.defId];
      if (!def) continue;
      const stats = tower.computeStats(def, { modifiers: world.modifiers });

      if (tower.stunRemaining > 0) {
        tower.cooldown = Math.max(0, tower.cooldown - dt);
        tower.abilityCooldown = Math.max(0, tower.abilityCooldown - dt);
        if (tower._beamWarmup) tower._beamWarmup = 0;
        continue;
      }

      const r2 = stats.range * stats.range;
      const inRange = [];
      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        if (dist2(tower.x, tower.y, enemy.x, enemy.y) <= r2) inRange.push(enemy);
      }

      // Ability handling (separate from standard fire).
      if (stats.ability) {
        tower.abilityCooldown = Math.max(0, tower.abilityCooldown - dt);
        if (tower.abilityCooldown <= 0) {
          const triggered = this._triggerAbility(tower, stats, world, inRange);
          if (triggered) {
            const cd = Math.max(1, stats.ability.cooldown ?? 8);
            tower.abilityCooldown = cd;
            tower.animFlash = 1;
          }
        }
      }

      if (stats.aura) continue; // Support towers skip standard firing.
      if (stats.beam) {
        const target = chooseTarget(stats, inRange, this._rng, tower.x, tower.y);
        const warmupDuration = Math.max(0.2, stats.beam.warmupDuration ?? 1.6);
        const warmupMin = clamp(stats.beam.warmupMin ?? 0.35, 0.1, 1);
        const decayDuration = Math.max(0.2, stats.beam.decayDuration ?? warmupDuration * 0.8);
        if (target) {
          tower._beamWarmup = clamp((tower._beamWarmup ?? 0) + dt / warmupDuration, 0, 1);
          tower.aimAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
          const warmup = tower._beamWarmup ?? 0;
          const warmupMul = warmupMin + (1 - warmupMin) * warmup;
          const damage = Math.max(0, stats.damage) * warmupMul * dt;
          target.takeDamage(damage, stats.damageType);
          tower._beamFxTimer = (tower._beamFxTimer ?? 0) - dt;
          const effectInterval = stats.beam.effectInterval ?? 0.6;
          if (tower._beamFxTimer <= 0) {
            for (const fx of stats.onHitEffects || []) target.applyEffect(fx);
            tower._beamFxTimer = effectInterval;
          }
          world.vfx.push({
            type: "beam",
            x1: tower.x,
            y1: tower.y,
            x2: target.x,
            y2: target.y,
            color: vfxColorForDamage(stats.damageType),
            width: (stats.beam.width ?? 3) * (0.7 + 0.6 * (tower._beamWarmup ?? 0)),
            life: 0.06,
            maxLife: 0.06,
          });
        } else {
          tower._beamWarmup = clamp((tower._beamWarmup ?? 0) - dt / decayDuration, 0, 1);
        }
        continue;
      }

      tower.cooldown = Math.max(0, tower.cooldown - dt);
      if (tower.cooldown > 0) continue;
      if (stats.fireRate <= 0) continue;

      const target = chooseTarget(stats, inRange, this._rng, tower.x, tower.y);
      if (!target) continue;

      tower.aimAngle = Math.atan2(target.y - tower.y, target.x - tower.x);

      const isCrit = stats.critChance > 0 && this._rng() < stats.critChance;
      const damage = isCrit ? stats.damage * (stats.critMult ?? 2) : stats.damage;

      world.projectiles.push(
        new Projectile({
          x: tower.x,
          y: tower.y,
          speed: stats.projectileSpeed,
          targetId: target.id,
          targetLast: { x: target.x, y: target.y },
          damage,
          damageType: stats.damageType,
          splashRadius: stats.splashRadius,
          onHitEffects: stats.onHitEffects,
          sourceTowerId: tower.id,
          vfxColor: vfxColorForDamage(stats.damageType),
          chain: stats.chain ? { ...stats.chain } : null,
          bonusTags: stats.bonusTags ? [...stats.bonusTags] : null,
          bonusMult: stats.bonusMult ?? 1,
        })
      );

      tower.animRecoil = 1;
      tower.animFlash = 1;
      tower.cooldown = 1 / stats.fireRate;
    }
  }

  _triggerAbility(tower, stats, world, inRange) {
    const ability = stats.ability;
    if (!ability) return false;
    const type = String(ability.type || "nova").toLowerCase();

    if (type === "summon") {
      if (!this._spawnAlly) return false;
      const ok = this._spawnAlly(tower, stats, ability);
      if (ok) {
        world.vfx.push({
          type: "pulse",
          x: tower.x,
          y: tower.y,
          radius: ability.radius ?? 90,
          color: "rgba(52,211,153,0.7)",
          life: 0.35,
          maxLife: 0.35,
        });
      }
      return ok;
    }

    if (type === "base_heal") {
      const lives = Math.max(1, ability.lives ?? ability.heal ?? 1);
      this._addLives?.(lives);
      world.vfx.push({
        type: "pulse",
        x: tower.x,
        y: tower.y,
        radius: ability.radius ?? stats.range ?? 120,
        color: ability.color ?? "rgba(52,211,153,0.7)",
        life: 0.45,
        maxLife: 0.45,
      });
      return true;
    }

    const range = ability.range ?? stats.range;
    const range2 = range * range;
    const targets = ability.range != null
      ? world.enemies.filter((e) => e.alive && dist2(tower.x, tower.y, e.x, e.y) <= range2)
      : inRange.slice();

    if (!targets.length) return false;

    if (type === "nova") {
      const radius = ability.radius ?? range;
      const r2 = radius * radius;
      const impacted = targets.filter((e) => dist2(tower.x, tower.y, e.x, e.y) <= r2);
      if (!impacted.length) return false;
      const damage = ability.damage ?? stats.damage;
      const damageType = ability.damageType ?? stats.damageType;
      for (const e of impacted) {
        this._applyAbilityDamage(ability, e, damage, damageType);
        for (const fx of ability.effects || []) e.applyEffect(fx);
      }
      world.vfx.push({
        type: "explosion",
        x: tower.x,
        y: tower.y,
        radius: Math.max(24, radius),
        color: vfxColorForDamage(damageType),
        life: 0.45,
        maxLife: 0.45,
      });
      return true;
    }

    if (type === "volley") {
      const count = Math.max(1, ability.count ?? 3);
      const damage = ability.damage ?? stats.damage;
      const damageType = ability.damageType ?? stats.damageType;
      const projectileSpeed = ability.projectileSpeed ?? stats.projectileSpeed;
      const splashRadius = ability.splashRadius ?? 0;
      const targetingMode = normalizeTargeting(ability.targeting ?? stats.targeting);

      const pool = targets.slice();
      for (let i = 0; i < count && pool.length; i++) {
        const t = chooseTarget({ ...stats, targeting: targetingMode }, pool, this._rng, tower.x, tower.y);
        if (!t) break;
        const idx = pool.indexOf(t);
        if (idx >= 0) pool.splice(idx, 1);

        world.projectiles.push(
          new Projectile({
            x: tower.x,
            y: tower.y,
            speed: projectileSpeed,
            targetId: t.id,
            targetLast: { x: t.x, y: t.y },
            damage,
            damageType,
            splashRadius,
            onHitEffects: ability.effects || [],
            sourceTowerId: tower.id,
            vfxColor: vfxColorForDamage(damageType),
            chain: ability.chain ? { ...ability.chain } : null,
            bonusTags: ability.bonusTags ? [...ability.bonusTags] : null,
            bonusMult: ability.bonusMult ?? 1,
          })
        );
      }
      return true;
    }

    return false;
  }

  _applyAbilityDamage(ability, enemy, baseDamage, damageType) {
    let dmg = baseDamage;
    if (ability.bonusTags && ability.bonusTags.length && enemy.tags) {
      for (const tag of ability.bonusTags) {
        if (enemy.tags.has(tag)) {
          dmg *= ability.bonusMult ?? 1;
          break;
        }
      }
    }
    enemy.takeDamage(dmg, damageType);
  }
}

function vfxColorForDamage(type) {
  const t = String(type || "physical").toLowerCase();
  if (t === "fire") return "rgba(251,146,60,0.9)";
  if (t === "ice") return "rgba(96,165,250,0.9)";
  if (t === "poison") return "rgba(52,211,153,0.9)";
  if (t === "arcane") return "rgba(167,139,250,0.9)";
  if (t === "lightning") return "rgba(125,211,252,0.9)";
  return "rgba(231,236,255,0.9)";
}

function normalizeTargeting(value) {
  const v = String(value || "").toLowerCase();
  if (v === "strong") return "strongest";
  return v || "first";
}
