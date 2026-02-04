import { clamp } from "../core/math.js";
import { nextId } from "../core/ids.js";
import { advanceAlongPath, pathProgress01, samplePath } from "./path.js";

// Enemy instances are pure state + basic behaviors (movement, damage intake).
// Higher-level orchestration (spawns, deaths, rewards) lives in systems.
export class Enemy {
  constructor(def, pathInfo, opts = {}) {
    this.id = nextId("enemy");
    this.defId = def.id;
    this.name = def.name;

    this.maxHp = def.hp;
    this.hp = def.hp;
    this.baseSpeed = def.speed; // world units/sec
    this.armor = def.armor || 0; // flat physical reduction
    this.resist = { ...(def.resist || {}) }; // { fire: 0.2, poison: -0.25, ... }

    this.reward = def.reward ?? 1;
    this.damageToBase = def.damageToBase ?? 1;
    this.contactDamage = def.contactDamage ?? 6;

    this.radius = def.radius ?? 10;
    this.tags = new Set(def.tags || []);
    if (this.tags.has("boss")) {
      const slowMul = def.bossSpeedMul ?? 0.7;
      this.baseSpeed *= slowMul;
    }

    this.ability = def.ability || null;
    this.abilities = (def.abilities || (def.ability ? [def.ability] : [])).map((a) => ({
      ...a,
      cooldown: a.cooldown ?? 8,
      timer: a.cooldown ?? 8,
    }));
    this.onDeathSpawn = def.onDeathSpawn || null;

    this.pathInfo = pathInfo;
    this.segIndex = opts.segIndex ?? 0;
    this.segT = opts.segT ?? 0;
    this.progress01 = 0;

    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;

    this._shield = def.shield ?? 0; // absorbs damage first
    this._maxShield = def.shield ?? 0;

    // Active status effects.
    // Shape: { type, duration, remaining, magnitude, tickEvery, tickTimer, mode }
    this.effects = [];

    this._slowResist = def.slowResist ?? 0; // 0..1
    this._stunResist = def.stunResist ?? 0; // 0..1
    this._regen = def.regen ?? 0; // hp per second
    this._shieldRegen = def.shieldRegen ?? 0; // shield per second
    this._rage = def.rage ?? null; // { hpPct, speedMul }

    this._alive = true;

    if (opts.eliteMult) {
      const m = opts.eliteMult;
      if (m > 1.01) this.tags.add("elite");
      this.maxHp = Math.round(this.maxHp * m);
      this.hp = this.maxHp;
      this.reward = Math.round(this.reward * Math.max(1, m * 0.6));
      this.radius = Math.round(this.radius * Math.min(1.25, 1 + (m - 1) * 0.2));
    }
  }

  get alive() {
    return this._alive;
  }

  get shield() {
    return this._shield;
  }

  addShield(amount) {
    this._shield = Math.max(0, this._shield + amount);
  }

  // Apply a status effect template (data-driven). Returns true if applied/refresh happened.
  applyEffect(template) {
    const { type } = template;

    // Hard counters: some enemies resist slow/stun entirely.
    if (type === "slow" && this._slowResist >= 1) return false;
    if (type === "stun" && this._stunResist >= 1) return false;

    const duration = Math.max(0, template.duration ?? 0);
    const magnitude = template.magnitude ?? 0;
    const tickEvery = template.tickEvery ?? 0;
    const mode = template.mode ?? null;
    const damageType = template.damageType ?? null;

    // One instance per type (simple + readable). Stronger magnitude replaces weaker.
    const existing = this.effects.find((e) => e.type === type);
    if (existing) {
      const stronger = Math.abs(magnitude) > Math.abs(existing.magnitude);
      existing.remaining = Math.max(existing.remaining, duration);
      if (stronger) {
        existing.magnitude = magnitude;
        existing.mode = mode;
        existing.tickEvery = tickEvery;
        existing.damageType = damageType;
      }
      return true;
    }

    this.effects.push({
      type,
      duration,
      remaining: duration,
      magnitude,
      tickEvery,
      tickTimer: 0,
      mode,
      damageType,
    });
    return true;
  }

  _currentSlowMagnitude() {
    const slow = this.effects.find((e) => e.type === "slow");
    if (!slow) return 0;
    const raw = clamp(slow.magnitude, 0, 0.95);
    const resisted = raw * (1 - clamp(this._slowResist, 0, 1));
    return resisted;
  }

