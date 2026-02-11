import { defaultUnlocks } from "./unlocks.js";

const STORAGE_KEY = "td_progress_v1";
const VERSION = 1;
const HISTORY_LIMIT = 16;

const DEFAULT_STATS = Object.freeze({
  runs: 0,
  victories: 0,
  totalWaves: 0,
  totalCoins: 0,
  totalDamage: 0,
  totalKills: 0,
  totalTime: 0,
  bestWaves: 0,
  bestCoins: 0,
  bestDamage: 0,
  bestKills: 0,
  bestTime: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  history: [],
});

function readStorage(key) {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Ignore write failures (private mode, blocked storage, etc.)
  }
}

export class Progression {
  constructor({ storageKey = STORAGE_KEY, defaults = defaultUnlocks() } = {}) {
    this._storageKey = storageKey;
    this._defaults = new Set(defaults);
    this.coins = 0;
    this.unlocked = new Set(defaults);
    this.stats = { ...DEFAULT_STATS };
    this.load();
  }

  load() {
    const raw = readStorage(this._storageKey);
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        const coins = Number.parseInt(payload?.coins, 10);
        this.coins = Number.isFinite(coins) ? Math.max(0, coins) : 0;
        this.unlocked = new Set(this._defaults);
        if (Array.isArray(payload?.unlocked)) {
          for (const id of payload.unlocked) {
            if (typeof id === "string" && id) this.unlocked.add(id);
          }
        }
        this.stats = normalizeStats(payload?.stats);
      } catch {
        this.coins = 0;
        this.unlocked = new Set(this._defaults);
        this.stats = { ...DEFAULT_STATS };
      }
    }
    this._persist();
  }

  _persist() {
    const payload = {
      version: VERSION,
      coins: this.coins,
      unlocked: [...this.unlocked],
      stats: this.stats,
    };
    writeStorage(this._storageKey, JSON.stringify(payload));
  }

  exportSnapshot() {
    return {
      coins: this.coins,
      unlocked: [...this.unlocked],
      stats: this.stats,
    };
  }

  importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    let changed = false;
    if (Number.isFinite(snapshot.coins)) {
      this.coins = Math.max(0, Math.round(snapshot.coins));
      changed = true;
    }
    if (Array.isArray(snapshot.unlocked)) {
      this.unlocked = new Set(this._defaults);
      for (const id of snapshot.unlocked) {
        if (typeof id === "string" && id) this.unlocked.add(id);
      }
      changed = true;
    }
    if (snapshot.stats) {
      this.stats = normalizeStats(snapshot.stats);
      changed = true;
    }
    if (changed) this._persist();
    return changed;
  }

  setCoins(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return this.coins;
    this.coins = Math.max(0, Math.round(value));
    this._persist();
    return this.coins;
  }

  addCoins(amount) {
    const delta = Math.max(0, Math.round(amount || 0));
    if (!delta) return this.coins;
    this.coins = Math.max(0, Math.round(this.coins + delta));
    this._persist();
    return this.coins;
  }

  spendCoins(amount) {
    const cost = Math.max(0, Math.round(amount || 0));
    if (!cost || this.coins < cost) return false;
    this.coins = Math.max(0, Math.round(this.coins - cost));
    this._persist();
    return true;
  }

  unlock(id) {
    if (!id || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    this._persist();
    return true;
  }

  unlockMany(ids = []) {
    let changed = false;
    for (const id of ids) {
      if (!id || this.unlocked.has(id)) continue;
      this.unlocked.add(id);
      changed = true;
    }
    if (changed) this._persist();
    return changed;
  }

  isUnlocked(id) {
    return Boolean(id && this.unlocked.has(id));
  }

  recordRun({ coins = 0, waves = 0, victory = false, mapId = "", modeId = "", damage = 0, kills = 0, time = 0 } = {}) {
    const earned = Math.max(0, Math.round(coins || 0));
    const cleared = Math.max(0, Math.round(waves || 0));
    const dealt = Math.max(0, Math.round(damage || 0));
    const slain = Math.max(0, Math.round(kills || 0));
    const survived = Math.max(0, Math.round(time || 0));
    const stats = this.stats || { ...DEFAULT_STATS };
    stats.runs = Math.max(0, Math.round((stats.runs || 0) + 1));
    if (victory) stats.victories = Math.max(0, Math.round((stats.victories || 0) + 1));
    stats.totalWaves = Math.max(0, Math.round((stats.totalWaves || 0) + cleared));
    stats.totalCoins = Math.max(0, Math.round((stats.totalCoins || 0) + earned));
    stats.totalDamage = Math.max(0, Math.round(stats.totalDamage || 0) + dealt);
    stats.totalKills = Math.max(0, Math.round(stats.totalKills || 0) + slain);
    stats.totalTime = Math.max(0, Math.round(stats.totalTime || 0) + survived);
    stats.bestWaves = Math.max(0, Math.round(stats.bestWaves || 0), cleared);
    stats.bestCoins = Math.max(0, Math.round(stats.bestCoins || 0), earned);
    stats.bestDamage = Math.max(0, Math.round(stats.bestDamage || 0), dealt);
    stats.bestKills = Math.max(0, Math.round(stats.bestKills || 0), slain);
    stats.bestTime = Math.max(0, Math.round(stats.bestTime || 0), survived);
    if (victory) {
      stats.currentWinStreak = Math.max(0, Math.round(stats.currentWinStreak || 0)) + 1;
      stats.longestWinStreak = Math.max(0, Math.round(stats.longestWinStreak || 0), stats.currentWinStreak);
    } else {
      stats.currentWinStreak = 0;
    }
    const history = Array.isArray(stats.history) ? stats.history : [];
    history.unshift({
      coins: earned,
      waves: cleared,
      damage: dealt,
      kills: slain,
      time: survived,
      victory: Boolean(victory),
      mapId,
      modeId,
      ts: Date.now(),
    });
    stats.history = history.slice(0, HISTORY_LIMIT);
    this.stats = stats;
    this._persist();
  }
}

