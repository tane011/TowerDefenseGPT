import { makeRng } from "./core/rng.js";
import { FIXED_DT, FIXED_FPS } from "./core/time.js";
import { DATA } from "./data/index.js";
import { Game } from "./game/Game.js";
import { GameState } from "./game/GameState.js";
import { Input } from "./input/Input.js";
import { Progression } from "./meta/Progression.js";
import { Shop } from "./meta/Shop.js";
import { FEATURE_IDS, featureUnlockKey } from "./meta/unlocks.js";
import { UI } from "./ui/UI.js";

const canvas = document.getElementById("game-canvas");
const bossCanvas = document.getElementById("boss-canvas");
const loadingScreen = document.getElementById("loading-screen");
const params = new URLSearchParams(window.location.search);
const uiCapture = params.get("uiCapture") === "1";
const input = new Input(canvas);

const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
let baseRng = makeRng(seed);
const rngState = { seed, calls: 0 };
const rng = () => {
  rngState.calls += 1;
  return baseRng();
};
rng.state = rngState;
rng.reset = (nextSeed = seed, calls = 0) => {
  const safeSeed = Number.isFinite(nextSeed) ? nextSeed : seed;
  const safeCalls = Math.max(0, Math.floor(Number(calls) || 0));
  rngState.seed = safeSeed;
  rngState.calls = 0;
  baseRng = makeRng(safeSeed);
  for (let i = 0; i < safeCalls; i++) rng();
};
const state = new GameState({ seed });
const PROFILE_SLOT_KEY = "td_profile_slot_v1";
const PROFILE_LAST_REAL_KEY = "td_profile_slot_last_real_v1";
const PROFILE_STORAGE_PREFIX = "td_profile_v1_";
const profileSlots = new Set(["slot-1", "slot-2", "slot-3", "slot-4"]);
let activeSlot = "slot-1";
let promptProfiles = false;
try {
  const stored = window.localStorage?.getItem(PROFILE_SLOT_KEY);
  if (stored && profileSlots.has(stored)) {
    if (stored === "slot-4") {
      promptProfiles = true;
      const lastReal = window.localStorage?.getItem(PROFILE_LAST_REAL_KEY);
      if (lastReal && profileSlots.has(lastReal) && lastReal !== "slot-4") activeSlot = lastReal;
      window.localStorage?.setItem(PROFILE_SLOT_KEY, activeSlot);
    } else {
      activeSlot = stored;
    }
  } else {
    window.localStorage?.setItem(PROFILE_SLOT_KEY, activeSlot);
  }
  if (activeSlot !== "slot-4") window.localStorage?.setItem(PROFILE_LAST_REAL_KEY, activeSlot);
} catch {
  // Ignore storage errors.
}
const isDebugSlot = activeSlot === "slot-4";
const progression = new Progression({ storageKey: `${PROFILE_STORAGE_PREFIX}${activeSlot}`, persist: !isDebugSlot });
const shop = new Shop({ data: DATA, progression });
const unlockThemes = params.get("unlockThemes") === "1";
const themeParam = params.get("theme");

if (navigator.webdriver && unlockThemes) {
  progression.unlock(featureUnlockKey(FEATURE_IDS.THEME_PACK));
}

if (navigator.webdriver && uiCapture) {
  for (const el of document.querySelectorAll("canvas")) {
    el.style.display = "none";
    el.width = 0;
    el.height = 0;
  }
}

const game = new Game({ canvas, bossCanvas, input, data: DATA, rng, state, ui: null, unlocks: shop });
const ui = new UI({ data: DATA, game, progression, shop });
game.ui = ui;
ui.init();

if (loadingScreen) {
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    loadingScreen.classList.add("is-hidden");
    window.setTimeout(() => loadingScreen.classList.add("hidden"), 300);
  };
  if (document.readyState === "complete") {
    requestAnimationFrame(dismiss);
  } else {
    window.addEventListener("load", () => requestAnimationFrame(dismiss), { once: true });
  }
  window.setTimeout(dismiss, 2500);
}

if (promptProfiles && ui?._showProfileSelectScreen) {
  ui._showProfileSelectScreen();
}

if (navigator.webdriver && themeParam) {
  const theme = String(themeParam || "default").toLowerCase();
  const allowed = new Set(["default", "ember", "aurora", "cinder", "verdant", "nebula"]);
  if (allowed.has(theme)) {
    ui._settings.theme = theme;
    ui._applySettings();
    ui._syncThemeCards();
  }
}

// Debug hooks for automated testing (Playwright) and local dev.
// Not required for gameplay, but useful for verifying boss bars, upgrades, etc.
if (navigator.webdriver || window.location.hash.includes("debug")) window.__td = { game };
if (navigator.webdriver) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("voidPhaseTest") === "1") {
    const mapId = DATA.mapDefs?.[0]?.id;
    const modeId = DATA.modeDefs?.[0]?.id;
    if (mapId && modeId) {
      game.newRun(mapId, modeId, []);
      game.adminSpawnEnemy?.("void_emperor", 1, 0);
      const boss = game.world.enemies.find((e) => e.defId === "void_emperor");
      if (boss) {
        boss.hp = Math.max(1, boss.maxHp * (boss._phase2Threshold ?? 0.2));
        boss._beginPhase2Transition?.();
      }
      game.render();
    }
  }
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el?.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

window.addEventListener("keydown", (ev) => {
  if (ev.code === "KeyF") toggleFullscreen();
});

// Deterministic stepping for the Playwright-based test loop.
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / FIXED_FPS)));
  for (let i = 0; i < steps; i++) game.step(FIXED_DT, { ignoreTimeScale: true });
  game.render();
};

window.render_game_to_text = () => {
  const raw = game.renderGameToText();
  try {
    const payload = JSON.parse(raw);
    payload.coins = progression.coins;
    payload.unlocks = progression.unlocked ? progression.unlocked.size : null;
    return JSON.stringify(payload);
  } catch {
    return raw;
  }
};

function rafLoop() {
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.step(dt);
    game.render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// In webdriver runs (Playwright), rely on advanceTime() for deterministic updates.
if (!navigator.webdriver) rafLoop();
else game.render();
