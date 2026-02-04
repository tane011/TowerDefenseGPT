import { makeRng } from "./core/rng.js";
import { FIXED_DT, FIXED_FPS } from "./core/time.js";
import { DATA } from "./data/index.js";
import { Game } from "./game/Game.js";
import { GameState } from "./game/GameState.js";
import { Input } from "./input/Input.js";
import { UI } from "./ui/UI.js";

const canvas = document.getElementById("game-canvas");
const input = new Input(canvas);

const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
const rng = makeRng(seed);
const state = new GameState({ seed });

const game = new Game({ canvas, input, data: DATA, rng, state, ui: null });
const ui = new UI({ data: DATA, game });
game.ui = ui;
ui.init();

// Debug hooks for automated testing (Playwright) and local dev.
// Not required for gameplay, but useful for verifying boss bars, upgrades, etc.
if (navigator.webdriver || window.location.hash.includes("debug")) window.__td = { game };

function toggleFullscreen() {
  const el = document.getElementById("game-area");
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
  for (let i = 0; i < steps; i++) game.step(FIXED_DT);
  game.render();
};

window.render_game_to_text = () => game.renderGameToText();

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