function normalizeStats(stats) {
  const base = { ...DEFAULT_STATS };
  if (!stats || typeof stats !== "object") return base;
  base.runs = Math.max(0, Math.round(stats.runs || 0));
  base.victories = Math.max(0, Math.round(stats.victories || 0));
  base.totalWaves = Math.max(0, Math.round(stats.totalWaves || 0));
  base.totalCoins = Math.max(0, Math.round(stats.totalCoins || 0));
  const history = Array.isArray(stats.history) ? stats.history.slice(0, HISTORY_LIMIT) : [];
  base.history = history;
  const historyTotalDamage = history.reduce((sum, run) => sum + Math.max(0, Math.round(run?.damage || 0)), 0);
  const historyTotalKills = history.reduce((sum, run) => sum + Math.max(0, Math.round(run?.kills || 0)), 0);
  const historyTotalTime = history.reduce((sum, run) => sum + Math.max(0, Math.round(run?.time || 0)), 0);
  const storedTotalDamage = Number.isFinite(stats.totalDamage) ? Math.max(0, Math.round(stats.totalDamage)) : historyTotalDamage;
  const storedTotalKills = Number.isFinite(stats.totalKills) ? Math.max(0, Math.round(stats.totalKills)) : historyTotalKills;
  const storedTotalTime = Number.isFinite(stats.totalTime) ? Math.max(0, Math.round(stats.totalTime)) : historyTotalTime;
  base.totalDamage = storedTotalDamage;
  base.totalKills = storedTotalKills;
  base.totalTime = storedTotalTime;
  const bestWaves = Math.max(0, Math.round(stats.bestWaves || 0));
  const bestCoins = Math.max(0, Math.round(stats.bestCoins || 0));
  const historyBestWaves = Math.max(0, ...history.map((run) => Math.round(run?.waves || 0)));
  const historyBestCoins = Math.max(0, ...history.map((run) => Math.round(run?.coins || 0)));
  base.bestWaves = Math.max(bestWaves, historyBestWaves);
  base.bestCoins = Math.max(bestCoins, historyBestCoins);
  const bestDamage = Math.max(0, Math.round(stats.bestDamage || 0));
  const bestKills = Math.max(0, Math.round(stats.bestKills || 0));
  const bestTime = Math.max(0, Math.round(stats.bestTime || 0));
  const historyBestDamage = Math.max(0, ...history.map((run) => Math.round(run?.damage || 0)));
  const historyBestKills = Math.max(0, ...history.map((run) => Math.round(run?.kills || 0)));
  const historyBestTime = Math.max(0, ...history.map((run) => Math.round(run?.time || 0)));
  base.bestDamage = Math.max(bestDamage, historyBestDamage);
  base.bestKills = Math.max(bestKills, historyBestKills);
  base.bestTime = Math.max(bestTime, historyBestTime);
  const storedCurrent = Math.max(0, Math.round(stats.currentWinStreak || 0));
  const storedLongest = Math.max(0, Math.round(stats.longestWinStreak || 0));
  let currentFromHistory = 0;
  for (const run of history) {
    if (!run?.victory) break;
    currentFromHistory += 1;
  }
  let longestFromHistory = 0;
  let streak = 0;
  for (const run of history) {
    if (run?.victory) {
      streak += 1;
      if (streak > longestFromHistory) longestFromHistory = streak;
    } else {
      streak = 0;
    }
  }
  base.currentWinStreak = Math.max(storedCurrent, currentFromHistory);
  base.longestWinStreak = Math.max(storedLongest, longestFromHistory);
  return base;
}
