import { fmt } from "../core/math.js";
import { MapInstance } from "../world/Map.js";

const TARGETING_OPTIONS = [
  { value: "first", label: "First (most progressed)" },
  { value: "last", label: "Last (least progressed)" },
  { value: "strongest", label: "Strongest (highest HP)" },
  { value: "weakest", label: "Weakest (lowest HP)" },
  { value: "closest", label: "Closest" },
  { value: "farthest", label: "Farthest" },
  { value: "random", label: "Random" },
];

const TUTORIAL_STEPS = [
  {
    title: "Choose a tower to build",
    body:
      "Pick a tower from the Build panel or press Enter to arm build mode, then use the arrow keys to cycle.",
    hint: "Tip: High‑cost towers need planning—start with a cheap DPS + slow combo.",
  },
  {
    title: "Place towers on build tiles",
    body:
      "Click a build tile to place. Towers cannot be placed on the path. Right‑click or Esc cancels build mode.",
    hint: "Try placing near corners to maximize time on target.",
  },
  {
    title: "Start waves and manage tempo",
    body:
      "Press Space or use “Start Next Wave.” Auto mode keeps waves flowing, but you’ll need strong scaling.",
    hint: "You earn bonus gold between waves, so timing matters.",
  },
  {
    title: "Upgrade and lock a path",
    body:
      "Select a tower to see upgrades. Tier‑1 choices branch the tower—locked options stay visible but greyed.",
    hint: "Path colors match tier dots and crowns on the tower.",
  },
  {
    title: "Targeting modes and abilities",
    body:
      "Use targeting modes to handle rushers or elites. Some towers have abilities, auras, or summons.",
    hint: "Use First for general waves, Strongest for elites, and Closest for fast leaks.",
  },
  {
    title: "Modes and modifiers",
    body:
      "Pick a game mode and modifiers on the start screen to shape difficulty, rewards, and wave structure.",
    hint: "Modifiers stack—try a small set before using Add All.",
  },
];

const COACHMARK_STEPS = [
  {
    target: "#tower-palette",
    title: "Build your first tower",
    body: "Choose a tower from the Build panel. Cheap towers get you started fast.",
    align: "right",
  },
  {
    target: "#next-wave-btn",
    title: "Start the first wave",
    body: "Press Space or click here to begin. You can pause with P at any time.",
    align: "right",
  },
  {
    target: "#selected-actions",
    title: "Upgrade and specialize",
    body: "Select a tower to unlock upgrades and choose a path. Locked options stay visible.",
    align: "right",
  },
];

const DEFAULT_SETTINGS = {
  autoStartWaves: false,
  showAllRanges: false,
  showAuraRings: true,
  vfxScale: 1,
  reduceMotion: false,
  showGrid: true,
  showDecor: true,
  showPathGlow: true,
  showVignette: true,
  showProjectiles: true,
  showEnemyHealthBars: true,
  showAllyHealthBars: true,
  showStatusGlyphs: true,
  showStatusAuras: true,
  showBossRings: true,
  showBossBar: true,
};

export class UI {
  constructor({ data, game }) {
    this._data = data;
    this._game = game;

    this._els = {
      startScreen: document.getElementById("start-screen"),
      startBtn: document.getElementById("start-btn"),
      mapSelect: document.getElementById("map-select"),
      modeSelect: document.getElementById("mode-select"),
      modeDesc: document.getElementById("mode-desc"),
      mapPreview: document.getElementById("map-preview"),
      modifierList: document.getElementById("modifier-list"),
      modifierCount: document.getElementById("modifier-count"),
      modifierRandomBtn: document.getElementById("modifier-random-btn"),
      modifierAllBtn: document.getElementById("modifier-all-btn"),
      modifierClearBtn: document.getElementById("modifier-clear-btn"),
      restartBtn: document.getElementById("restart-btn"),
      gameOver: document.getElementById("game-over"),
      gameOverTitle: document.getElementById("game-over-title"),
      gameOverReason: document.getElementById("game-over-reason"),
      tutorialScreen: document.getElementById("tutorial-screen"),
      tutorialBtn: document.getElementById("tutorial-btn"),
      tutorialBtnAlt: document.getElementById("tutorial-btn-alt"),
      tutorialBackBtn: document.getElementById("tutorial-back-btn"),
      tutorialNextBtn: document.getElementById("tutorial-next-btn"),
      tutorialCloseBtn: document.getElementById("tutorial-close-btn"),
      tutorialStepTitle: document.getElementById("tutorial-step-title"),
      tutorialStepBody: document.getElementById("tutorial-step-body"),
      tutorialStepHint: document.getElementById("tutorial-step-hint"),
      tutorialStepProgress: document.getElementById("tutorial-step-progress"),
      coachmarkLayer: document.getElementById("coachmark-layer"),
      coachmarkRing: document.querySelector("#coachmark-layer .coachmark-ring"),
      coachmarkCard: document.querySelector("#coachmark-layer .coachmark-card"),
      coachmarkTitle: document.getElementById("coachmark-title"),
      coachmarkBody: document.getElementById("coachmark-body"),
      coachmarkProgress: document.getElementById("coachmark-progress"),
      coachmarkNextBtn: document.getElementById("coachmark-next"),
      coachmarkSkipBtn: document.getElementById("coachmark-skip"),
      settingAutoWaves: document.getElementById("setting-auto-waves"),
      settingShowRanges: document.getElementById("setting-show-ranges"),
      settingShowAuras: document.getElementById("setting-show-auras"),
      settingReduceVfx: document.getElementById("setting-reduce-vfx"),
      settingReduceMotion: document.getElementById("setting-reduce-motion"),
      settingShowGrid: document.getElementById("setting-show-grid"),
      settingShowDecor: document.getElementById("setting-show-decor"),
      settingShowPathGlow: document.getElementById("setting-show-path-glow"),
      settingShowVignette: document.getElementById("setting-show-vignette"),
      settingShowProjectiles: document.getElementById("setting-show-projectiles"),
      settingShowEnemyHp: document.getElementById("setting-show-enemy-hp"),
      settingShowAllyHp: document.getElementById("setting-show-ally-hp"),
      settingShowStatusGlyphs: document.getElementById("setting-show-status-glyphs"),
      settingShowStatusAuras: document.getElementById("setting-show-status-auras"),
      settingShowBossRings: document.getElementById("setting-show-boss-rings"),
      settingShowBossBar: document.getElementById("setting-show-boss-bar"),
      settingResetCoachmarks: document.getElementById("setting-reset-coachmarks"),

      money: document.getElementById("stat-money"),
      lives: document.getElementById("stat-lives"),
      wave: document.getElementById("stat-wave"),
      threat: document.getElementById("stat-threat"),

      palette: document.getElementById("tower-palette"),
      buildHint: document.getElementById("build-hint"),

      selectedInfo: document.getElementById("selected-info"),
      selectedActions: document.getElementById("selected-actions"),

      nextWaveBtn: document.getElementById("next-wave-btn"),
      toggleAutoBtn: document.getElementById("toggle-auto-btn"),
      wavePreview: document.getElementById("wave-preview"),
      activeModifiers: document.getElementById("active-modifiers"),

      log: document.getElementById("log"),
    };

    this._logItems = [];
    this._paletteButtons = new Map();
    this._modifierSelected = new Set();

    this._selectedUi = {
      towerId: null,
      infoEls: null,
      targetingSelect: null,
      sellBtn: null,
      upgradesById: new Map(), // upgradeId -> { card, btn, badge, reason, cost }
      upgradeNameById: new Map(),
      tiers: new Map(), // tier -> { wrap }
      upgradeEmpty: null,
      upgradeMaxTitle: null,
      upgradeMaxSub: null,
    };

    this._tutorial = {
      open: false,
      step: 0,
      pausedBefore: null,
    };

    this._coachmarks = {
      open: false,
      step: 0,
      pausedBefore: null,
    };

    this._settings = this._loadSettings();
  }

