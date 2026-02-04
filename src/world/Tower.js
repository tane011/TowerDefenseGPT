import { nextId } from "../core/ids.js";
import { applyTowerModifiers } from "../game/modifiers.js";

function cloneEffects(list) {
  return (list || []).map((e) => ({ ...e }));
}

function mergeOnHitEffects(baseEffects, extraEffects) {
  const out = cloneEffects(baseEffects);
  for (const e of extraEffects || []) out.push({ ...e });
  return out;
}

function cloneAbility(ability) {
  if (!ability) return null;
  return {
    ...ability,
    effects: cloneEffects(ability.effects || []),
    chain: ability.chain ? { ...ability.chain } : null,
    bonusTags: ability.bonusTags ? [...ability.bonusTags] : null,
  };
}

export class Tower {
  constructor(def, tx, ty, worldPos) {
    this.id = nextId("tower");
    this.defId = def.id;
    this.name = def.name;
    this.role = def.role;
    this.tx = tx;
    this.ty = ty;
    this.x = worldPos.x;
    this.y = worldPos.y;

    this.cooldown = 0;
    this.abilityCooldown = 0;
    this.appliedUpgrades = new Set();

    // Optional player override. If null, use the tower's default/upgraded targeting.
    this.targetingOverride = null;

    // Aggregated aura buffs from nearby support towers. Recomputed every frame.
    this.buffs = {
      damageMul: 1,
      fireRateMul: 1,
      rangeMul: 1,
      projectileSpeedMul: 1,
    };

    // Render-only animation state (driven by simulation events).
    this.aimAngle = 0;
    this.animRecoil = 0;
    this.animFlash = 0;
  }

  resetBuffs() {
    this.buffs.damageMul = 1;
    this.buffs.fireRateMul = 1;
    this.buffs.rangeMul = 1;
    this.buffs.projectileSpeedMul = 1;
  }

  applyBuff(buff) {
    // Buffs are multiplicative and stack multiplicatively for clear synergy behavior.
    if (buff.damageMul) this.buffs.damageMul *= buff.damageMul;
    if (buff.fireRateMul) this.buffs.fireRateMul *= buff.fireRateMul;
    if (buff.rangeMul) this.buffs.rangeMul *= buff.rangeMul;
    if (buff.projectileSpeedMul) this.buffs.projectileSpeedMul *= buff.projectileSpeedMul;
  }

  hasUpgrade(upgradeId) {
    return this.appliedUpgrades.has(upgradeId);
  }

  applyUpgrade(upgrade) {
    this.appliedUpgrades.add(upgrade.id);
  }

