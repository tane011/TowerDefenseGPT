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
      const slowMul = def.bossSpeedMul ?? 0.6;
      this.baseSpeed *= slowMul;
    }

    this.ability = def.ability || null;
    this.abilities = this._initAbilities(def.abilities || (def.ability ? [def.ability] : []));
    this._ensureBossStunAbility();
    this.onDeathSpawn = def.onDeathSpawn || null;

    this.pathInfo = pathInfo;
    this.pathIndex = opts.pathIndex ?? 0;
    this.segIndex = opts.segIndex ?? 0;
    this.segT = opts.segT ?? 0;
    this.progress01 = 0;

    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;

    this._shield = def.shield ?? 0; // absorbs damage first
    this._maxShield = def.shield ?? 0;
    this.isFinalBoss = Boolean(opts.finalBoss);
    this.finalBossMode = opts.finalBossMode ?? null;
    this.finalBossId = opts.finalBossId ?? (this.isFinalBoss ? def.id : null);
    this.phase = 1;
    this._phase2 = def.phase2 || null;
    this._phase2Triggered = false;
    this._phase2Threshold = this._phase2?.triggerPct ?? 0.2;
    this._phase2Transition = null;
    this._invulnerableTime = 0;
    this._phase2Ready = false;

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
    if (opts.hpMul && opts.hpMul !== 1) {
      this.maxHp = Math.round(this.maxHp * opts.hpMul);
      this.hp = this.maxHp;
    }
    if (opts.extraShield && opts.extraShield > 0) {
      this._maxShield = Math.max(0, this._maxShield + opts.extraShield);
      this._shield = Math.min(this._maxShield, this._shield + opts.extraShield);
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
    if (shred) {
      if (shred.mode === "percent") {
        armor = armor * (1 - clamp(shred.magnitude, 0, 0.9));
      } else {
        armor = armor - Math.max(0, shred.magnitude);
      }
    }
    const boost = this.effects.find((e) => e.type === "armor_boost");
    if (boost) {
      if (boost.mode === "percent") {
        armor = armor * (1 + clamp(boost.magnitude, 0, 1.5));
      } else {
        armor = armor + Math.max(0, boost.magnitude);
      }
    }
    return Math.max(0, armor);
  }

  _currentMitigation() {
    let mitigation = 0;
    for (const fx of this.effects) {
      if (fx.type === "phase" || fx.type === "fortify") {
        mitigation = Math.max(mitigation, clamp(fx.magnitude ?? 0, 0, 0.95));
      }
    }
    return mitigation;
  }

  takeDamage(amount, damageType = "physical") {
    if (!this._alive) return { dealt: 0, killed: false };
    let dmg = Math.max(0, amount);

    if (this._invulnerableTime > 0) return { dealt: 0, killed: false };

    const mitigation = this._currentMitigation();
    if (mitigation > 0) {
      dmg *= 1 - mitigation;
      if (dmg <= 0) return { dealt: 0, killed: false };
    }

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

    if (this._phase2 && !this._phase2Triggered) {
      const thresholdHp = Math.max(1, this.maxHp * this._phase2Threshold);
      if (this.hp - dmg <= thresholdHp) {
        this.hp = thresholdHp;
        this._beginPhase2Transition();
        return { dealt: dmg, killed: false };
      }
    }

    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this._alive = false;
      return { dealt: dmg, killed: true };
    }
    return { dealt: dmg, killed: false };
  }

  update(dt) {
    if (!this._alive) return { reachedBase: false, phaseShifted: false };

    // Update effects first (DOT can kill before reaching base).
    this._updateEffects(dt);
    if (!this._alive) return { reachedBase: false, phaseShifted: false };

    if (this._phase2Transition) {
      this._phase2Transition.remaining -= dt;
      this._invulnerableTime = Math.max(0, this._phase2Transition.remaining);
      this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);
      if (this._phase2Transition.remaining <= 0) {
        this._phase2Transition = null;
        this._invulnerableTime = 0;
        this._phase2Ready = true;
        return { reachedBase: false, phaseShifted: true, phaseStage: "complete" };
      }
      return { reachedBase: false, phaseShifted: false, phaseStage: "transition" };
    }

    if (this._maybeTriggerPhase2()) {
      this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);
      return { reachedBase: false, phaseShifted: true, phaseStage: "start" };
    }

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
      return { reachedBase: false, phaseShifted: false };
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

    return { reachedBase: next.done, phaseShifted: false };
  }

  _initAbilities(list) {
    return (list || []).map((a) => ({
      ...a,
      cooldown: a.cooldown ?? 8,
      timer: a.cooldown ?? 8,
    }));
  }

  _ensureBossStunAbility() {
    if (!this.tags.has("boss")) return;
    const hasStun = this.abilities.some((a) => String(a.type || "").toLowerCase() === "tower_stun");
    if (hasStun) return;
    const stun = {
      type: "tower_stun",
      name: "Disruptive Shock",
      description: "Stuns towers caught in the pulse.",
      cooldown: 14,
      windup: 1.2,
      radius: 130,
      duration: 1.6,
      color: "rgba(244,114,182,0.7)",
    };
    this.abilities.push({
      ...stun,
      cooldown: stun.cooldown ?? 8,
      timer: stun.cooldown ?? 8,
    });
  }

  _maybeTriggerPhase2() {
    if (!this._phase2 || this._phase2Triggered) return false;
    if (this.maxHp <= 0) return false;
    const pct = this.hp / this.maxHp;
    if (pct > this._phase2Threshold) return false;
    return this._beginPhase2Transition();
  }

  _beginPhase2Transition() {
    const cfg = this._phase2;
    if (!cfg) return false;
    this._phase2Triggered = true;
    const duration = Math.max(0.6, cfg.transitionDuration ?? 1.4);
    this._phase2Transition = { remaining: duration, total: duration };
    this._invulnerableTime = duration;
    if (cfg.clearEffects !== false) this.effects = [];
    return true;
  }

  _enterPhase2() {
    const cfg = this._phase2;
    if (!cfg) return false;
    this.phase = 2;

    if (cfg.speedMul != null) this.baseSpeed *= cfg.speedMul;
    if (cfg.armorAdd != null) this.armor += cfg.armorAdd;
    if (cfg.armorMul != null) this.armor *= cfg.armorMul;
    if (cfg.resistAdd) {
      for (const [k, v] of Object.entries(cfg.resistAdd)) {
        this.resist[k] = clamp((this.resist[k] ?? 0) + v, -0.9, 0.95);
      }
    }
    if (cfg.regen != null) this._regen = cfg.regen;
    if (cfg.regenAdd != null) this._regen += cfg.regenAdd;
    if (cfg.shieldRegen != null) this._shieldRegen = cfg.shieldRegen;
    if (cfg.shieldRegenAdd != null) this._shieldRegen += cfg.shieldRegenAdd;

    if (cfg.shield != null) {
      this._maxShield = cfg.shield;
      this._shield = cfg.shield;
    } else if (cfg.shieldAdd != null) {
      this._maxShield = Math.max(0, this._maxShield + cfg.shieldAdd);
      this._shield = Math.max(this._shield, this._maxShield);
    }

    if (cfg.clearEffects !== false) this.effects = [];
    if (cfg.abilities) this.abilities = this._initAbilities(cfg.abilities);
    this._pendingAbilities = [];
    this._ensureBossStunAbility();

    this.hp = this.maxHp;
    return true;
  }

  completePhase2Transition() {
    if (!this._phase2Ready) return false;
    this._phase2Ready = false;
    return this._enterPhase2();
  }

  setPath(pathInfo, pathIndex, progress01 = 0) {
    if (!pathInfo) return false;
    const clamped = clamp(progress01, 0, 1);
    const { segIndex, segT } = progressToSeg(pathInfo, clamped);
    this.pathInfo = pathInfo;
    this.pathIndex = pathIndex ?? this.pathIndex ?? 0;
    this.segIndex = segIndex;
    this.segT = segT;
    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;
    this.progress01 = clamped;
    return true;
  }

  advanceBy(distance) {
    const dist = Math.max(0, distance ?? 0);
    if (!dist) return false;
    const next = advanceAlongPath(this.pathInfo, this.segIndex, this.segT, dist);
    this.segIndex = next.segIndex;
    this.segT = next.segT;
    const p = samplePath(this.pathInfo, this.segIndex, this.segT);
    this.x = p.x;
    this.y = p.y;
    this.progress01 = pathProgress01(this.pathInfo, this.segIndex, this.segT);
    return next.done;
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

function progressToSeg(info, progress01) {
  const target = clamp(progress01, 0, 1) * info.totalLen;
  let distSoFar = 0;
  for (let i = 0; i < info.segLens.length; i++) {
    const segLen = info.segLens[i] || 1e-6;
    if (distSoFar + segLen >= target) {
      const t = segLen <= 0 ? 0 : (target - distSoFar) / segLen;
      return { segIndex: i, segT: clamp(t, 0, 1) };
    }
    distSoFar += segLen;
  }
  return { segIndex: info.segLens.length - 1, segT: 1 };
}