  init() {
    // Populate maps.
    for (const m of this._data.mapDefs) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      this._els.mapSelect.appendChild(opt);
    }

    // Populate modes.
    for (const m of this._data.modeDefs || []) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      this._els.modeSelect.appendChild(opt);
    }
    this._syncModeDescription();
    this._els.modeSelect.addEventListener("change", () => this._syncModeDescription());
    this._els.mapSelect.addEventListener("change", () => this._syncMapPreview());
    this._syncMapPreview();

    // Modifiers.
    this._buildModifierList();

    // Palette.
    this._buildPalette();

    // Tutorial.
    this._bindTutorial();

    // Coachmarks.
    this._bindCoachmarks();

    // Settings.
    this._bindSettings();
    this._syncSettingsUi();
    this._applySettings();

    this._els.startBtn.addEventListener("click", () => {
      const mapId = this._els.mapSelect.value;
      const modeId = this._els.modeSelect.value;
      const modifierIds = [...this._modifierSelected];
      this._els.startScreen.classList.add("hidden");
      this._els.gameOver.classList.add("hidden");
      this._els.gameOver.classList.remove("victory");
      this._game.newRun(mapId, modeId, modifierIds);
      this.refreshPaletteCosts();
      setTimeout(() => this.maybeShowCoachmarks(), 60);
    });

    this._els.restartBtn.addEventListener("click", () => {
      this._els.gameOver.classList.add("hidden");
      this._els.gameOver.classList.remove("victory");
      this._els.startScreen.classList.remove("hidden");
    });

    this._els.nextWaveBtn.addEventListener("click", () => this._game.startNextWave());
    this._els.toggleAutoBtn.addEventListener("click", () => this._game.toggleAuto());
  }

  isTutorialOpen() {
    return this._tutorial.open;
  }

  toggleTutorial() {
    if (this._tutorial.open) this.hideTutorial();
    else this.showTutorial();
  }

  showTutorial() {
    if (!this._els.tutorialScreen) return;
    this._tutorial.open = true;
    this._tutorial.step = 0;
    if (this._game?.state?.mode === "playing") {
      this._tutorial.pausedBefore = this._game.state.paused;
      this._game.state.paused = true;
    }
    this._els.tutorialScreen.classList.remove("hidden");
    this._renderTutorial();
  }

  hideTutorial() {
    if (!this._els.tutorialScreen) return;
    this._tutorial.open = false;
    if (this._tutorial.pausedBefore != null && this._game?.state?.mode === "playing") {
      this._game.state.paused = this._tutorial.pausedBefore;
    }
    this._tutorial.pausedBefore = null;
    this._els.tutorialScreen.classList.add("hidden");
  }

  _bindTutorial() {
    const open = () => this.showTutorial();
    this._els.tutorialBtn?.addEventListener("click", open);
    this._els.tutorialBtnAlt?.addEventListener("click", open);
    this._els.tutorialCloseBtn?.addEventListener("click", () => this.hideTutorial());
    this._els.tutorialNextBtn?.addEventListener("click", () => this._shiftTutorialStep(1));
    this._els.tutorialBackBtn?.addEventListener("click", () => this._shiftTutorialStep(-1));
  }

  _shiftTutorialStep(delta) {
    const max = TUTORIAL_STEPS.length - 1;
    if (delta > 0 && this._tutorial.step >= max) {
      this.hideTutorial();
      return;
    }
    this._tutorial.step = Math.min(max, Math.max(0, this._tutorial.step + delta));
    this._renderTutorial();
  }

  _renderTutorial() {
    const step = TUTORIAL_STEPS[this._tutorial.step];
    if (!step) return;
    if (this._els.tutorialStepTitle) this._els.tutorialStepTitle.textContent = step.title;
    if (this._els.tutorialStepBody) this._els.tutorialStepBody.textContent = step.body;
    if (this._els.tutorialStepHint) this._els.tutorialStepHint.textContent = step.hint || "";
    if (this._els.tutorialStepProgress) {
      this._els.tutorialStepProgress.textContent = `Step ${this._tutorial.step + 1} of ${TUTORIAL_STEPS.length}`;
    }
    if (this._els.tutorialBackBtn) this._els.tutorialBackBtn.disabled = this._tutorial.step <= 0;
    if (this._els.tutorialNextBtn) {
      const isLast = this._tutorial.step >= TUTORIAL_STEPS.length - 1;
      this._els.tutorialNextBtn.textContent = isLast ? "Finish" : "Next";
    }
  }

  maybeShowCoachmarks() {
    if (this._coachmarks.open) return;
    if (!this._els.coachmarkLayer) return;
    if (this._game?.state?.mode !== "playing") return;
    if (this._game?.state?.waveNumber !== 0) return;
    const seen = window.localStorage?.getItem("td_coachmarks_seen_v1");
    if (seen) return;
    this.showCoachmarks();
  }

  showCoachmarks() {
    if (!this._els.coachmarkLayer) return;
    this._coachmarks.open = true;
    this._coachmarks.step = 0;
    if (this._game?.state?.mode === "playing") {
      this._coachmarks.pausedBefore = this._game.state.paused;
      this._game.state.paused = true;
    }
    this._els.coachmarkLayer.classList.remove("hidden");
    this._renderCoachmarks();
  }

  hideCoachmarks(markSeen = true) {
    if (!this._els.coachmarkLayer) return;
    this._coachmarks.open = false;
    if (this._coachmarks.pausedBefore != null && this._game?.state?.mode === "playing") {
      this._game.state.paused = this._coachmarks.pausedBefore;
    }
    this._coachmarks.pausedBefore = null;
    if (markSeen) window.localStorage?.setItem("td_coachmarks_seen_v1", "1");
    this._els.coachmarkLayer.classList.add("hidden");
  }

  _bindCoachmarks() {
    if (this._els.coachmarkNextBtn) {
      this._els.coachmarkNextBtn.addEventListener("click", () => this._shiftCoachmark(1));
    }
    if (this._els.coachmarkSkipBtn) {
      this._els.coachmarkSkipBtn.addEventListener("click", () => this.hideCoachmarks(true));
    }
    window.addEventListener("resize", () => {
      if (this._coachmarks.open) this._renderCoachmarks();
    });
  }

  _bindSettings() {
    this._els.settingAutoWaves?.addEventListener("change", (ev) => {
      this._settings.autoStartWaves = Boolean(ev.target.checked);
      this._applySettings(true);
    });
    this._els.settingShowRanges?.addEventListener("change", (ev) => {
      this._settings.showAllRanges = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowAuras?.addEventListener("change", (ev) => {
      this._settings.showAuraRings = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingReduceVfx?.addEventListener("change", (ev) => {
      this._settings.vfxScale = ev.target.checked ? 0.6 : 1;
      this._applySettings();
    });
    this._els.settingReduceMotion?.addEventListener("change", (ev) => {
      this._settings.reduceMotion = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowGrid?.addEventListener("change", (ev) => {
      this._settings.showGrid = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowDecor?.addEventListener("change", (ev) => {
      this._settings.showDecor = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowPathGlow?.addEventListener("change", (ev) => {
      this._settings.showPathGlow = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowVignette?.addEventListener("change", (ev) => {
      this._settings.showVignette = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowProjectiles?.addEventListener("change", (ev) => {
      this._settings.showProjectiles = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowEnemyHp?.addEventListener("change", (ev) => {
      this._settings.showEnemyHealthBars = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowAllyHp?.addEventListener("change", (ev) => {
      this._settings.showAllyHealthBars = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowStatusGlyphs?.addEventListener("change", (ev) => {
      this._settings.showStatusGlyphs = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowStatusAuras?.addEventListener("change", (ev) => {
      this._settings.showStatusAuras = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowBossRings?.addEventListener("change", (ev) => {
      this._settings.showBossRings = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingShowBossBar?.addEventListener("change", (ev) => {
      this._settings.showBossBar = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingResetCoachmarks?.addEventListener("click", () => {
      window.localStorage?.removeItem("td_coachmarks_seen_v1");
      this._game?.log?.("Tutorial tips reset.");
    });
  }

  _syncSettingsUi() {
    if (this._els.settingAutoWaves) this._els.settingAutoWaves.checked = Boolean(this._settings.autoStartWaves);
    if (this._els.settingShowRanges) this._els.settingShowRanges.checked = Boolean(this._settings.showAllRanges);
    if (this._els.settingShowAuras) this._els.settingShowAuras.checked = this._settings.showAuraRings !== false;
    if (this._els.settingReduceVfx) this._els.settingReduceVfx.checked = (this._settings.vfxScale ?? 1) < 1;
    if (this._els.settingReduceMotion) this._els.settingReduceMotion.checked = Boolean(this._settings.reduceMotion);
    if (this._els.settingShowGrid) this._els.settingShowGrid.checked = this._settings.showGrid !== false;
    if (this._els.settingShowDecor) this._els.settingShowDecor.checked = this._settings.showDecor !== false;
    if (this._els.settingShowPathGlow) this._els.settingShowPathGlow.checked = this._settings.showPathGlow !== false;
    if (this._els.settingShowVignette) this._els.settingShowVignette.checked = this._settings.showVignette !== false;
    if (this._els.settingShowProjectiles) this._els.settingShowProjectiles.checked = this._settings.showProjectiles !== false;
    if (this._els.settingShowEnemyHp) this._els.settingShowEnemyHp.checked = this._settings.showEnemyHealthBars !== false;
    if (this._els.settingShowAllyHp) this._els.settingShowAllyHp.checked = this._settings.showAllyHealthBars !== false;
    if (this._els.settingShowStatusGlyphs) this._els.settingShowStatusGlyphs.checked = this._settings.showStatusGlyphs !== false;
    if (this._els.settingShowStatusAuras) this._els.settingShowStatusAuras.checked = this._settings.showStatusAuras !== false;
    if (this._els.settingShowBossRings) this._els.settingShowBossRings.checked = this._settings.showBossRings !== false;
    if (this._els.settingShowBossBar) this._els.settingShowBossBar.checked = this._settings.showBossBar !== false;
  }

  _applySettings(logAuto = false) {
    if (!this._game?.state) return;
    this._game.state.settings = { ...DEFAULT_SETTINGS, ...this._settings };
    if (this._game.world) this._game.world.settings = this._game.state.settings;
    this._saveSettings();
    if (this._game.state.mode === "playing") {
      if (this._game.state.autoNextWave !== this._settings.autoStartWaves) {
        this._game.state.autoNextWave = this._settings.autoStartWaves;
        if (logAuto) this._game.log(this._settings.autoStartWaves ? "Auto waves: ON" : "Auto waves: OFF");
      }
    }
  }

  _loadSettings() {
    try {
      const raw = window.localStorage?.getItem("td_settings_v1");
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  _saveSettings() {
    try {
      window.localStorage?.setItem("td_settings_v1", JSON.stringify(this._settings));
    } catch {
      // Ignore storage errors.
    }
  }

  _shiftCoachmark(delta) {
    const max = COACHMARK_STEPS.length - 1;
    if (delta > 0 && this._coachmarks.step >= max) {
      this.hideCoachmarks(true);
      return;
    }
    this._coachmarks.step = Math.min(max, Math.max(0, this._coachmarks.step + delta));
    this._renderCoachmarks();
  }

  _renderCoachmarks() {
    if (!this._els.coachmarkLayer || !this._coachmarks.open) return;
    const step = COACHMARK_STEPS[this._coachmarks.step];
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) return;
    if (this._els.coachmarkTitle) this._els.coachmarkTitle.textContent = step.title;
    if (this._els.coachmarkBody) this._els.coachmarkBody.textContent = step.body;
    if (this._els.coachmarkProgress) {
      this._els.coachmarkProgress.textContent = `Tip ${this._coachmarks.step + 1} of ${COACHMARK_STEPS.length}`;
    }
    if (this._els.coachmarkNextBtn) {
      const isLast = this._coachmarks.step >= COACHMARK_STEPS.length - 1;
      this._els.coachmarkNextBtn.textContent = isLast ? "Finish" : "Next";
    }

    const rect = target.getBoundingClientRect();
    const ringPad = 8;
    const ring = this._els.coachmarkRing;
    if (ring) {
      ring.style.left = `${rect.left - ringPad}px`;
      ring.style.top = `${rect.top - ringPad}px`;
      ring.style.width = `${rect.width + ringPad * 2}px`;
      ring.style.height = `${rect.height + ringPad * 2}px`;
    }

    const card = this._els.coachmarkCard;
    if (!card) return;
    card.style.left = "0px";
    card.style.top = "0px";
    card.style.transform = "translate(-9999px, -9999px)";

    const cardRect = card.getBoundingClientRect();
    const padding = 12;
    let left = rect.right + padding;
    let top = rect.top;
    const align = step.align || "right";
    if (align === "left") {
      left = rect.left - cardRect.width - padding;
      top = rect.top;
    } else if (align === "bottom") {
      left = rect.left;
      top = rect.bottom + padding;
    } else if (align === "top") {
      left = rect.left;
      top = rect.top - cardRect.height - padding;
    }

    const maxLeft = window.innerWidth - cardRect.width - padding;
    const maxTop = window.innerHeight - cardRect.height - padding;
    left = Math.max(padding, Math.min(maxLeft, left));
    top = Math.max(padding, Math.min(maxTop, top));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.transform = "translate(0, 0)";
  }

  _buildPalette() {
    const palette = this._els.palette;
    palette.innerHTML = "";
    this._paletteButtons.clear();

    for (const def of Object.values(this._data.towerDefs)) {
      const btn = document.createElement("button");
      btn.textContent = `${def.name} (${this._game.getTowerCost(def)}g)`;
      btn.title = `${def.role}`;
      btn.addEventListener("click", () => {
        const cur = this._game.state.buildTowerId;
        this._game.state.buildTowerId = cur === def.id ? null : def.id;
      });
      palette.appendChild(btn);
      this._paletteButtons.set(def.id, btn);
    }

    this._els.buildHint.textContent =
      "Pick a tower, then click a build tile. Right‑click or Esc to cancel. Q sells selected tower.";
  }

  refreshPaletteCosts() {
    for (const def of Object.values(this._data.towerDefs)) {
      const btn = this._paletteButtons.get(def.id);
      if (!btn) continue;
      btn.textContent = `${def.name} (${this._game.getTowerCost(def)}g)`;
    }
  }

  setStats(s) {
    this._els.money.textContent = String(s.money);
    this._els.lives.textContent = String(s.lives);
    const waveSuffix = s.waveGoal ? ` / ${s.waveGoal}` : "";
    this._els.wave.textContent = `${s.wave}${waveSuffix}`;
    this._els.threat.textContent = s.threat == null ? "-" : String(s.threat);
    this._els.toggleAutoBtn.textContent = `Auto: ${s.auto ? "On" : "Off"}`;
    this._els.nextWaveBtn.disabled = Boolean(s.inWave);

    for (const def of Object.values(this._data.towerDefs)) {
      const btn = this._paletteButtons.get(def.id);
      if (!btn) continue;
      const cost = this._game.getTowerCost(def);
      btn.classList.toggle("costly", s.money < cost);
    }
  }

  setWavePreview(meta) {
    if (!meta) {
      this._els.wavePreview.textContent = "Preview appears when a wave starts.";
      return;
    }
    this._els.wavePreview.textContent = `Incoming: ${meta.label} | Clear bonus: +${meta.rewardBonus}g`;
  }

  setBuildSelection(towerId) {
    for (const [id, btn] of this._paletteButtons) {
      btn.classList.toggle("ok", id === towerId);
    }
  }

  setSelected(sel) {
    const info = this._els.selectedInfo;
    const actions = this._els.selectedActions;

    if (!sel) {
      this._selectedUi.towerId = null;
      this._selectedUi.infoEls = null;
      this._selectedUi.targetingSelect = null;
      this._selectedUi.sellBtn = null;
      this._selectedUi.upgradesById.clear();
      this._selectedUi.upgradeNameById.clear();
      this._selectedUi.tiers.clear();
      this._selectedUi.upgradeEmpty = null;
      this._selectedUi.upgradeMaxTitle = null;
      this._selectedUi.upgradeMaxSub = null;
      info.className = "muted small";
      info.textContent = "Nothing selected.";
      actions.innerHTML = "";
      return;
    }
    const { tower, def, stats } = sel;
    if (!def || !stats) {
      info.className = "muted small";
      info.textContent = "Selection missing data.";
      actions.innerHTML = "";
      return;
    }

    // (Re)build DOM only when selection changes. Rebuilding every frame breaks click
    // interactions because the button can be replaced between mousedown and mouseup.
    if (this._selectedUi.towerId !== tower.id) {
      this._selectedUi.towerId = tower.id;
      this._selectedUi.upgradesById.clear();
      this._selectedUi.upgradeNameById.clear();

      info.className = "small";
      info.innerHTML = "";
      actions.innerHTML = "";

      // Info panel
      const title = document.createElement("div");
      title.className = "selected-title";
      title.textContent = `${def.name} — ${def.role}`;

      const sub = document.createElement("div");
      sub.className = "selected-sub muted";
      sub.textContent = `Tile: (${tower.tx}, ${tower.ty})`;

      const statsEl = document.createElement("div");
      statsEl.className = "selected-stats";

      info.appendChild(title);
      info.appendChild(sub);
      info.appendChild(statsEl);

      // Controls
      const controls = document.createElement("div");
      controls.className = "selected-controls";

      const targetingRow = document.createElement("div");
      targetingRow.className = "field-row";
      const targetingLabel = document.createElement("label");
      targetingLabel.textContent = "Targeting";
      targetingLabel.htmlFor = "targeting-select";

      const targetingSelect = document.createElement("select");
      targetingSelect.id = "targeting-select";
      const optDefault = document.createElement("option");
      optDefault.value = "";
      optDefault.textContent = "Default";
      targetingSelect.appendChild(optDefault);
      for (const opt of TARGETING_OPTIONS) {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        targetingSelect.appendChild(o);
      }
      targetingSelect.addEventListener("change", () => {
        const v = targetingSelect.value;
        this._game.setTowerTargetingOverride(tower.id, v ? v : null);
      });

      targetingRow.appendChild(targetingLabel);
      targetingRow.appendChild(targetingSelect);
      controls.appendChild(targetingRow);

      const sellBtn = document.createElement("button");
      sellBtn.className = "danger";
      sellBtn.textContent = "Sell (70% refund)";
      sellBtn.addEventListener("click", () => this._game.sellSelectedTower());
      controls.appendChild(sellBtn);

      actions.appendChild(controls);

      const upgradeWrap = document.createElement("div");
      upgradeWrap.className = "upgrade-wrap";
      actions.appendChild(upgradeWrap);

      const upgradeEmpty = document.createElement("div");
      upgradeEmpty.className = "upgrade-empty upgrade-maxed";
      const upgradeMaxTitle = document.createElement("div");
      upgradeMaxTitle.className = "upgrade-maxed-title";
      upgradeMaxTitle.textContent = "Maxed";
      const upgradeMaxSub = document.createElement("div");
      upgradeMaxSub.className = "upgrade-maxed-sub";
      upgradeMaxSub.textContent = "Path complete.";
      upgradeEmpty.appendChild(upgradeMaxTitle);
      upgradeEmpty.appendChild(upgradeMaxSub);
      upgradeEmpty.style.display = "none";
      upgradeWrap.appendChild(upgradeEmpty);

      // Precompute upgrade name map for better lock reasons.
      for (const up of def.upgrades || []) this._selectedUi.upgradeNameById.set(up.id, up.name);

      // Group upgrades by tier.
      const byTier = new Map();
      for (const up of def.upgrades || []) {
        const tier = up.tier ?? 1;
        if (!byTier.has(tier)) byTier.set(tier, []);
        byTier.get(tier).push(up);
      }

      const tiers = [...byTier.keys()].sort((a, b) => a - b);
      for (const tier of tiers) {
        const wrap = document.createElement("div");
        wrap.className = "upgrade-tier-wrap";
        upgradeWrap.appendChild(wrap);

        const head = document.createElement("div");
        head.className = "upgrade-tier";
        head.textContent = `Tier ${tier}`;
        wrap.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "upgrade-grid";
        wrap.appendChild(grid);

        for (const up of byTier.get(tier)) {
          const card = document.createElement("div");
          card.className = "upgrade-card";

          const top = document.createElement("div");
          top.className = "upgrade-top";

          const name = document.createElement("div");
          name.className = "upgrade-name";
          if (up.tier === 1) {
            const accent = getUpgradeAccent(def, up);
            const dot = document.createElement("span");
            dot.className = "upgrade-path-dot";
            if (accent) dot.style.background = accent;
            name.appendChild(dot);
          }
          const label = document.createElement("span");
          label.textContent = up.name;
          name.appendChild(label);

          const cost = document.createElement("div");
          cost.className = "upgrade-cost muted";
          cost.textContent = `${up.cost ?? 0}g`;

          const badge = document.createElement("span");
          badge.className = "badge";
          badge.textContent = "Locked";

          top.appendChild(name);
          top.appendChild(cost);
          top.appendChild(badge);

          const desc = document.createElement("div");
          desc.className = "upgrade-desc muted";
          desc.textContent = up.description || "";

          const tagRow = document.createElement("div");
          tagRow.className = "upgrade-tags";
          const tags = getUpgradeTags(up, def);
          if (tags.length) {
            for (const tag of tags) {
              const span = document.createElement("span");
              span.className = `upgrade-tag ${tag.type}`;
              span.textContent = tag.label;
              tagRow.appendChild(span);
            }
          }

          const reason = document.createElement("div");
          reason.className = "upgrade-reason muted";

          const btn = document.createElement("button");
          btn.className = "ok";
          btn.textContent = "Buy";
          btn.addEventListener("click", () => this._game.buyUpgrade(up.id));

          card.appendChild(top);
          card.appendChild(desc);
          if (tags.length) card.appendChild(tagRow);
          card.appendChild(reason);
          card.appendChild(btn);
          grid.appendChild(card);

          this._selectedUi.upgradesById.set(up.id, { card, btn, badge, reason, cost });
        }

        this._selectedUi.tiers.set(tier, { wrap });
      }

      this._selectedUi.infoEls = { statsEl };
      this._selectedUi.targetingSelect = targetingSelect;
      this._selectedUi.sellBtn = sellBtn;
      this._selectedUi.upgradeEmpty = upgradeEmpty;
      this._selectedUi.upgradeMaxTitle = upgradeMaxTitle;
      this._selectedUi.upgradeMaxSub = upgradeMaxSub;
    }

    // Update dynamic fields without rebuilding the DOM.
    const statsEl = this._selectedUi.infoEls?.statsEl;
    if (statsEl) {
      const lines = [];
      if (stats.aura) {
        lines.push(`Aura radius: ${Math.round(stats.aura.radius ?? 0)}`);
        const buffs = Object.entries(stats.aura.buffs || {})
          .map(([k, v]) => `${k}×${fmt(v, 2)}`)
          .join(", ");
        if (buffs) lines.push(`Buffs: ${buffs}`);
      } else {
        lines.push(`Range: ${Math.round(stats.range)} | Targeting: ${labelForTargeting(stats.targeting)}`);
        lines.push(`Damage: ${Math.round(stats.damage)} (${stats.damageType}) | Fire: ${fmt(stats.fireRate, 2)}/s`);
        lines.push(`Splash: ${Math.round(stats.splashRadius) || "-"} | Projectile: ${Math.round(stats.projectileSpeed)}`);
        if (stats.onHitEffects?.length) lines.push(`On-hit: ${stats.onHitEffects.map((e) => e.type).join(", ")}`);
      }

      if (stats.ability) {
        const count = stats.ability.count ? ` x${stats.ability.count}` : "";
        lines.push(`Ability: ${stats.ability.name || "Ability"} (CD ${fmt(stats.ability.cooldown ?? 0, 1)}s${count})`);
        if (stats.ability.summon) {
          const s = stats.ability.summon;
          lines.push(
            `Summon: ${s.name || "Unit"} | HP ${Math.round(s.hp ?? 0)} | Dmg ${Math.round(s.damage ?? 0)} (${s.damageType || stats.damageType})`
          );
          lines.push(
            `Summon FR ${fmt(s.fireRate ?? 0, 2)}/s | Range ${Math.round(s.range ?? 0)} | Life ${fmt(s.lifetime ?? 0, 1)}s`
          );
          lines.push(`Summon Speed ${Math.round(s.speed ?? 0)} | Projectile ${Math.round(s.projectileSpeed ?? 0)}`);
          if (s.chain) {
            lines.push(`Summon Chain: jumps ${s.chain.maxJumps ?? 0} | range ${Math.round(s.chain.range ?? 0)}`);
          }
          if (s.onHitEffects?.length) lines.push(`Summon On-hit: ${s.onHitEffects.map((e) => e.type).join(", ")}`);
        }
      }

      statsEl.innerHTML = lines.map((l) => `<div>${l}</div>`).join("");
    }

    // Targeting dropdown: show override value (empty = default).
    if (this._selectedUi.targetingSelect) {
      const override = tower.targetingOverride ?? null;
      this._selectedUi.targetingSelect.value = override ? normalizeTargeting(override) : "";
      const defOpt = this._selectedUi.targetingSelect.options?.[0];
      if (defOpt) {
        if (stats.aura) {
          defOpt.textContent = "N/A (Support)";
        } else {
          const baseTargeting = tower.computeStats(def, { ignoreOverride: true, modifiers: this._game.modifierState }).targeting;
          defOpt.textContent = `Default (${labelForTargeting(baseTargeting)})`;
        }
      }
      this._selectedUi.targetingSelect.disabled = Boolean(stats.aura);
    }

    // Upgrades: set availability, reasons, and status badges.
    const money = this._game.state.money;
    const idToUp = new Map((def.upgrades || []).map((u) => [u.id, u]));
    const ownedIds = tower.appliedUpgrades;
    const tier1Upgrades = (def.upgrades || []).filter((u) => (u.tier ?? 1) === 1);
    const chosenTier1 = tier1Upgrades.find((u) => ownedIds.has(u.id)) || null;
    const rootCache = new Map();

    const getUpgradeRoots = (upId, stack = new Set()) => {
      if (rootCache.has(upId)) return rootCache.get(upId);
      const up = idToUp.get(upId);
      if (!up) return new Set();
      const tier = up.tier ?? 1;
      if (tier === 1) {
        const roots = new Set([upId]);
        rootCache.set(upId, roots);
        return roots;
      }
      const roots = new Set();
      const reqs = up.requires || [];
      for (const req of reqs) {
        if (stack.has(req)) continue;
        stack.add(req);
        for (const r of getUpgradeRoots(req, stack)) roots.add(r);
        stack.delete(req);
      }
      rootCache.set(upId, roots);
      return roots;
    };

    const getPathLockReason = (up) => {
      if (chosenTier1) {
        const roots = getUpgradeRoots(up.id);
        if (roots.size && !roots.has(chosenTier1.id)) {
          return `Path locked by: ${chosenTier1.name}`;
        }
      }
      const excludesOwned = (up.excludes || []).filter((x) => ownedIds.has(x));
      const ownedExcludes = [...ownedIds].filter((id) => (idToUp.get(id)?.excludes || []).includes(up.id));
      const blockers = [...excludesOwned, ...ownedExcludes];
      if (blockers.length) {
        const names = blockers.map((id) => this._selectedUi.upgradeNameById.get(id) || id);
        return `Path locked by: ${names.join(", ")}`;
      }

      const reqs = up.requires || [];
      for (const req of reqs) {
        const reqDef = idToUp.get(req);
        const reqExcludesOwned = (reqDef?.excludes || []).filter((x) => ownedIds.has(x));
        const ownedExcludesReq = [...ownedIds].filter((id) => (idToUp.get(id)?.excludes || []).includes(req));
        if (reqExcludesOwned.length || ownedExcludesReq.length) {
          const reqName = this._selectedUi.upgradeNameById.get(req) || req;
          return `Requires ${reqName} (path locked)`;
        }
      }
      return null;
    };

    const remaining = (def.upgrades || []).filter((u) => !ownedIds.has(u.id));
    const available = remaining.filter((u) => !getPathLockReason(u));
    const tierFrom = (list) => (list.length ? Math.min(...list.map((u) => u.tier ?? 1)) : null);
    const activeTier = tierFrom(available) ?? tierFrom(remaining);

    // Show only the active tier.
    for (const [tier, node] of this._selectedUi.tiers.entries()) {
      node.wrap.classList.toggle("hidden", activeTier != null ? tier !== activeTier : true);
    }
    if (this._selectedUi.upgradeEmpty) {
      const maxed = activeTier == null;
      this._selectedUi.upgradeEmpty.style.display = maxed ? "block" : "none";
      if (maxed) {
        const pathAccent = chosenTier1 ? getUpgradeAccent(def, chosenTier1) : def.color;
        const pathLabel = chosenTier1 ? chosenTier1.name : def.name;
        if (this._selectedUi.upgradeMaxTitle) this._selectedUi.upgradeMaxTitle.textContent = "Maxed";
        if (this._selectedUi.upgradeMaxSub) this._selectedUi.upgradeMaxSub.textContent = `Path: ${pathLabel}`;
        if (pathAccent) this._selectedUi.upgradeEmpty.style.setProperty("--accent", pathAccent);
      }
    }

    for (const up of def.upgrades || []) {
      const row = this._selectedUi.upgradesById.get(up.id);
      if (!row) continue;

      const hidden = activeTier != null && (up.tier ?? 1) !== activeTier;
      row.card.classList.toggle("hidden", hidden);
      if (hidden) continue;

      const pathLockReason = getPathLockReason(up);
      const pathLocked = Boolean(pathLockReason);

      const owned = tower.appliedUpgrades.has(up.id);
      const cost = this._game.getUpgradeCost(up);
      const canAfford = money >= cost;
      const missingReq = (up.requires || []).filter((r) => !tower.appliedUpgrades.has(r));
      const conflicts = (up.excludes || []).filter((x) => tower.appliedUpgrades.has(x));
      const hasReq = missingReq.length === 0;
      const noConflict = conflicts.length === 0;
      const canBuy = !owned && canAfford && hasReq && noConflict && !pathLocked;

      row.cost.textContent = `${cost}g`;

      if (owned) {
        row.card.classList.add("owned");
        row.badge.textContent = "Owned";
        row.badge.classList.remove("locked");
        row.badge.classList.add("owned");
        row.btn.disabled = true;
        row.btn.textContent = "Owned";
        row.reason.textContent = "";
        continue;
      }

      row.card.classList.remove("owned");
      row.badge.classList.remove("owned");
      row.badge.classList.toggle("locked", !canBuy);
      row.badge.textContent = pathLocked ? "Path Locked" : canBuy ? "Available" : "Locked";
      row.card.classList.toggle("path-locked", pathLocked);
      row.btn.disabled = !canBuy;
      row.btn.textContent = `Buy (-${cost}g)`;

      const reasons = [];
      if (pathLocked) {
        reasons.push(pathLockReason);
      } else {
        if (!canAfford) reasons.push(`Need ${cost - money}g`);
        if (!hasReq) reasons.push(`Requires: ${missingReq.map((id) => this._selectedUi.upgradeNameById.get(id) || id).join(", ")}`);
        if (!noConflict) reasons.push(`Blocked by: ${conflicts.map((id) => this._selectedUi.upgradeNameById.get(id) || id).join(", ")}`);
      }
      row.reason.textContent = reasons.join(" • ");
      row.btn.title = up.description || "";
    }
  }

  setActiveModifiers(names) {
    const el = this._els.activeModifiers;
    if (!el) return;
    if (!names || !names.length) {
      el.textContent = "None";
      el.classList.add("muted");
      return;
    }
    el.classList.remove("muted");
    el.innerHTML = names.map((n) => `<div class="modifier-pill">${n}</div>`).join("");
  }

  log(message) {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    this._logItems.push(`[${time}] ${message}`);
    if (this._logItems.length > 80) this._logItems.shift();

    this._els.log.innerHTML = this._logItems
      .slice()
      .reverse()
      .map((t) => `<div class="item">${t}</div>`)
      .join("");
  }

  _syncModeDescription() {
    const modeId = this._els.modeSelect?.value;
    const mode = (this._data.modeDefs || []).find((m) => m.id === modeId);
    if (this._els.modeDesc) this._els.modeDesc.textContent = mode?.description || "";
  }

  _buildModifierList() {
    const list = this._els.modifierList;
    if (!list) return;
    list.innerHTML = "";
    this._modifierSelected.clear();

    for (const mod of this._data.modifierDefs || []) {
      const label = document.createElement("label");
      label.className = "modifier-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = mod.id;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) this._modifierSelected.add(mod.id);
        else this._modifierSelected.delete(mod.id);
        this._syncModifierCount();
      });

      const meta = document.createElement("div");
      meta.className = "modifier-meta";
      const name = document.createElement("div");
      name.className = "modifier-name";
      name.textContent = mod.name;
      const desc = document.createElement("div");
      desc.className = "modifier-desc muted";
      desc.textContent = mod.description || "";
      meta.appendChild(name);
      meta.appendChild(desc);

      label.appendChild(checkbox);
      label.appendChild(meta);
      list.appendChild(label);
    }

    this._syncModifierCount();

    this._els.modifierRandomBtn?.addEventListener("click", () => this._randomizeModifiers());
    this._els.modifierAllBtn?.addEventListener("click", () => this._selectAllModifiers());
    this._els.modifierClearBtn?.addEventListener("click", () => this._clearModifiers());
  }

  _syncModifierCount() {
    if (!this._els.modifierCount) return;
    const count = this._modifierSelected.size;
    this._els.modifierCount.textContent = count ? `${count} selected` : "No modifiers selected";
  }

  _randomizeModifiers() {
    const defs = this._data.modifierDefs || [];
    if (!defs.length || !this._els.modifierList) return;
    const count = Math.min(defs.length, Math.max(2, Math.floor(2 + Math.random() * 4)));
    const picks = new Set();
    while (picks.size < count) {
      const mod = defs[Math.floor(Math.random() * defs.length)];
      if (mod) picks.add(mod.id);
    }

    this._modifierSelected.clear();
    for (const label of this._els.modifierList.querySelectorAll("label.modifier-item")) {
      const input = label.querySelector("input");
      if (!input) continue;
      const checked = picks.has(input.value);
      input.checked = checked;
      if (checked) this._modifierSelected.add(input.value);
    }
    this._syncModifierCount();
  }

  _selectAllModifiers() {
    const defs = this._data.modifierDefs || [];
    if (!defs.length || !this._els.modifierList) return;
    this._modifierSelected.clear();
    for (const input of this._els.modifierList.querySelectorAll("input[type='checkbox']")) {
      input.checked = true;
      this._modifierSelected.add(input.value);
    }
    this._syncModifierCount();
  }

  _clearModifiers() {
    this._modifierSelected.clear();
    if (this._els.modifierList) {
      for (const input of this._els.modifierList.querySelectorAll("input[type='checkbox']")) {
        input.checked = false;
      }
    }
    this._syncModifierCount();
  }

  _syncMapPreview() {
    const canvas = this._els.mapPreview;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mapId = this._els.mapSelect?.value;
    const mapDef = this._data.mapDefs.find((m) => m.id === mapId) ?? this._data.mapDefs[0];
    if (!mapDef) return;

    const map = new MapInstance(mapDef);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1022";
    ctx.fillRect(0, 0, w, h);

    const mapW = map.cols * map.tileSize;
    const mapH = map.rows * map.tileSize;
    const scale = Math.min(w / mapW, h / mapH) * 0.92;
    const offsetX = (w - mapW * scale) / 2;
    const offsetY = (h - mapH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Grid
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(231,236,255,0.12)";
    ctx.lineWidth = 1 / scale;
    for (let x = 0; x <= map.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * map.tileSize + 0.5, 0);
      ctx.lineTo(x * map.tileSize + 0.5, map.rows * map.tileSize);
      ctx.stroke();
    }
    for (let y = 0; y <= map.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * map.tileSize + 0.5);
      ctx.lineTo(map.cols * map.tileSize, y * map.tileSize + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Path tiles + path line
    ctx.fillStyle = "rgba(106,164,255,0.12)";
    for (let ty = 0; ty < map.rows; ty++) {
      for (let tx = 0; tx < map.cols; tx++) {
        if (!map.isPathTile(tx, ty)) continue;
        ctx.fillRect(tx * map.tileSize, ty * map.tileSize, map.tileSize, map.tileSize);
      }
    }

    ctx.strokeStyle = "rgba(106,164,255,0.85)";
    ctx.lineWidth = 5 / scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const poly of map.paths) {
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.stroke();
    }

    // Decor
    if (map.decor?.length) {
      for (const d of map.decor) {
        const size = (d.size ?? 1) * map.tileSize * 0.3;
        const x = d.x;
        const y = d.y;
        ctx.fillStyle = d.type === "tree" ? "rgba(52,211,153,0.8)" : d.type === "crystal" ? "rgba(125,211,252,0.85)" : "rgba(100,116,139,0.75)";
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Base + spawn
    ctx.fillStyle = "rgba(251,113,133,0.8)";
    ctx.beginPath();
    ctx.arc(map.base.x, map.base.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(34,197,94,0.8)";
    for (const sp of map.spawnPoints) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  showGameOver(reason) {
    this.showGameOverWithTitle("Game Over", reason);
  }

  showGameOverWithTitle(title, reason) {
    if (this._els.gameOverTitle) this._els.gameOverTitle.textContent = title;
    this._els.gameOverReason.textContent = reason;
    if (this._els.gameOver) this._els.gameOver.classList.toggle("victory", /victory/i.test(title));
    this._els.gameOver.classList.remove("hidden");
  }
}

function normalizeTargeting(value) {
  const v = String(value || "").toLowerCase();
  if (v === "strong") return "strongest";
  return v;
}

function labelForTargeting(value) {
  const v = normalizeTargeting(value);
  const found = TARGETING_OPTIONS.find((o) => o.value === v);
  return found ? found.label.split(" ")[0] : v || "-";
}

function getUpgradeAccent(def, up) {
  if (!def?.upgrades?.length) return null;
  const tier = up?.tier ?? 1;
  if (tier !== 1) return null;
  const tier1 = def.upgrades.filter((u) => (u.tier ?? 1) === 1);
  if (!tier1.length) return null;
  const idx = tier1.findIndex((u) => u.id === up.id);
  if (idx < 0) return null;
  const palette = getTowerPathPalette(def, tier1.length);
  return palette[idx % palette.length] ?? def?.color ?? null;
}

function getTowerPathPalette(def, count) {
  if (Array.isArray(def?.pathColors) && def.pathColors.length) return def.pathColors;
  const base = parseHexColor(def?.color);
  if (!base) return ["#60a5fa", "#f59e0b", "#a78bfa", "#34d399"];
  const hsl = rgbToHsl(base.r, base.g, base.b);
  const offsets = [24, -24, 60, -60];
  const colors = [];
  const wanted = Math.max(2, count || 2);
  for (let i = 0; i < wanted; i++) {
    const hue = (hsl.h + offsets[i % offsets.length] + 360) % 360;
    const sat = clamp(hsl.s * 1.05, 0.2, 0.9);
    const lum = clamp(hsl.l + (i % 2 === 0 ? 0.08 : -0.04), 0.25, 0.8);
    const rgb = hslToRgb(hue, sat, lum);
    colors.push(rgbToCss(rgb));
  }
  return colors;
}

function parseHexColor(hex) {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = Number.parseInt(h[0] + h[0], 16);
    const g = Number.parseInt(h[1] + h[1], 16);
    const b = Number.parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbToHsl(r, g, b) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getUpgradeTags(up, def) {
  const fx = up.effects || {};
  const tags = [];
  const isSummonTower = def?.stats?.ability?.type === "summon";
  const touchesAbility = Boolean(fx.abilityAdd || fx.abilityMul || fx.setAbility);
  const touchesSummon = Boolean(
    fx.abilityAdd?.summon ||
      fx.abilityMul?.summon ||
      (isSummonTower && touchesAbility) ||
      fx.abilityAdd?.count
  );

  if (touchesSummon) tags.push({ type: "summon", label: "Summon" });
  else if (touchesAbility) tags.push({ type: "ability", label: "Ability" });
  if (fx.auraAdd) tags.push({ type: "aura", label: "Aura" });
  if (fx.chainAdd || fx.chainMul || fx.setChain) tags.push({ type: "chain", label: "Chain" });
  if (fx.statsAdd?.critChance || fx.statsMul?.critMult) tags.push({ type: "crit", label: "Crit" });
  return tags;
}
