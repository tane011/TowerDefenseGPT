const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return value;
  const m = 10 ** digits;
  return Math.round(value * m) / m;
};
const clone = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const ROLE_PROFILE = {
  "single-target": {
    costMul: 1.06,
    costAdd: 12,
    damageMul: 1.08,
    fireRateMul: 1.08,
    rangeMul: 1.05,
    projectileSpeedMul: 1.05,
    critChanceMul: 1.05,
    critMultMul: 1.02,
    abilityDamageMul: 1.1,
    abilityCooldownMul: 0.95,
  },
  splash: {
    costMul: 1.1,
    costAdd: 16,
    damageMul: 1.2,
    fireRateMul: 0.92,
    rangeMul: 0.95,
    projectileSpeedMul: 0.98,
    splashMul: 1.18,
    abilityDamageMul: 1.15,
    abilityCooldownMul: 1.05,
    abilityRadiusMul: 1.1,
  },
  slowing: {
    costMul: 1.07,
    costAdd: 14,
    damageMul: 0.95,
    fireRateMul: 0.98,
    rangeMul: 1.12,
    projectileSpeedMul: 1.06,
    abilityDamageMul: 1.02,
    abilityCooldownMul: 0.95,
  },
  debuff: {
    costMul: 1.08,
    costAdd: 14,
    damageMul: 0.9,
    fireRateMul: 0.95,
    rangeMul: 1.15,
    projectileSpeedMul: 1.08,
    abilityDamageMul: 1.05,
    abilityCooldownMul: 0.95,
  },
  support: {
    costMul: 1.1,
    costAdd: 18,
    auraRadiusMul: 1.2,
    auraBuffMul: 1.12,
    abilityCooldownMul: 0.92,
  },
  summoner: {
    costMul: 1.12,
    costAdd: 20,
    damageMul: 0.85,
    fireRateMul: 0.9,
    rangeMul: 1.05,
    summonHpMul: 1.25,
    summonDamageMul: 1.18,
    summonRangeMul: 1.08,
    summonFireRateMul: 1.06,
    summonSpeedMul: 1.08,
    abilityCooldownMul: 0.9,
  },
  dps: {
    costMul: 1.18,
    costAdd: 26,
    damageMul: 1.35,
    fireRateMul: 1.05,
    rangeMul: 1.08,
    projectileSpeedMul: 1.08,
    splashMul: 1.08,
    abilityDamageMul: 1.25,
    abilityCooldownMul: 1.05,
  },
};

const DEFAULT_PROFILE = {
  costMul: 1.05,
  costAdd: 10,
  damageMul: 1.05,
  fireRateMul: 1.02,
  rangeMul: 1.02,
  projectileSpeedMul: 1.02,
  splashMul: 1.02,
  abilityDamageMul: 1.05,
  abilityCooldownMul: 1,
};

const MODE_OVERRIDES = {
  endless: {
    description: "Survive as long as you can. Bosses appear every 9 waves.",
    bossEvery: 9,
  },
  expedition: {
    totalWaves: 14,
    bossEvery: 7,
    eliteEvery: 4,
    difficulty: {
      budgetMul: 1.02,
      eliteMult: 1.08,
      bossMult: 1.12,
      intervalMul: 0.98,
      hpMul: 1.04,
      hpScale: 0.02,
    },
  },
  siege: {
    totalWaves: 20,
    bossEvery: 7,
    eliteEvery: 4,
    difficulty: {
      budgetMul: 1.12,
      eliteMult: 1.15,
      bossMult: 1.2,
      intervalMul: 0.94,
      hpMul: 1.1,
      hpScale: 0.025,
    },
  },
  marathon: {
    totalWaves: 28,
    bossEvery: 7,
    eliteEvery: 4,
    difficulty: {
      budgetMul: 1.2,
      eliteMult: 1.25,
      bossMult: 1.3,
      intervalMul: 0.9,
      hpMul: 1.18,
      hpScale: 0.03,
    },
  },
  ascension: {
    totalWaves: 36,
    bossEvery: 6,
    eliteEvery: 3,
    difficulty: {
      budgetMul: 1.3,
      eliteMult: 1.35,
      bossMult: 1.4,
      intervalMul: 0.88,
      hpMul: 1.26,
      hpScale: 0.035,
    },
  },
  eclipse: {
    totalWaves: 46,
    bossEvery: 6,
    eliteEvery: 3,
    difficulty: {
      budgetMul: 1.42,
      eliteMult: 1.5,
      bossMult: 1.55,
      intervalMul: 0.84,
      hpMul: 1.34,
      hpScale: 0.04,
    },
  },
  nightmare: {
    totalWaves: 56,
    bossEvery: 5,
    eliteEvery: 3,
    difficulty: {
      budgetMul: 1.6,
      eliteMult: 1.7,
      bossMult: 1.8,
      intervalMul: 0.8,
      hpMul: 1.48,
      hpScale: 0.05,
      finalBossMult: 4.8,
      seenShieldMul: 1.5,
    },
  },
  apocalypse: {
    totalWaves: 70,
    bossEvery: 5,
    eliteEvery: 2,
    difficulty: {
      budgetMul: 1.8,
      eliteMult: 2.0,
      bossMult: 2.3,
      intervalMul: 0.72,
      hpMul: 1.62,
      hpScale: 0.06,
      finalBossMult: 6.8,
      seenShieldMul: 1.7,
    },
  },
};

