import { clamp } from "../core/math.js";

const DEFAULT_STATE = {
  start: {
    moneyMul: 1,
    moneyAdd: 0,
    livesMul: 1,
    livesAdd: 0,
  },
  tower: {
    damageMul: 1,
    fireRateMul: 1,
    rangeMul: 1,
    projectileSpeedMul: 1,
    splashRadiusMul: 1,
    critChanceAdd: 0,
    critMultMul: 1,
    costMul: 1,
    upgradeCostMul: 1,
    chainRangeMul: 1,
    chainFalloffMul: 1,
    chainJumpsAdd: 0,
    abilityDamageMul: 1,
    abilityCooldownMul: 1,
    abilityCountAdd: 0,
    abilityRangeMul: 1,
    abilityRadiusMul: 1,
    abilityProjectileSpeedMul: 1,
    abilityChainRangeMul: 1,
    abilityChainFalloffMul: 1,
    auraRadiusMul: 1,
    auraBuffMul: 1,
    bonusMultMul: 1,
    statusDurationMul: 1,
    statusMagnitudeMul: 1,
  },
  enemy: {
    hpMul: 1,
    speedMul: 1,
    armorAdd: 0,
    rewardMul: 1,
    shieldMul: 1,
    shieldAdd: 0,
    shieldRegenAdd: 0,
    regenAdd: 0,
    resistAllAdd: 0,
    resistAdd: {},
    damageToBaseMul: 1,
    slowResistAdd: 0,
    stunResistAdd: 0,
  },
  wave: {
    budgetMul: 1,
    intervalMul: 1,
    eliteMultMul: 1,
    bossMultMul: 1,
    rewardBonusMul: 1,
    rewardBonusAdd: 0,
    extraEliteChance: 0,
    duplicateSpawns: false,
  },
};

export function aggregateModifiers(modifiers) {
  const state = {
    ids: [],
    names: [],
    start: { ...DEFAULT_STATE.start },
    tower: { ...DEFAULT_STATE.tower },
    enemy: { ...DEFAULT_STATE.enemy, resistAdd: { ...DEFAULT_STATE.enemy.resistAdd } },
    wave: { ...DEFAULT_STATE.wave },
  };

  for (const mod of modifiers || []) {
    if (!mod) continue;
    state.ids.push(mod.id);
    state.names.push(mod.name);
    const fx = mod.effects || {};
    if (fx.start) applyStart(state.start, fx.start);
    if (fx.tower) applyTower(state.tower, fx.tower);
    if (fx.enemy) applyEnemy(state.enemy, fx.enemy);
    if (fx.wave) applyWave(state.wave, fx.wave);
  }

  return state;
}

export function applyTowerModifiers(stats, modifierState) {
  const mod = modifierState?.tower;
  if (!mod) return stats;

  stats.damage *= mod.damageMul;
  stats.fireRate *= mod.fireRateMul;
  stats.range *= mod.rangeMul;
  stats.projectileSpeed *= mod.projectileSpeedMul;
  stats.splashRadius *= mod.splashRadiusMul;
  stats.critChance += mod.critChanceAdd;
  stats.critMult *= mod.critMultMul;
  stats.bonusMult *= mod.bonusMultMul;

  if (stats.chain) {
    stats.chain.range = (stats.chain.range ?? 0) * mod.chainRangeMul;
    stats.chain.falloff = (stats.chain.falloff ?? 1) * mod.chainFalloffMul;
    stats.chain.maxJumps = Math.max(0, (stats.chain.maxJumps ?? 0) + mod.chainJumpsAdd);
  }

  if (stats.ability) {
    const abilityChainRangeMul = mod.abilityChainRangeMul !== 1 ? mod.abilityChainRangeMul : mod.chainRangeMul;
    const abilityChainFalloffMul = mod.abilityChainFalloffMul !== 1 ? mod.abilityChainFalloffMul : mod.chainFalloffMul;
    if (typeof stats.ability.damage === "number") stats.ability.damage *= mod.abilityDamageMul;
    if (typeof stats.ability.cooldown === "number") stats.ability.cooldown *= mod.abilityCooldownMul;
    if (typeof stats.ability.count === "number") stats.ability.count = Math.max(1, stats.ability.count + mod.abilityCountAdd);
    if (typeof stats.ability.range === "number") stats.ability.range *= mod.abilityRangeMul;
    if (typeof stats.ability.radius === "number") stats.ability.radius *= mod.abilityRadiusMul;
    if (typeof stats.ability.projectileSpeed === "number") stats.ability.projectileSpeed *= mod.abilityProjectileSpeedMul;
    if (stats.ability.chain) {
      stats.ability.chain.range = (stats.ability.chain.range ?? 0) * abilityChainRangeMul;
      stats.ability.chain.falloff = (stats.ability.chain.falloff ?? 1) * abilityChainFalloffMul;
      stats.ability.chain.maxJumps = Math.max(0, (stats.ability.chain.maxJumps ?? 0) + mod.chainJumpsAdd);
    }

    if (stats.ability.summon) {
      const summon = stats.ability.summon;
      if (typeof summon.damage === "number") summon.damage *= mod.abilityDamageMul;
      if (typeof summon.range === "number") summon.range *= mod.abilityRangeMul;
      if (typeof summon.projectileSpeed === "number") summon.projectileSpeed *= mod.abilityProjectileSpeedMul;
      if (typeof summon.fireRate === "number") summon.fireRate *= mod.fireRateMul;
    }
  }

  if (stats.aura) {
    stats.aura.radius = (stats.aura.radius ?? 0) * mod.auraRadiusMul;
    if (stats.aura.buffs) {
      for (const [k, v] of Object.entries(stats.aura.buffs)) {
        if (typeof v === "number") stats.aura.buffs[k] = v * mod.auraBuffMul;
      }
    }
  }

  if (mod.statusDurationMul !== 1 || mod.statusMagnitudeMul !== 1) {
    scaleEffects(stats.onHitEffects, mod);
    if (stats.ability?.effects) scaleEffects(stats.ability.effects, mod);
  }

  return stats;
}

