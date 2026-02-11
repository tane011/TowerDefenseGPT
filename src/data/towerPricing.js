import { clamp } from "../core/math.js";

const COST_BASE = 30;
const COST_SCALE = 4;
const COST_MIN = 60;
const ENDGAME_MULT = 4;

const BASELINE_DPS = 12;
const BASE_RANGE = 140;
const LIFE_VALUE = 70;

function calcExpectedDamage(damage, critChance = 0, critMult = 2) {
  if (!damage) return 0;
  return damage * (1 + critChance * (critMult - 1));
}

function calcDps(stats) {
  if (!stats) return 0;
  const damage = stats.damage ?? 0;
  const fireRate = stats.fireRate ?? 0;
  if (stats.beam && damage) {
    const warmupMin = clamp(stats.beam.warmupMin ?? 0.35, 0.1, 1);
    const warmupAvg = (warmupMin + 1) / 2;
    return damage * warmupAvg;
  }
  if (!damage || !fireRate) return 0;
  const expected = calcExpectedDamage(damage, stats.critChance ?? 0, stats.critMult ?? 2);
  return expected * fireRate;
}

function calcAbilityDps(ability, stats) {
  if (!ability) return 0;
  const cooldown = ability.cooldown ?? 0;
  if (!cooldown) return 0;
  const type = String(ability.type || "nova").toLowerCase();
  if (type === "base_heal") return 0;
  if (type === "summon") {
    const summon = ability.summon;
    if (!summon) return 0;
    const damage = summon.damage ?? 0;
    const fireRate = summon.fireRate ?? 0;
    if (!damage || !fireRate) return 0;
    const expected = calcExpectedDamage(damage, summon.critChance ?? 0, summon.critMult ?? 2);
    const summonDps = expected * fireRate;
    const count = Math.max(1, ability.count ?? 1);
    const life = summon.lifetime ?? 0;
    const uptime = life > 0 ? Math.min(life, cooldown) / cooldown : 1;
    return summonDps * count * uptime;
  }
  const count = Math.max(1, ability.count ?? 1);
  const damage = ability.damage ?? stats?.damage ?? 0;
  if (!damage) return 0;
  const expected = calcExpectedDamage(
    damage,
    ability.critChance ?? stats?.critChance ?? 0,
    ability.critMult ?? stats?.critMult ?? 2,
  );
  return (expected * count) / cooldown;
}

function rangeFactor(range) {
  if (!range) return 1;
  return clamp(Math.pow(range / BASE_RANGE, 0.55), 0.75, 1.6);
}

function aoeFactor(radius, scale = 0.6) {
  if (!radius) return 1;
  return 1 + clamp(radius / BASE_RANGE, 0, 0.8) * scale;
}

function chainFactor(chain) {
  if (!chain) return 1;
  const jumps = chain.maxJumps ?? 0;
  const falloff = chain.falloff ?? 0.7;
  let sum = 0;
  for (let i = 1; i <= jumps; i += 1) sum += falloff ** i;
  return 1 + 0.5 * sum;
}

function abilityRangeFactor(abilityRange, baseRange) {
  if (!abilityRange) return 1;
  const denom = baseRange || abilityRange;
  return clamp(Math.pow(abilityRange / denom, 0.3), 0.85, 1.3);
}

function beamFactor(stats) {
  return stats?.beam ? 1.08 : 1;
}

function dotDps(effect) {
  const magnitude = effect.magnitude ?? 0;
  const tickEvery = effect.tickEvery ?? 0;
  if (!magnitude || !tickEvery) return 0;
  return magnitude / tickEvery;
}

