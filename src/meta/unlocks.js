export const UNLOCK_TYPES = Object.freeze({
  TOWER: "tower",
  MAP: "map",
  MODE: "mode",
  MODIFIER: "modifier",
  FEATURE: "feature",
});

export const FEATURE_IDS = Object.freeze({
  MODIFIERS: "modifiers",
  AUTO_SKIP: "auto_skip",
  DEBUG_MENU: "debug_menu",
  STATS_CHARTS: "stats_charts",
  CUSTOM_MAPS: "custom_maps",
  CUSTOM_MODES: "custom_modes",
  THEME_PACK: "theme_pack",
  CINEMATIC_UI: "cinematic_ui",
  CODEX: "codex",
});

export const BASIC_TOWERS = Object.freeze([
  "archer",
  "cannon",
  "frost",
  "alchemist",
  "banner",
]);

export const FREE_MAPS = Object.freeze([
  "meadow_lane",
  "twin_fork",
]);

export const FREE_MODES = Object.freeze([
  "endless",
  "expedition",
]);

export function unlockKey(type, id) {
  return `${type}:${id}`;
}

export function towerUnlockKey(id) {
  return unlockKey(UNLOCK_TYPES.TOWER, id);
}

export function mapUnlockKey(id) {
  return unlockKey(UNLOCK_TYPES.MAP, id);
}

export function modeUnlockKey(id) {
  return unlockKey(UNLOCK_TYPES.MODE, id);
}

export function modifierUnlockKey(id) {
  return unlockKey(UNLOCK_TYPES.MODIFIER, id);
}

export function featureUnlockKey(id) {
  return unlockKey(UNLOCK_TYPES.FEATURE, id);
}

export function defaultUnlocks() {
  return [
    ...BASIC_TOWERS.map(towerUnlockKey),
    ...FREE_MAPS.map(mapUnlockKey),
    ...FREE_MODES.map(modeUnlockKey),
  ];
}
