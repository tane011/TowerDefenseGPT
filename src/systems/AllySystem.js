import { dist2, norm } from "../core/math.js";
import { Projectile } from "../world/Projectile.js";

export class AllySystem {
  constructor({ rng }) {
    this._rng = rng;
  }

  update(dt, world) {
    if (!world.allies) return;
    const enemies = world.enemies || [];
    const towerById = new Map();
    for (const t of world.towers || []) towerById.set(t.id, t);
    const keep = [];

    for (const ally of world.allies) {
      if (!ally.alive) continue;
      const sourceTower = ally.sourceTowerId ? towerById.get(ally.sourceTowerId) : null;

      ally.animFlash = Math.max(0, ally.animFlash - dt * 6);
      ally.age += dt;
      if (ally.lifetime && ally.age >= ally.lifetime) {
        ally._alive = false;
        continue;
      }

      const targetBeforeMove = pickTarget(enemies, ally.x, ally.y, ally.range);
      if (!targetBeforeMove) {
        const move = ally.updateMove(dt);
        if (move.done) {
          ally._alive = false;
          continue;
        }
      }

      // Contact damage from enemies.
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const r = (enemy.radius ?? 10) + ally.radius;
        if (dist2(ally.x, ally.y, enemy.x, enemy.y) <= r * r) {
          const hit = ally.contactDamage ?? ally.damage * 0.35;
          if (hit > 0 && enemy.takeDamage) {
            const result = enemy.takeDamage(hit, ally.damageType);
            if (result?.dealt) sourceTower?.recordDamage?.(result.dealt);
          }
          ally._alive = false;
          ally.animFlash = Math.max(ally.animFlash, 0.4);
          break;
        }
      }
      if (!ally.alive) {
        world.vfx?.push({
          type: "pulse",
          x: ally.x,
          y: ally.y,
          radius: 22,
          color: "rgba(52,211,153,0.7)",
          life: 0.35,
          maxLife: 0.35,
        });
        continue;
      }

      // Attack
      const target = targetBeforeMove || pickTarget(enemies, ally.x, ally.y, ally.range);
      ally.cooldown = Math.max(0, ally.cooldown - dt);
      if (ally.cooldown <= 0 && ally.fireRate > 0) {
        if (target) {
          const angle = Math.atan2(target.y - ally.y, target.x - ally.x);
          ally.aimAngle = angle;
          const damage = ally.damage;
          world.projectiles.push(
            new Projectile({
              x: ally.x,
              y: ally.y,
              speed: ally.projectileSpeed,
              targetId: target.id,
              targetLast: { x: target.x, y: target.y },
              damage,
              damageType: ally.damageType,
              splashRadius: ally.splashRadius,
              onHitEffects: ally.onHitEffects,
              sourceTowerId: ally.sourceTowerId ?? null,
              vfxColor: vfxColorForDamage(ally.damageType),
              chain: ally.chain ? { ...ally.chain } : null,
              bonusTags: ally.bonusTags ? [...ally.bonusTags] : null,
              bonusMult: ally.bonusMult ?? 1,
            })
          );
          ally.animFlash = 1;
          ally.cooldown = 1 / ally.fireRate;
        }
      }

      keep.push(ally);
    }

    world.allies = keep;
  }
}

function pickTarget(enemies, x, y, range) {
  const r2 = range * range;
  let best = null;
  let bestD2 = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d2 = dist2(x, y, e.x, e.y);
    if (d2 <= r2 && d2 < bestD2) {
      best = e;
      bestD2 = d2;
    }
  }
  return best;
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