function scaleStat(value, mul = 1, add = 0, digits = 2) {
  if (value == null) return value;
  return round(value * mul + add, digits);
}

function scaleBuff(value, mul = 1) {
  if (value == null) return value;
  return round(1 + (value - 1) * mul, 3);
}

function rebalanceAbility(ability, profile) {
  if (!ability) return ability;
  const out = { ...ability };
  out.cooldown = scaleStat(out.cooldown ?? 0, profile.abilityCooldownMul ?? 1, 0, 2);
  out.radius = scaleStat(out.radius ?? null, profile.abilityRadiusMul ?? 1, 0, 0);
  out.range = scaleStat(out.range ?? null, profile.abilityRangeMul ?? 1, 0, 0);
  out.damage = scaleStat(out.damage ?? null, profile.abilityDamageMul ?? 1, 0, 1);
  if (out.count != null) out.count = Math.max(1, Math.round(out.count * (profile.abilityCountMul ?? 1)));
  if (out.duration != null) out.duration = scaleStat(out.duration, profile.abilityDurationMul ?? 1, 0, 2);
  if (out.magnitude != null) out.magnitude = scaleStat(out.magnitude, profile.abilityMagnitudeMul ?? 1, 0, 2);
  if (out.summon) {
    out.summon = { ...out.summon };
    out.summon.hp = scaleStat(out.summon.hp ?? null, profile.summonHpMul ?? 1, 0, 0);
    out.summon.damage = scaleStat(out.summon.damage ?? null, profile.summonDamageMul ?? 1, 0, 1);
    out.summon.range = scaleStat(out.summon.range ?? null, profile.summonRangeMul ?? 1, 0, 0);
    out.summon.fireRate = scaleStat(out.summon.fireRate ?? null, profile.summonFireRateMul ?? 1, 0, 2);
    out.summon.speed = scaleStat(out.summon.speed ?? null, profile.summonSpeedMul ?? 1, 0, 0);
    out.summon.lifetime = scaleStat(out.summon.lifetime ?? null, profile.summonLifetimeMul ?? 1, 0, 1);
  }
  return out;
}

export function rebalanceTowers(towers) {
  const out = {};
  for (const [id, def] of Object.entries(towers)) {
    const next = clone(def);
    const profile = ROLE_PROFILE[next.role] || DEFAULT_PROFILE;
    const endgameMul = next.endgame ? 1.15 : 1;
    next.cost = Math.max(25, Math.round((next.cost ?? 0) * profile.costMul * endgameMul + profile.costAdd));

    if (next.stats) {
      const stats = { ...next.stats };
      stats.range = scaleStat(stats.range ?? null, profile.rangeMul ?? 1, 0, 0);
      stats.fireRate = scaleStat(stats.fireRate ?? null, profile.fireRateMul ?? 1, 0, 2);
      stats.damage = scaleStat(stats.damage ?? null, profile.damageMul ?? 1, 0, 1);
      stats.projectileSpeed = scaleStat(stats.projectileSpeed ?? null, profile.projectileSpeedMul ?? 1, 0, 0);
      stats.splashRadius = scaleStat(stats.splashRadius ?? null, profile.splashMul ?? 1, 0, 0);
      if (stats.critChance != null) stats.critChance = clamp(stats.critChance * (profile.critChanceMul ?? 1), 0.02, 0.35);
      if (stats.critMult != null) stats.critMult = round(stats.critMult * (profile.critMultMul ?? 1), 2);

      if (stats.aura) {
        stats.aura = { ...stats.aura };
        stats.aura.radius = scaleStat(stats.aura.radius ?? null, profile.auraRadiusMul ?? 1, 0, 0);
        if (stats.aura.buffs) {
          const buffs = { ...stats.aura.buffs };
          for (const [k, v] of Object.entries(buffs)) {
            if (typeof v === "number") buffs[k] = scaleBuff(v, profile.auraBuffMul ?? 1);
          }
          stats.aura.buffs = buffs;
        }
      }

      if (stats.ability) stats.ability = rebalanceAbility(stats.ability, profile);
      if (stats.beam) {
        stats.beam = { ...stats.beam };
        stats.beam.warmupDuration = scaleStat(stats.beam.warmupDuration ?? null, profile.beamWarmupMul ?? 1, 0, 2);
        stats.beam.decayDuration = scaleStat(stats.beam.decayDuration ?? null, profile.beamDecayMul ?? 1, 0, 2);
        stats.beam.effectInterval = scaleStat(stats.beam.effectInterval ?? null, profile.beamIntervalMul ?? 1, 0, 2);
        stats.beam.width = scaleStat(stats.beam.width ?? null, profile.beamWidthMul ?? 1, 0, 2);
      }
      next.stats = stats;
    }

    if (Array.isArray(next.upgrades)) {
      next.upgrades = next.upgrades.map((up) => ({
        ...up,
        cost: up.cost != null ? Math.max(20, Math.round(up.cost * (profile.upgradeCostMul ?? 1.12) + 4)) : up.cost,
      }));
    }
    out[id] = next;
  }
  return out;
}

