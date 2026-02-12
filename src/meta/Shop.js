import { buildShopCatalog } from "../data/shop.js";
import {
  featureUnlockKey,
  mapUnlockKey,
  modifierUnlockKey,
  modeUnlockKey,
  towerUnlockKey,
} from "./unlocks.js";

export class Shop {
  constructor({ data, progression }) {
    this._data = data;
    this._progression = progression;
    this.refreshCatalog();
  }

  refreshCatalog() {
    const catalog = buildShopCatalog({
      towerDefs: this._data?.towerDefs,
      mapDefs: this._data?.mapDefs,
      modeDefs: this._data?.modeDefs,
      modifierDefs: this._data?.modifierDefs,
    });
    this._catalog = catalog;
    this._index = new Map();
    for (const item of catalog.items || []) {
      this._index.set(item.id, item);
    }
  }

  getItems() {
    return (this._catalog?.items || []).map((item) => ({
      ...item,
      unlocked: this.isUnlocked(item.id) || item.cost === 0,
    }));
  }

  getPaidUnlockIds() {
    const ids = new Set();
    for (const item of this._catalog?.items || []) {
      if (!item || item.cost <= 0) continue;
      const grants = Array.isArray(item.grants) && item.grants.length ? item.grants : [item.id];
      for (const id of grants) {
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }

  getItem(unlockId) {
    return this._index?.get(unlockId) || null;
  }

  isUnlocked(unlockId) {
    return this._progression?.isUnlocked(unlockId) ?? true;
  }

  isTowerUnlocked(towerId) {
    return this.isUnlocked(towerUnlockKey(towerId));
  }

  isMapUnlocked(mapId) {
    return this.isUnlocked(mapUnlockKey(mapId));
  }

  isModeUnlocked(modeId) {
    return this.isUnlocked(modeUnlockKey(modeId));
  }

  isFeatureUnlocked(featureId) {
    return this.isUnlocked(featureUnlockKey(featureId));
  }

  isModifierUnlocked(modifierId) {
    return this.isUnlocked(modifierUnlockKey(modifierId));
  }

  getCost(unlockId) {
    return this._index?.get(unlockId)?.cost ?? null;
  }

  getTowerUnlockCost(towerId) {
    return this.getCost(towerUnlockKey(towerId));
  }

  getMapUnlockCost(mapId) {
    return this.getCost(mapUnlockKey(mapId));
  }

  getModeUnlockCost(modeId) {
    return this.getCost(modeUnlockKey(modeId));
  }

  getModifierUnlockCost(modifierId) {
    return this.getCost(modifierUnlockKey(modifierId));
  }

  getFeatureUnlockCost(featureId) {
    return this.getCost(featureUnlockKey(featureId));
  }

  purchase(unlockId) {
    const item = this._index?.get(unlockId);
    if (!item) return { ok: false, reason: "Unknown item" };
    if (item.cost <= 0) return { ok: false, reason: "Already unlocked" };
    if (this.isUnlocked(unlockId)) return { ok: false, reason: "Already unlocked" };
    if (this._progression?.coins < item.cost) return { ok: false, reason: "Not enough coins" };

    const spent = this._progression.spendCoins(item.cost);
    if (!spent) return { ok: false, reason: "Not enough coins" };

    this._progression.unlockMany(item.grants || [unlockId]);
    return {
      ok: true,
      cost: item.cost,
      remaining: this._progression.coins,
      unlocked: [...(item.grants || [unlockId])],
    };
  }
}
