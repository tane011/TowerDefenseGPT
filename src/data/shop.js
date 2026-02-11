import { clamp } from "../core/math.js";
import {
  BASIC_TOWERS,
  FEATURE_IDS,
  FREE_MAPS,
  FREE_MODES,
  featureUnlockKey,
  mapUnlockKey,
  modifierUnlockKey,
  modeUnlockKey,
  towerUnlockKey,
} from "../meta/unlocks.js";
import { FEATURE_DEFS } from "./features.js";
import { computeModifierCoinMultiplier } from "../meta/rewards.js";

const roundToStep = (value, step = 10) => Math.round(value / step) * step;

function calcTowerUnlockCost(def) {
  const base = Number(def?.cost || 0);
  const raw = base * 1.6;
  const rounded = roundToStep(clamp(raw, 60, 2000));
  return Math.round(clamp(rounded, 60, 2000));
}

function calcMapUnlockCost(map) {
  const paths = Array.isArray(map?.paths) ? map.paths.length : 1;
  const size = Math.max(0, (map?.cols || 0) * (map?.rows || 0));
  const raw = 80 + paths * 35 + size / 24;
  const rounded = roundToStep(clamp(raw, 90, 360));
  return Math.round(clamp(rounded, 90, 360));
}

function calcModeUnlockCost(mode) {
  const waves = Math.max(0, mode?.totalWaves || 0);
  if (!waves) return 140;
  const raw = 90 + waves * 4.2;
  const rounded = roundToStep(clamp(raw, 120, 520));
  return Math.round(clamp(rounded, 120, 520));
}

function calcModifierUnlockCost(mod) {
  const { mult } = computeModifierCoinMultiplier([mod]);
  const intensity = Math.abs(mult - 1);
  const raw = 140 + intensity * 600;
  const rounded = roundToStep(clamp(raw, 140, 420));
  return Math.round(clamp(rounded, 140, 420));
}

const BUNDLE_COST_OVERRIDES = new Map([["cataclysm", 420]]);

export function buildShopCatalog({ towerDefs = {}, mapDefs = [], modeDefs = [], modifierDefs = [] } = {}) {
  const items = [];
  const basicSet = new Set(BASIC_TOWERS);
  const freeMaps = new Set(FREE_MAPS);
  const freeModes = new Set(FREE_MODES);
  const requiredModesByMap = new Map();
  for (const mode of modeDefs) {
    if (!mode?.requiredMap) continue;
    if (!requiredModesByMap.has(mode.requiredMap)) requiredModesByMap.set(mode.requiredMap, []);
    requiredModesByMap.get(mode.requiredMap).push(mode);
  }

  for (const def of Object.values(towerDefs)) {
    if (!def?.id) continue;
    const unlockId = towerUnlockKey(def.id);
    const cost = basicSet.has(def.id) ? 0 : calcTowerUnlockCost(def);
    items.push({
      id: unlockId,
      type: "tower",
      refId: def.id,
      name: def.name || def.id,
      description: def.role ? `Role: ${def.role}` : "Tower",
      detail: def.role || "Tower",
      cost,
      grants: [unlockId],
      category: "Towers",
    });
  }

  for (const map of mapDefs) {
    if (!map?.id || map.custom) continue;
    const unlockId = mapUnlockKey(map.id);
    const bundledModes = requiredModesByMap.get(map.id) || [];
    const bundleNames = bundledModes.map((m) => m.name || m.id).filter(Boolean);
    const cost = freeMaps.has(map.id) ? 0 : calcMapUnlockCost(map);
    const grants = [unlockId, ...bundledModes.map((m) => modeUnlockKey(m.id))];
    const descParts = [`${Array.isArray(map.paths) ? map.paths.length : 1} path${Array.isArray(map.paths) && map.paths.length === 1 ? "" : "s"}`];
    if (bundleNames.length) descParts.push(`Includes mode: ${bundleNames.join(", ")}`);
    const mapLabel = map.name || map.id;
    if (bundledModes.length && bundledModes[0]?.id) {
      const primaryMode = bundledModes[0];
      const override = Math.max(
        0,
        ...bundledModes.map((m) => BUNDLE_COST_OVERRIDES.get(m.id) || 0),
      );
      const bundleCost = Math.max(cost, override);
      const bundleDesc = [
        `Includes map: ${mapLabel}`,
        `${Array.isArray(map.paths) ? map.paths.length : 1} path${Array.isArray(map.paths) && map.paths.length === 1 ? "" : "s"}`,
      ];
      if (bundledModes.length > 1) bundleDesc.push(`Modes: ${bundleNames.join(", ")}`);
      items.push({
        id: unlockId,
        type: "mode",
        refId: primaryMode.id,
        name: primaryMode.name || primaryMode.id,
        description: bundleDesc.join(" • "),
        detail: "Mode",
        cost: bundleCost,
        grants,
        category: "Modes",
      });
      continue;
    }
    items.push({
      id: unlockId,
      type: "map",
      refId: map.id,
      name: mapLabel,
      description: descParts.join(" • "),
      detail: "Map",
      cost,
      grants,
      category: "Maps",
    });
  }

  for (const mode of modeDefs) {
    if (!mode?.id || mode.custom) continue;
    if (mode.requiredMap) continue;
    const unlockId = modeUnlockKey(mode.id);
    const cost = freeModes.has(mode.id) ? 0 : calcModeUnlockCost(mode);
    const grants = [unlockId];
    if (mode.requiredMap) grants.push(mapUnlockKey(mode.requiredMap));
    items.push({
      id: unlockId,
      type: "mode",
      refId: mode.id,
      name: mode.name || mode.id,
      description: mode.totalWaves ? `${mode.totalWaves} waves` : "Endless",
      detail: "Mode",
      cost,
      grants,
      category: "Modes",
    });
  }

  for (const mod of modifierDefs) {
    if (!mod?.id) continue;
    const unlockId = modifierUnlockKey(mod.id);
    items.push({
      id: unlockId,
      type: "modifier",
      refId: mod.id,
      name: mod.name || mod.id,
      description: mod.description || "Modifier",
      detail: "Modifier",
      cost: calcModifierUnlockCost(mod),
      grants: [unlockId],
      category: "Modifiers",
      requiresFeature: FEATURE_IDS.MODIFIERS,
    });
  }

  for (const feature of FEATURE_DEFS) {
    const unlockId = featureUnlockKey(feature.id);
    items.push({
      id: unlockId,
      type: "feature",
      refId: feature.id,
      name: feature.name,
      description: feature.description,
      detail: "Feature",
      cost: roundToStep(feature.cost, 10),
      grants: [unlockId],
      category: "Features",
    });
  }

  return { items };
}
