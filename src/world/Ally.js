import { nextId } from "../core/ids.js";
import { advanceAlongPath, pathProgress01, samplePath } from "./path.js";

export class Ally {
  constructor(def, pathInfo, opts = {}) {
    this.id = nextId("ally");
    this.defId = def.id || "ally";
    this.name = def.name || "Ally";

    this.maxHp = def.hp ?? 40;
    this.hp = this.maxHp;
    this.speed = def.speed ?? 60;
    this.range = def.range ?? 100;
    this.fireRate = def.fireRate ?? 1;
    this.damage = def.damage ?? 6;
    this.damageType = def.damageType ?? "physical";
    this.projectileSpeed = def.projectileSpeed ?? 220;
    this.splashRadius = def.splashRadius ?? 0;
    this.onHitEffects = def.onHitEffects ? def.onHitEffects.map((e) => ({ ...e })) : [];
    this.bonusTags = def.bonusTags ? [...def.bonusTags] : null;
    this.bonusMult = def.bonusMult ?? 1;
    this.chain = def.chain ? { ...def.chain } : null;
    this.radius = def.radius ?? 8;
    this.lifetime = def.lifetime ?? 16;
    this.color = def.color ?? "rgba(52,211,153,0.9)";

    this.pathInfo = pathInfo;
    this.segIndex = opts.segIndex ?? 0;
    this.segT = opts.segT ?? 0;
    this.progress01 = 0;

    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;

    this.age = 0;
    this.cooldown = 0;
    this.aimAngle = 0;
    this.animFlash = 0;
    this._alive = true;
    this.sourceTowerId = opts.sourceTowerId ?? null;
  }

  get alive() {
    return this._alive;
  }

  takeDamage(amount) {
    if (!this._alive) return false;
    this.hp -= Math.max(0, amount);
    if (this.hp <= 0) {
      this.hp = 0;
      this._alive = false;
      return true;
    }
    return false;
  }

  updateMove(dt) {
    if (!this._alive) return { done: false };
    const next = advanceAlongPath(this.pathInfo, this.segIndex, this.segT, this.speed * dt);
    this.segIndex = next.segIndex;
    this.segT = next.segT;
    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;
    this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);
    return next;
  }
}