  computeStats(def, options = {}) {
    // Base stats (data-driven).
    const base = def.stats || {};
    const stats = {
      range: base.range ?? 110,
      fireRate: base.fireRate ?? 1, // shots/sec
      damage: base.damage ?? 8,
      damageType: base.damageType ?? "physical",
      projectileSpeed: base.projectileSpeed ?? 240,
      splashRadius: base.splashRadius ?? 0,
      targeting: normalizeTargeting(base.targeting ?? "first"), // first | last | strongest | weakest | closest | farthest | random
      onHitEffects: mergeOnHitEffects(base.onHitEffects, []),
      chain: base.chain ? { ...base.chain } : null,
      bonusTags: base.bonusTags ? [...base.bonusTags] : null,
      bonusMult: base.bonusMult ?? 1,
      aura: base.aura ? { ...base.aura } : null,
      critChance: base.critChance ?? 0,
      critMult: base.critMult ?? 2,
      ability: cloneAbility(base.ability),
    };

    // Apply upgrades (effects are interpreted by convention to stay data-driven).
    for (const up of def.upgrades || []) {
      if (!this.appliedUpgrades.has(up.id)) continue;
      const fx = up.effects || {};
      if (fx.statsAdd) {
        for (const [k, v] of Object.entries(fx.statsAdd)) stats[k] = (stats[k] ?? 0) + v;
      }
      if (fx.statsMul) {
        for (const [k, v] of Object.entries(fx.statsMul)) stats[k] = (stats[k] ?? 0) * v;
      }
      if (fx.setTargeting) stats.targeting = normalizeTargeting(fx.setTargeting);
      if (fx.addOnHitEffects) stats.onHitEffects = mergeOnHitEffects(stats.onHitEffects, fx.addOnHitEffects);
      if (fx.setChain) stats.chain = { ...fx.setChain };
      if (fx.chainAdd) stats.chain = stats.chain ? { ...stats.chain, ...fx.chainAdd } : { ...fx.chainAdd };
      if (fx.chainMul && stats.chain) {
        for (const [k, v] of Object.entries(fx.chainMul)) stats.chain[k] = (stats.chain[k] ?? 1) * v;
      }
      if (fx.addBonusTags) stats.bonusTags = [...(stats.bonusTags || []), ...fx.addBonusTags];
      if (fx.setBonusTags) stats.bonusTags = [...fx.setBonusTags];
      if (fx.bonusMultAdd) stats.bonusMult = (stats.bonusMult ?? 1) + fx.bonusMultAdd;
      if (fx.bonusMultMul) stats.bonusMult = (stats.bonusMult ?? 1) * fx.bonusMultMul;
      if (fx.setAbility) stats.ability = cloneAbility(fx.setAbility);
      if (fx.abilityAdd && stats.ability) {
        for (const [k, v] of Object.entries(fx.abilityAdd)) {
          if (k === "effects") {
            stats.ability.effects = mergeOnHitEffects(stats.ability.effects || [], v);
          } else if (k === "bonusTags") {
            stats.ability.bonusTags = [...(stats.ability.bonusTags || []), ...v];
          } else if (k === "chain" && stats.ability.chain) {
            stats.ability.chain = { ...stats.ability.chain, ...v };
          } else if (k === "summon") {
            const current = stats.ability.summon ? { ...stats.ability.summon } : {};
            for (const [sk, sv] of Object.entries(v || {})) {
              if (sk === "onHitEffects") {
                current.onHitEffects = mergeOnHitEffects(current.onHitEffects || [], sv);
              } else if (sk === "bonusTags") {
                current.bonusTags = [...(current.bonusTags || []), ...sv];
              } else if (typeof sv === "number") {
                current[sk] = (current[sk] ?? 0) + sv;
              } else if (sv && typeof sv === "object") {
                current[sk] = { ...(current[sk] || {}), ...sv };
              } else {
                current[sk] = sv;
              }
            }
            stats.ability.summon = current;
          } else {
            stats.ability[k] = (stats.ability[k] ?? 0) + v;
          }
        }
      }
      if (fx.abilityMul && stats.ability) {
        for (const [k, v] of Object.entries(fx.abilityMul)) {
          if (k === "summon" && stats.ability.summon && v && typeof v === "object") {
            for (const [sk, sv] of Object.entries(v)) {
              if (typeof stats.ability.summon[sk] === "number") stats.ability.summon[sk] = stats.ability.summon[sk] * sv;
            }
          } else if (typeof stats.ability[k] === "number") {
            stats.ability[k] = stats.ability[k] * v;
          }
        }
      }
      if (fx.addAbilityEffects && stats.ability) {
        stats.ability.effects = mergeOnHitEffects(stats.ability.effects || [], fx.addAbilityEffects);
      }
      if (fx.abilityChainAdd && stats.ability) {
        stats.ability.chain = stats.ability.chain ? { ...stats.ability.chain, ...fx.abilityChainAdd } : { ...fx.abilityChainAdd };
      }
      if (fx.abilityChainMul && stats.ability?.chain) {
        for (const [k, v] of Object.entries(fx.abilityChainMul)) {
          stats.ability.chain[k] = (stats.ability.chain[k] ?? 1) * v;
        }
      }
      if (fx.setAbilityTargeting && stats.ability) stats.ability.targeting = normalizeTargeting(fx.setAbilityTargeting);
      if (fx.auraAdd && stats.aura) {
        // auraAdd merges into existing aura.
        stats.aura = {
          ...stats.aura,
          ...fx.auraAdd,
          buffs: { ...(stats.aura.buffs || {}), ...(fx.auraAdd.buffs || {}) },
        };
      }
    }

    // Apply support buffs last.
    stats.damage *= this.buffs.damageMul;
    stats.fireRate *= this.buffs.fireRateMul;
    stats.range *= this.buffs.rangeMul;
    stats.projectileSpeed *= this.buffs.projectileSpeedMul;
    if (stats.ability?.damage != null) stats.ability.damage *= this.buffs.damageMul;

    if (options.modifiers) applyTowerModifiers(stats, options.modifiers);

    if (!options.ignoreOverride && this.targetingOverride) stats.targeting = normalizeTargeting(this.targetingOverride);

    return stats;
  }
}

function normalizeTargeting(value) {
  const v = String(value || "").toLowerCase();
  if (v === "strong") return "strongest";
  return v || "first";
}
