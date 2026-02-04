import { pickWeighted, randInt } from "../core/rng.js";

function roundThreat(v) {
  return Math.round(v * 10) / 10;
}

export function createWave(waveNumber, rng, map, enemyDefs, mode = null, modifiers = null) {
  const paths = map?.paths?.length ? map.paths.length : 1;
  const t = (waveNumber - 1) / 10;
  const isFinal = Boolean(mode?.totalWaves && waveNumber >= mode.totalWaves);
  const difficulty = mode?.difficulty || {};
  const waveMods = modifiers?.wave || {};
  const budgetMul = (difficulty.budgetMul ?? 1) * (waveMods.budgetMul ?? 1);
  const intervalMul = (difficulty.intervalMul ?? 1) * (waveMods.intervalMul ?? 1);
  const eliteEvery = mode?.eliteEvery ?? 5;
  const bossEvery = mode?.bossEvery ?? 10;

  // Budget grows roughly linearly, with a small acceleration.
  const baseBudget = 12 + waveNumber * 8 + Math.floor(waveNumber * waveNumber * 0.25) + (isFinal ? 25 : 0);
  const budget = Math.round(baseBudget * budgetMul);

  const pool = [];
  pool.push({ item: "grunt", w: 5 });
  if (waveNumber >= 2) pool.push({ item: "runner", w: 3 });
  if (waveNumber >= 3) pool.push({ item: "skirmisher", w: 3 });
  if (waveNumber >= 4) pool.push({ item: "tank", w: 2 });
  if (waveNumber >= 5) pool.push({ item: "brute", w: 2 });
  if (waveNumber >= 6) pool.push({ item: "ward", w: 2 });
  if (waveNumber >= 6) pool.push({ item: "shellback", w: 2 });
  if (waveNumber >= 7) pool.push({ item: "splitter", w: 2 });
  if (waveNumber >= 7) pool.push({ item: "mystic", w: 2 });
  if (waveNumber >= 8) pool.push({ item: "leech", w: 2 });
  if (waveNumber >= 9) pool.push({ item: "specter", w: 2 });
  if (waveNumber >= 10) pool.push({ item: "glacier", w: 2 });
  if (waveNumber >= 11) pool.push({ item: "phase", w: 1.6 });
  if (waveNumber >= 12) pool.push({ item: "bombardier", w: 1.6 });
  if (waveNumber >= 13) pool.push({ item: "dreadwing", w: 1.8 });
  if (waveNumber >= 14) pool.push({ item: "carapace", w: 1.8 });
  if (waveNumber >= 15) pool.push({ item: "siphon", w: 1.6 });
  if (waveNumber >= 16) pool.push({ item: "bulwark", w: 1.4 });
  if (waveNumber >= 18) pool.push({ item: "wyrm", w: 1.4 });

  const groups = randInt(rng, 2, 4);
  const events = [];
  let time = 0;
  let remaining = budget;
  let threat = 0;

  for (let g = 0; g < groups; g++) {
    const enemyId = pickWeighted(rng, pool);
    const def = enemyDefs[enemyId];
    const cost = Math.max(1, Math.round((def.threat ?? 1) * 8));
    const count = Math.max(4, Math.min(22, Math.floor(remaining / cost)));
    const interval = Math.max(0.2, (0.58 - waveNumber * 0.02 + (rng() - 0.5) * 0.08) * intervalMul);
    const pathIndex = randInt(rng, 0, paths - 1);

    for (let i = 0; i < count; i++) {
      events.push({ t: time, enemyId, pathIndex });
      time += interval;
    }
    time += 0.7;
    remaining -= count * cost;
    threat += (def.threat ?? 1) * count;
    if (remaining <= 0) break;
  }

  // Elite injection every 5 waves.
  if (eliteEvery > 0 && waveNumber % eliteEvery === 0) {
    const elitePool = [];
    if (waveNumber >= 16) elitePool.push({ item: "bulwark", w: 2 });
    if (waveNumber >= 12) elitePool.push({ item: "shellback", w: 2 });
    if (waveNumber >= 9) elitePool.push({ item: "brute", w: 2 });
    if (waveNumber >= 6) elitePool.push({ item: "tank", w: 2 });
    elitePool.push({ item: "grunt", w: 1 });
    const eliteId = pickWeighted(rng, elitePool);
    const eliteMult = (1.65 + t * 0.2) * (difficulty.eliteMult ?? 1) * (waveMods.eliteMultMul ?? 1);
    events.push({
      t: Math.max(0.5, time - 0.4),
      enemyId: eliteId,
      pathIndex: randInt(rng, 0, paths - 1),
      opts: { eliteMult },
    });
    threat += (enemyDefs[eliteId].threat ?? 1) * eliteMult;
  }

  // Boss every 10 waves (rotating pool) unless the mode defines a final boss wave.
  if (!isFinal && bossEvery > 0 && waveNumber % bossEvery === 0) {
    const bossPool = [];
    bossPool.push({ item: "golem", w: 3 });
    if (waveNumber >= 20) bossPool.push({ item: "hydra", w: 3 });
    if (waveNumber >= 25) bossPool.push({ item: "lich", w: 2 });
    if (waveNumber >= 30) bossPool.push({ item: "colossus", w: 2 });
    const bossId = pickWeighted(rng, bossPool);
    const bossMult = (1 + Math.min(0.25, t * 0.1)) * (difficulty.bossMult ?? 1) * (waveMods.bossMultMul ?? 1);
    events.push({
      t: Math.max(1, time + 0.3),
      enemyId: bossId,
      pathIndex: randInt(rng, 0, paths - 1),
      opts: { eliteMult: bossMult },
    });
    threat += (enemyDefs[bossId].threat ?? 10) * bossMult;
  }

  // Final boss wave injection (mode-driven).
  if (isFinal && mode?.finalBoss) {
    const bossId = mode.finalBoss;
    const bossMult = (1.25 + Math.min(0.35, t * 0.12)) * (difficulty.bossMult ?? 1) * (waveMods.bossMultMul ?? 1);
    events.push({
      t: Math.max(1, time + 0.6),
      enemyId: bossId,
      pathIndex: randInt(rng, 0, paths - 1),
      opts: { eliteMult: bossMult },
    });
    threat += (enemyDefs[bossId]?.threat ?? 12) * bossMult;
  }

  const rewardBase = 18 + waveNumber * 4 + (isFinal ? 40 : 0);
  const rewardBonus = Math.max(
    0,
    Math.round(rewardBase * (waveMods.rewardBonusMul ?? 1) + (waveMods.rewardBonusAdd ?? 0))
  );

  // Extra elite chance (modifier-driven).
  if (waveMods.extraEliteChance && rng() < waveMods.extraEliteChance) {
    const elitePool = [];
    if (waveNumber >= 16) elitePool.push({ item: "bulwark", w: 2 });
    if (waveNumber >= 12) elitePool.push({ item: "shellback", w: 2 });
    if (waveNumber >= 9) elitePool.push({ item: "brute", w: 2 });
    if (waveNumber >= 6) elitePool.push({ item: "tank", w: 2 });
    elitePool.push({ item: "grunt", w: 1 });
    const eliteId = pickWeighted(rng, elitePool);
    const eliteMult = (1.45 + t * 0.15) * (difficulty.eliteMult ?? 1) * (waveMods.eliteMultMul ?? 1);
    events.push({
      t: Math.max(0.5, time + 0.2),
      enemyId: eliteId,
      pathIndex: randInt(rng, 0, paths - 1),
      opts: { eliteMult },
    });
    threat += (enemyDefs[eliteId].threat ?? 1) * eliteMult;
  }

  // Duplicate spawns onto another path occasionally.
  if (waveMods.duplicateSpawns && paths > 1) {
    const dupes = [];
    for (const ev of events) {
      const def = enemyDefs[ev.enemyId];
      if (def?.tags?.includes?.("boss")) continue;
      if (rng() < 0.35) {
        let nextPath = randInt(rng, 0, paths - 1);
        if (nextPath === ev.pathIndex) nextPath = (nextPath + 1) % paths;
        dupes.push({ ...ev, pathIndex: nextPath });
      }
    }
    events.push(...dupes);
  }
  const summary = summarize(events);

  return {
    events,
    meta: {
      label: isFinal && mode?.finalBoss ? `Final Boss — ${enemyDefs[mode.finalBoss]?.name || mode.finalBoss}` : summary,
      rewardBonus,
      threat: roundThreat(threat),
    },
  };
}

function summarize(events) {
  const counts = new Map();
  for (const e of events) {
    counts.set(e.enemyId, (counts.get(e.enemyId) || 0) + 1);
  }
  const parts = [];
  for (const [k, v] of counts.entries()) parts.push(`${k}×${v}`);
  return parts.slice(0, 4).join(", ");
}
