import { clamp } from "../core/math.js";

const MODIFIER_SCORE_CLAMP = 1.4;
const MODIFIER_MULT_MAX = 1.6;
const MODIFIER_MULT_MIN = 0.7;
const MODIFIER_MULT_SCALE = 0.28;

function scoreMul(value, harderWhenGreater, weight = 1) {
  if (!Number.isFinite(value) || value === 1) return 0;
  const delta = value - 1;
  const signed = harderWhenGreater ? delta : -delta;
  return signed * weight;
}

function scoreAdd(value, harderWhenGreater, scale = 1, weight = 1) {
  if (!Number.isFinite(value) || value === 0 || !scale) return 0;
  const delta = value / scale;
  const signed = harderWhenGreater ? delta : -delta;
  return signed * weight;
}

function scoreModifier(mod) {
  if (!mod) return 0;
  if (Number.isFinite(mod.coinBias)) return mod.coinBias;
  const fx = mod.effects || {};
  let score = 0;

  const start = fx.start || {};
  score += scoreMul(start.moneyMul, false, 0.7);
  score += scoreAdd(start.moneyAdd, false, 40, 0.6);
  score += scoreMul(start.livesMul, false, 0.6);
  score += scoreAdd(start.livesAdd, false, 4, 0.5);

  const tower = fx.tower || {};
  score += scoreMul(tower.damageMul, false, 0.6);
  score += scoreMul(tower.fireRateMul, false, 0.6);
  score += scoreMul(tower.rangeMul, false, 0.45);
  score += scoreMul(tower.projectileSpeedMul, false, 0.2);
  score += scoreMul(tower.splashRadiusMul, false, 0.35);
  score += scoreMul(tower.critMultMul, false, 0.25);
  score += scoreAdd(tower.critChanceAdd, false, 0.08, 0.35);
  score += scoreMul(tower.chainRangeMul, false, 0.2);
  score += scoreMul(tower.chainFalloffMul, false, 0.2);
  score += scoreAdd(tower.chainJumpsAdd, false, 1, 0.25);
  score += scoreMul(tower.abilityDamageMul, false, 0.35);
  score += scoreMul(tower.abilityCooldownMul, true, 0.35);
  score += scoreAdd(tower.abilityCountAdd, false, 1, 0.25);
  score += scoreMul(tower.abilityRangeMul, false, 0.2);
  score += scoreMul(tower.abilityRadiusMul, false, 0.2);
  score += scoreMul(tower.abilityProjectileSpeedMul, false, 0.15);
  score += scoreMul(tower.abilityChainRangeMul, false, 0.15);
  score += scoreMul(tower.abilityChainFalloffMul, false, 0.15);
  score += scoreMul(tower.auraRadiusMul, false, 0.25);
  score += scoreMul(tower.auraBuffMul, false, 0.25);
  score += scoreMul(tower.bonusMultMul, false, 0.2);
  score += scoreMul(tower.statusDurationMul, false, 0.2);
  score += scoreMul(tower.statusMagnitudeMul, false, 0.2);
  score += scoreMul(tower.costMul, true, 0.5);
  score += scoreMul(tower.upgradeCostMul, true, 0.45);

  const enemy = fx.enemy || {};
  score += scoreMul(enemy.hpMul, true, 0.7);
  score += scoreMul(enemy.speedMul, true, 0.55);
  score += scoreAdd(enemy.armorAdd, true, 2, 0.35);
  score += scoreMul(enemy.rewardMul, false, 0.3);
  score += scoreMul(enemy.shieldMul, true, 0.5);
  score += scoreAdd(enemy.shieldAdd, true, 3, 0.4);
  score += scoreAdd(enemy.shieldRegenAdd, true, 2, 0.25);
  score += scoreAdd(enemy.regenAdd, true, 2, 0.3);
  score += scoreAdd(enemy.resistAllAdd, true, 0.1, 0.4);
  score += scoreMul(enemy.damageToBaseMul, true, 0.45);
  score += scoreAdd(enemy.slowResistAdd, true, 0.2, 0.25);
  score += scoreAdd(enemy.stunResistAdd, true, 0.2, 0.25);

  const wave = fx.wave || {};
  score += scoreMul(wave.budgetMul, true, 0.6);
  score += scoreMul(wave.intervalMul, false, 0.6);
  score += scoreMul(wave.eliteMultMul, true, 0.4);
  score += scoreMul(wave.bossMultMul, true, 0.45);
  score += scoreMul(wave.rewardBonusMul, false, 0.35);
  score += scoreAdd(wave.rewardBonusAdd, false, 10, 0.25);
  score += scoreAdd(wave.extraEliteChance, true, 0.25, 0.35);
  if (wave.duplicateSpawns) score += 0.2;
  if (wave.spawnAllPaths) score += 0.15;

  return score;
}

export function computeModifierCoinMultiplier(modifiers = []) {
  if (!modifiers || !modifiers.length) return { mult: 1, score: 0 };
  let score = 0;
  for (const mod of modifiers) {
    score += scoreModifier(mod);
  }
  score = clamp(score, -MODIFIER_SCORE_CLAMP, MODIFIER_SCORE_CLAMP);
  const scaled = clamp(score * MODIFIER_MULT_SCALE, -0.35, 0.55);
  const mult = clamp(1 + scaled, MODIFIER_MULT_MIN, MODIFIER_MULT_MAX);
  return { mult, score };
}

export function calculateCoinReward({ mode, wavesCleared, victory, modifiers }) {
  const cleared = Math.max(0, Math.round(wavesCleared || 0));
  const diff = mode?.difficulty || {};
  const budgetMul = Number.isFinite(diff.budgetMul) ? diff.budgetMul : 1;
  const hpMul = Number.isFinite(diff.hpMul) ? diff.hpMul : 1;
  const difficulty = clamp((budgetMul + hpMul) / 2, 0.75, 1.6);
  const basePerWave = 4;
  const waveCoins = Math.max(0, Math.round(cleared * basePerWave * difficulty));

  const totalWaves = Math.max(0, mode?.totalWaves || 0);
  let bonus = 0;
  if (victory && totalWaves && cleared >= totalWaves) {
    bonus = Math.round((12 + totalWaves * 1.5) * difficulty);
  }

  const baseTotal = waveCoins + bonus;
  const { mult: modifierMult, score: modifierScore } = computeModifierCoinMultiplier(modifiers || []);
  const total = Math.max(0, Math.round(baseTotal * modifierMult));

  return {
    total,
    baseTotal,
    waveCoins,
    bonus,
    modifierMult,
    modifierScore,
    wavesCleared: cleared,
    totalWaves,
    difficulty,
  };
}
