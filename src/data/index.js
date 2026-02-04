import { ENEMIES } from "./enemies.js";
import { MAPS } from "./maps.js";
import { MODES } from "./modes.js";
import { MODIFIERS } from "./modifiers.js";
import { TOWERS } from "./towers.js";
import { createWave as createWaveImpl } from "./waveGenerator.js";

export const DATA = {
  mapDefs: MAPS,
  modeDefs: MODES,
  modifierDefs: MODIFIERS,
  towerDefs: TOWERS,
  enemyDefs: ENEMIES,
  createWave: (waveNumber, rng, map, mode, modifiers) => createWaveImpl(waveNumber, rng, map, ENEMIES, mode, modifiers),
};
