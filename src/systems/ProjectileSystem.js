import { dist2, norm } from "../core/math.js";

export class ProjectileSystem {
  update(dt, world) {
    const byId = new Map();
    for (const e of world.enemies) byId.set(e.id, e);
    const towerById = new Map();
    for (const t of world.towers || []) towerById.set(t.id, t);

    const keep = [];
    for (const p of world.projectiles) {
      if (p.dead) continue;

      p.prevX = p.x;
      p.prevY = p.y;

      const target = p.targetId ? byId.get(p.targetId) : null;
      const tx = target?.alive ? target.x : p.targetLast?.x;
      const ty = target?.alive ? target.y : p.targetLast?.y;
      if (typeof tx !== "number" || typeof ty !== "number") {
        p.kill();
        continue;
      }
      p.targetLast = { x: tx, y: ty };

      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = p.speed * dt;
      if (d <= step + 0.1) {
        this._impact(world, p, target?.alive ? target : null, tx, ty, towerById);
        p.kill();
        continue;
      }

      const v = norm(dx, dy);
      p.x += v.x * step;
      p.y += v.y * step;
      keep.push(p);
    }

    world.projectiles = keep;
  }

  _impact(world, p, target, ix, iy, towerById) {
    const sourceTower = p.sourceTowerId ? towerById?.get(p.sourceTowerId) : null;
    const impacted = [];
    const hitIds = new Set();

    if (p.splashRadius > 0) {
      const r2 = p.splashRadius * p.splashRadius;
      for (const e of world.enemies) {
        if (!e.alive) continue;
        if (dist2(ix, iy, e.x, e.y) <= r2) impacted.push(e);
      }
    } else if (target) {
      impacted.push(target);
    }

    for (const e of impacted) {
      this._applyDamageWithBonuses(p, e, p.damage, sourceTower);
      for (const fx of p.onHitEffects) e.applyEffect(fx, p.sourceTowerId ?? null);
      hitIds.add(e.id);
    }

    // Chain lightning behavior (single-target only).
    if (p.chain && target && p.splashRadius <= 0) {
      let current = target;
      let damage = p.damage;
      const maxJumps = Math.max(0, p.chain.maxJumps ?? 0);
      const range = Math.max(10, p.chain.range ?? 70);
      const falloff = Math.max(0.35, p.chain.falloff ?? 0.7);

      for (let j = 0; j < maxJumps; j++) {
        const next = this._findChainTarget(world, current, range, hitIds);
        if (!next) break;
        damage *= falloff;
        this._applyDamageWithBonuses(p, next, damage, sourceTower);
        for (const fx of p.onHitEffects) next.applyEffect(fx, p.sourceTowerId ?? null);
        hitIds.add(next.id);
        this._spawnZap(world, current.x, current.y, next.x, next.y, p.vfxColor);
        current = next;
      }
    }

    // VFX
    if (p.splashRadius > 0) {
      this._spawnExplosion(world, ix, iy, Math.max(18, p.splashRadius), p.vfxColor);
    } else {
      this._spawnHit(world, ix, iy, 12, p.vfxColor);
    }
  }

  _applyDamageWithBonuses(p, enemy, baseDamage, sourceTower) {
    let dmg = baseDamage;
    if (p.bonusTags && p.bonusTags.length && enemy.tags) {
      for (const tag of p.bonusTags) {
        if (enemy.tags.has(tag)) {
          dmg *= p.bonusMult ?? 1;
          break;
        }
      }
    }
    if (p.executeThreshold != null && p.executeMult != null && enemy.maxHp > 0) {
      const pct = enemy.hp / enemy.maxHp;
      if (pct <= p.executeThreshold) dmg *= p.executeMult;
    }
    const result = enemy.takeDamage(dmg, p.damageType);
    if (result?.dealt) sourceTower?.recordDamage?.(result.dealt);
  }

  _findChainTarget(world, from, range, hitIds) {
    const r2 = range * range;
    let best = null;
    let bestD2 = Infinity;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      if (hitIds.has(e.id)) continue;
      const d2 = dist2(from.x, from.y, e.x, e.y);
      if (d2 <= r2 && d2 < bestD2) {
        best = e;
        bestD2 = d2;
      }
    }
    return best;
  }

  _spawnExplosion(world, x, y, radius, color) {
    world.vfx.push({
      type: "explosion",
      x,
      y,
      radius,
      color,
      life: 0.35,
      maxLife: 0.35,
    });
  }

  _spawnHit(world, x, y, radius, color) {
    world.vfx.push({
      type: "hit",
      x,
      y,
      radius,
      color,
      life: 0.2,
      maxLife: 0.2,
    });
  }

  _spawnZap(world, x1, y1, x2, y2, color) {
    world.vfx.push({
      type: "zap",
      x1,
      y1,
      x2,
      y2,
      color,
      life: 0.15,
      maxLife: 0.15,
    });
  }
}