  _currentHasteMagnitude() {
    const haste = this.effects.find((e) => e.type === "haste");
    if (!haste) return 0;
    return clamp(haste.magnitude ?? 0, 0, 1);
  }

  _isStunned() {
    const stun = this.effects.find((e) => e.type === "stun");
    if (!stun) return false;
    const resisted = clamp(stun.magnitude, 0, 1) * (1 - clamp(this._stunResist, 0, 1));
    return resisted >= 0.5; // "chance" is simplified into a binary on/off for readability.
  }

  _armorAfterEffects() {
    let armor = this.armor;
    const shred = this.effects.find((e) => e.type === "armor_reduction");
    if (!shred) return armor;
    if (shred.mode === "percent") {
      armor = armor * (1 - clamp(shred.magnitude, 0, 0.9));
    } else {
      armor = armor - Math.max(0, shred.magnitude);
    }
    return Math.max(0, armor);
  }

  takeDamage(amount, damageType = "physical") {
    if (!this._alive) return { dealt: 0, killed: false };
    let dmg = Math.max(0, amount);

    // Shields absorb first.
    if (this._shield > 0) {
      const absorbed = Math.min(this._shield, dmg);
      this._shield -= absorbed;
      dmg -= absorbed;
    }
    if (dmg <= 0) return { dealt: 0, killed: false };

    // Armor applies to physical damage.
    if (damageType === "physical") {
      const armor = this._armorAfterEffects();
      dmg = Math.max(1, dmg - armor);
    }

    // Resistances apply to all typed damage.
    const r = clamp(this.resist[damageType] ?? 0, -0.9, 0.95);
    dmg *= 1 - r;

    // Vulnerability increases final damage.
    const vuln = this.effects.find((e) => e.type === "vulnerability");
    if (vuln) {
      const extra = clamp(vuln.magnitude ?? 0, 0, 1);
      dmg *= 1 + extra;
    }

    dmg = Math.max(0, dmg);
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this._alive = false;
      return { dealt: dmg, killed: true };
    }
    return { dealt: dmg, killed: false };
  }

  update(dt) {
    if (!this._alive) return { reachedBase: false };

    // Update effects first (DOT can kill before reaching base).
    this._updateEffects(dt);
    if (!this._alive) return { reachedBase: false };

    // Regen/shield regen.
    if (this._regen > 0 && this.hp > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this._regen * dt);
    }
    if (this._shieldRegen > 0 && this._shield < this._maxShield) {
      this._shield = Math.min(this._maxShield, this._shield + this._shieldRegen * dt);
    }

    const stunned = this._isStunned();
    if (stunned) {
      this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);
      return { reachedBase: false };
    }

    const slow = this._currentSlowMagnitude();
    const haste = this._currentHasteMagnitude();
    let speedMul = clamp(1 - slow + haste, 0.1, 2.2);
    if (this._rage && this.maxHp > 0) {
      const pct = this.hp / this.maxHp;
      if (pct <= (this._rage.hpPct ?? 0.4)) speedMul *= this._rage.speedMul ?? 1.3;
    }
    const speed = this.baseSpeed * speedMul;

    const distToMove = speed * dt;
    const next = advanceAlongPath(this.pathInfo, this.segIndex, this.segT, distToMove);
    this.segIndex = next.segIndex;
    this.segT = next.segT;
    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;
    this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);

    return { reachedBase: next.done };
  }

  _updateEffects(dt) {
    for (const e of this.effects) {
      e.remaining -= dt;
      if (e.tickEvery > 0) {
        e.tickTimer += dt;
        while (e.tickTimer >= e.tickEvery) {
          e.tickTimer -= e.tickEvery;
          if (e.type === "burn" || e.type === "poison" || e.type === "bleed") {
            const dot = Math.max(0, e.magnitude);
            const dtype =
              e.damageType ?? (e.type === "burn" ? "fire" : e.type === "poison" ? "poison" : "physical");
            this.takeDamage(dot, dtype);
            if (!this._alive) break;
          }
        }
      }
      if (!this._alive) break;
    }

    // Remove expired.
    this.effects = this.effects.filter((e) => e.remaining > 0);
  }
}