function effectUtility(effect, uptime) {
  const type = String(effect.type || "").toLowerCase();
  if (type === "burn" || type === "poison" || type === "bleed") return dotDps(effect) * uptime;
  if (type === "slow") return BASELINE_DPS * (effect.magnitude ?? 0) * 0.6 * uptime;
  if (type === "vulnerability") return BASELINE_DPS * (effect.magnitude ?? 0) * 1.0 * uptime;
  if (type === "armor_reduction") {
    const magnitude = effect.magnitude ?? 0;
    return BASELINE_DPS * (magnitude / 6) * 0.9 * uptime;
  }
  if (type === "stun") return BASELINE_DPS * 0.35 * uptime;
  if (type === "haste") return BASELINE_DPS * (effect.magnitude ?? 0) * 0.5 * uptime;
  return 0;
}

function onHitUtilityPower(stats) {
  const effects = stats?.onHitEffects || [];
  const fireRate = stats?.fireRate ?? 0;
  let util = 0;
  for (const effect of effects) {
    const duration = effect.duration ?? 0;
    const uptime = fireRate ? clamp(duration * fireRate, 0, 1) : 0.4;
    util += effectUtility(effect, uptime);
  }
  return util;
}

function abilityUtilityPower(ability) {
  if (!ability?.effects?.length) return 0;
  const cooldown = ability.cooldown ?? 0;
  if (!cooldown) return 0;
  let util = 0;
  for (const effect of ability.effects) {
    const duration = effect.duration ?? 0;
    const uptime = clamp(duration / cooldown, 0, 1);
    util += effectUtility(effect, uptime * 0.9);
  }
  return util;
}

function auraPower(stats) {
  const aura = stats?.aura;
  if (!aura || !aura.buffs) return 0;
  const buffs = aura.buffs;
  const radius = aura.radius ?? 120;
  const coverage = clamp(radius / 120, 0.6, 2.2);
  let score = 0;
  if (buffs.damageMul) score += (buffs.damageMul - 1) * 1.6;
  if (buffs.fireRateMul) score += (buffs.fireRateMul - 1) * 1.4;
  if (buffs.rangeMul) score += (buffs.rangeMul - 1) * 0.6;
  if (buffs.projectileSpeedMul) score += (buffs.projectileSpeedMul - 1) * 0.3;
  if (buffs.stunImmune) score += 0.25;
  if (buffs.cleanseStun) score += 0.2;
  const baseline = BASELINE_DPS * 2;
  return baseline * score * coverage;
}

function healPower(ability) {
  if (!ability) return 0;
  const type = String(ability.type || "").toLowerCase();
  if (type !== "base_heal") return 0;
  const lives = ability.lives ?? 0;
  const cooldown = ability.cooldown ?? 0;
  if (!lives || !cooldown) return 0;
  return (lives / cooldown) * LIFE_VALUE;
}

export function computeTowerPower(def) {
  const stats = def?.stats;
  if (!stats) return 0;

  const baseDps = calcDps(stats);
  const abilityDps = calcAbilityDps(stats?.ability, stats);

  const basePower =
    baseDps *
    rangeFactor(stats.range) *
    aoeFactor(stats.splashRadius, 0.6) *
    chainFactor(stats.chain) *
    beamFactor(stats);

  const abilityRange = stats?.ability?.range ?? stats?.ability?.radius ?? stats.range;
  const abilityPower =
    abilityDps *
    abilityRangeFactor(abilityRange, stats.range) *
    aoeFactor(stats?.ability?.splashRadius ?? stats?.ability?.radius, 0.5);

  const utility = onHitUtilityPower(stats) + abilityUtilityPower(stats?.ability);
  const aura = auraPower(stats);
  const heal = healPower(stats?.ability);

  return basePower + abilityPower + utility + aura + heal;
}

export function computeTowerCost(def) {
  if (!def) return 0;
  const power = computeTowerPower(def);
  const scaled = (def.endgame ? power * ENDGAME_MULT : power) * COST_SCALE;
  const raw = COST_BASE + scaled;
  return Math.max(COST_MIN, Math.round(raw));
}

export function priceTowers(towers = {}) {
  const out = {};
  for (const [id, def] of Object.entries(towers)) {
    if (!def) continue;
    out[id] = {
      ...def,
      cost: computeTowerCost(def),
    };
  }
  return out;
}
