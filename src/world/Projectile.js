import { nextId } from "../core/ids.js";

export class Projectile {
  constructor(opts) {
    this.id = nextId("proj");
    this.x = opts.x;
    this.y = opts.y;
    this.prevX = this.x;
    this.prevY = this.y;
    this.speed = opts.speed ?? 260;
    this.radius = opts.radius ?? 3;

    this.targetId = opts.targetId ?? null;
    this.targetLast = opts.targetLast ? { ...opts.targetLast } : null;

    this.damage = opts.damage ?? 5;
    this.damageType = opts.damageType ?? "physical";
    this.splashRadius = opts.splashRadius ?? 0;
    this.onHitEffects = (opts.onHitEffects || []).map((e) => ({ ...e }));

    this.sourceTowerId = opts.sourceTowerId ?? null;
    this.vfxColor = opts.vfxColor ?? "rgba(231,236,255,0.9)";

    // Chain lightning / bonus logic (optional).
    this.chain = opts.chain ? { ...opts.chain } : null; // { maxJumps, range, falloff }
    this.bonusTags = opts.bonusTags ? [...opts.bonusTags] : null;
    this.bonusMult = opts.bonusMult ?? 1;
    this.executeThreshold = typeof opts.executeThreshold === "number" ? opts.executeThreshold : null;
    this.executeMult = typeof opts.executeMult === "number" ? opts.executeMult : null;
    this._dead = false;
  }

  get dead() {
    return this._dead;
  }

  kill() {
    this._dead = true;
  }
}