function rebalanceEnemyAbility(ability, isBoss) {
  if (!ability) return ability;
  const out = { ...ability };
  const cooldownMul = isBoss ? 1.08 : 1.02;
  out.cooldown = scaleStat(out.cooldown ?? 0, cooldownMul, 0, 2);
  out.windup = scaleStat(out.windup ?? 0, isBoss ? 1.12 : 1.05, 0, 2);
  out.radius = scaleStat(out.radius ?? null, isBoss ? 1.18 : 1.1, 0, 0);
  out.damage = scaleStat(out.damage ?? null, isBoss ? 1.25 : 1.12, 0, 1);
  out.heal = scaleStat(out.heal ?? null, isBoss ? 1.2 : 1.1, 0, 0);
  out.shield = scaleStat(out.shield ?? null, isBoss ? 1.2 : 1.1, 0, 0);
  out.count = out.count != null ? Math.max(1, Math.round(out.count * (isBoss ? 1.15 : 1.05))) : out.count;
  out.duration = scaleStat(out.duration ?? null, isBoss ? 1.2 : 1.1, 0, 2);
  out.magnitude = scaleStat(out.magnitude ?? null, isBoss ? 1.12 : 1.05, 0, 2);
  return out;
}

export function rebalanceEnemies(enemies) {
  const out = {};
  for (const [id, def] of Object.entries(enemies)) {
    const next = clone(def);
    const tags = new Set(next.tags || []);
    const isBoss = tags.has("boss");
    const threatBase = next.threat ?? 1;
    const armorBase = next.armor ?? 0;
    const speedBase = next.speed ?? 40;
    const hpBase = next.hp ?? 50;
    const radiusBase = next.radius ?? 10;

    let hp = Math.round(hpBase * 0.8 + armorBase * 22 + speedBase * 0.25 + threatBase * 24);
    if (isBoss) hp = Math.round(hp * 1.6 + 320);
    let speed = Math.round(speedBase * (isBoss ? 0.82 : 1.08) - armorBase * 0.6 + threatBase * 0.2);
    speed = clamp(speed, isBoss ? 18 : 26, isBoss ? 60 : 110);
    const armor = Math.max(0, Math.round(armorBase * 0.9 + threatBase * 0.35 + (isBoss ? 1 : 0)));
    const radius = Math.max(8, Math.round(radiusBase * (isBoss ? 1.12 : 1.05)));
    const reward = Math.max(2, Math.round(hp / 45 + threatBase * 0.7 + (isBoss ? 12 : 0)));
    let threat = round(hp / 95 + armor * 0.6 + speed / 80, 1);
    if (isBoss) threat = round(threat + 5, 1);

    next.hp = hp;
    next.speed = speed;
    next.armor = armor;
    next.radius = radius;
    next.reward = reward;
    next.threat = threat;
    if (next.shield != null) next.shield = Math.round(next.shield * 1.2 + threatBase * 4);
    if (next.shieldRegen != null) next.shieldRegen = round(next.shieldRegen * 1.1 + (isBoss ? 0.5 : 0), 2);
    if (next.regen != null) next.regen = round(next.regen * 1.1 + (isBoss ? 0.5 : 0), 2);
    if (next.contactDamage != null) next.contactDamage = Math.round(next.contactDamage * 1.1);
    if (next.damageToBase != null) next.damageToBase = Math.max(1, Math.round(next.damageToBase * (isBoss ? 1.2 : 1.05)));

    if (next.resist) {
      const resist = { ...next.resist };
      for (const [k, v] of Object.entries(resist)) {
        if (typeof v === "number") resist[k] = clamp(round(v * 0.9, 2), -0.85, 0.9);
      }
      next.resist = resist;
    }
    if (next.slowResist != null) next.slowResist = clamp(round(next.slowResist * 1.05, 2), 0, 0.9);
    if (next.stunResist != null) next.stunResist = clamp(round(next.stunResist * 1.05, 2), 0, 0.9);

    if (next.abilities) next.abilities = next.abilities.map((a) => rebalanceEnemyAbility(a, isBoss));
    if (next.ability) next.ability = rebalanceEnemyAbility(next.ability, isBoss);

    out[id] = next;
  }
  return out;
}

export function rebalanceModes(modes) {
  return (modes || []).map((mode) => {
    const override = MODE_OVERRIDES[mode.id];
    if (!override) return mode;
    return {
      ...mode,
      ...override,
      difficulty: { ...(mode.difficulty || {}), ...(override.difficulty || {}) },
    };
  });
}
