import { ENEMIES } from "./enemies.js";
import { MAPS } from "./maps.js";
import { MODES } from "./modes.js";
import { MODIFIERS } from "./modifiers.js";
import { TOWERS } from "./towers.js";
import { priceTowers } from "./towerPricing.js";
import { createWave as createWaveImpl } from "./waveGenerator.js";

const PRICED_TOWERS = priceTowers(TOWERS);

export const DATA = {
  mapDefs: MAPS,
  modeDefs: MODES,
  modifierDefs: MODIFIERS,
  towerDefs: PRICED_TOWERS,
  enemyDefs: ENEMIES,
  createWave: (waveNumber, rng, map, mode, modifiers, seenEnemyIds) =>
    createWaveImpl(waveNumber, rng, map, ENEMIES, mode, modifiers, seenEnemyIds),
};