export function applyEnemyModifiers(enemy, modifierState) {
  const mod = modifierState?.enemy;
  if (!mod || !enemy) return enemy;

  const hpMul = mod.hpMul ?? 1;
  enemy.maxHp = Math.round(enemy.maxHp * hpMul);
  enemy.hp = Math.min(enemy.maxHp, Math.round(enemy.hp * hpMul));

  enemy.baseSpeed *= mod.speedMul;
  enemy.armor = Math.max(0, (enemy.armor ?? 0) + mod.armorAdd);
  enemy.reward = Math.max(0, Math.round(enemy.reward * mod.rewardMul));
  enemy.damageToBase = Math.max(1, Math.round(enemy.damageToBase * mod.damageToBaseMul));

  const resistAdd = mod.resistAdd || {};
  const types = ["physical", "fire", "ice", "poison", "arcane", "lightning"];
  for (const type of types) {
    const cur = enemy.resist?.[type] ?? 0;
    const add = (mod.resistAllAdd ?? 0) + (resistAdd[type] ?? 0);
    if (!add) continue;
    if (!enemy.resist) enemy.resist = {};
    enemy.resist[type] = clamp(cur + add, -0.9, 0.95);
  }

  const shieldMul = mod.shieldMul ?? 1;
  const shieldAdd = mod.shieldAdd ?? 0;
  if (enemy._maxShield != null) {
    const nextMax = Math.max(0, Math.round(enemy._maxShield * shieldMul + shieldAdd));
    const nextShield = Math.max(0, Math.round(enemy._shield * shieldMul + shieldAdd));
    enemy._maxShield = nextMax;
    enemy._shield = Math.min(nextMax, nextShield);
  }
  enemy._shieldRegen = Math.max(0, (enemy._shieldRegen ?? 0) + (mod.shieldRegenAdd ?? 0));
  enemy._regen = Math.max(0, (enemy._regen ?? 0) + (mod.regenAdd ?? 0));
  enemy._slowResist = clamp((enemy._slowResist ?? 0) + (mod.slowResistAdd ?? 0), 0, 1);
  enemy._stunResist = clamp((enemy._stunResist ?? 0) + (mod.stunResistAdd ?? 0), 0, 1);

  return enemy;
}

function scaleEffects(list, mod) {
  if (!list?.length) return;
  for (const e of list) {
    if (typeof e.duration === "number") e.duration *= mod.statusDurationMul;
    if (typeof e.magnitude === "number") e.magnitude *= mod.statusMagnitudeMul;
  }
}

function applyStart(target, src) {
  if (typeof src.moneyMul === "number") target.moneyMul *= src.moneyMul;
  if (typeof src.moneyAdd === "number") target.moneyAdd += src.moneyAdd;
  if (typeof src.livesMul === "number") target.livesMul *= src.livesMul;
  if (typeof src.livesAdd === "number") target.livesAdd += src.livesAdd;
}

function applyTower(target, src) {
  const mulKeys = [
    "damageMul",
    "fireRateMul",
    "rangeMul",
    "projectileSpeedMul",
    "splashRadiusMul",
    "critMultMul",
    "costMul",
    "upgradeCostMul",
    "chainRangeMul",
    "chainFalloffMul",
    "abilityDamageMul",
    "abilityCooldownMul",
    "abilityRangeMul",
    "abilityRadiusMul",
    "abilityProjectileSpeedMul",
    "abilityChainRangeMul",
    "abilityChainFalloffMul",
    "auraRadiusMul",
    "auraBuffMul",
    "bonusMultMul",
    "statusDurationMul",
    "statusMagnitudeMul",
  ];
  for (const key of mulKeys) if (typeof src[key] === "number") target[key] *= src[key];

  const addKeys = ["critChanceAdd", "chainJumpsAdd", "abilityCountAdd"];
  for (const key of addKeys) if (typeof src[key] === "number") target[key] += src[key];
}

function applyEnemy(target, src) {
  const mulKeys = ["hpMul", "speedMul", "rewardMul", "shieldMul", "damageToBaseMul"];
  for (const key of mulKeys) if (typeof src[key] === "number") target[key] *= src[key];

  const addKeys = ["armorAdd", "shieldAdd", "shieldRegenAdd", "regenAdd", "resistAllAdd", "slowResistAdd", "stunResistAdd"];
  for (const key of addKeys) if (typeof src[key] === "number") target[key] += src[key];

  if (src.resistAdd && typeof src.resistAdd === "object") {
    for (const [k, v] of Object.entries(src.resistAdd)) {
      if (typeof v !== "number") continue;
      target.resistAdd[k] = (target.resistAdd[k] ?? 0) + v;
    }
  }
}

function applyWave(target, src) {
  const mulKeys = ["budgetMul", "intervalMul", "eliteMultMul", "bossMultMul", "rewardBonusMul"];
  for (const key of mulKeys) if (typeof src[key] === "number") target[key] *= src[key];

  const addKeys = ["rewardBonusAdd", "extraEliteChance"];
  for (const key of addKeys) if (typeof src[key] === "number") target[key] += src[key];

  if (typeof src.duplicateSpawns === "boolean") target.duplicateSpawns = target.duplicateSpawns || src.duplicateSpawns;
}
