import { fmt } from "../core/math.js";
import { MapInstance } from "../world/Map.js";
import { buildTowerSprites } from "../render/sprites.js";
import { buildSprites } from "../render/sprites.js";
import { calculateCoinReward, computeModifierCoinMultiplier } from "../meta/rewards.js";
import {
  FEATURE_IDS,
  mapUnlockKey,
  modeUnlockKey,
  towerUnlockKey,
  modifierUnlockKey,
  featureUnlockKey,
  defaultUnlocks,
} from "../meta/unlocks.js";

function findClosestSegment(path, tx, ty) {
  if (!path || path.length < 2) return null;
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-6;
    const t = Math.max(0, Math.min(1, ((tx - a.x) * dx + (ty - a.y) * dy) / len2));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const dist2 = (tx - px) * (tx - px) + (ty - py) * (ty - py);
    if (!best || dist2 < best.dist2) best = { index: i, dist2 };
  }
  return best;
}

function computePathLength(path) {
  if (!path || path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dy = path[i + 1].y - path[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function countPathOverlaps(paths) {
  if (!paths || !paths.length) return 0;
  const counts = new Map();
  for (const path of paths) {
    if (!path || path.length < 2) continue;
    const tiles = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = Math.max(1, Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const x = Math.round(a.x + (b.x - a.x) * t);
        const y = Math.round(a.y + (b.y - a.y) * t);
        tiles.add(`${x},${y}`);
      }
    }
    for (const key of tiles) counts.set(key, (counts.get(key) || 0) + 1);
  }
  let overlaps = 0;
  for (const count of counts.values()) if (count > 1) overlaps += 1;
  return overlaps;
}

const TARGETING_OPTIONS = [
  { value: "first", label: "First (most progressed)" },
  { value: "last", label: "Last (least progressed)" },
  { value: "strongest", label: "Strongest (highest HP)" },
  { value: "weakest", label: "Weakest (lowest HP)" },
  { value: "closest", label: "Closest" },
  { value: "farthest", label: "Farthest" },
  { value: "random", label: "Random" },
];

const PROFILE_SLOT_KEY = "td_profile_slot_v1";
const PROFILE_STORAGE_PREFIX = "td_profile_v1_";
const PROFILE_LAST_REAL_KEY = "td_profile_slot_last_real_v1";
const PROFILE_SLOTS = Object.freeze([
  { id: "slot-1", name: "Slot 1" },
  { id: "slot-2", name: "Slot 2" },
  { id: "slot-3", name: "Slot 3" },
  { id: "slot-4", name: "Debug" },
]);
const THEME_CHOICES = Object.freeze(["default", "ember", "aurora", "cinder", "verdant", "nebula"]);
const DEBUG_PROFILE_ID = "slot-4";

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
  keepBuildMode: true,
  autoSelectBuilt: true,
  pauseOnWaveEnd: false,
  pauseOnBossWave: false,
  showAllRanges: false,
  showAuraRings: true,
  vfxScale: 1,
  reduceMotion: false,
  disableUiAnimations: false,
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
  cinematicUi: false,
  theme: "default",
};

const CUSTOM_MODE_STORAGE_KEY = "td_custom_modes_v1";
const CUSTOM_MAP_STORAGE_KEY = "td_custom_maps_v1";

const DEFAULT_CUSTOM_START = {
  moneyAdd: 0,
  moneyMul: 1,
  livesAdd: 0,
  livesMul: 1,
};

const DEFAULT_CUSTOM_DIFFICULTY = {
  budgetMul: 1,
  intervalMul: 1,
  eliteMult: 1,
  bossMult: 1,
  hpMul: 1,
  hpScale: 0.022,
  hpLateStart: 18,
  hpLateScale: 0.008,
  seenShieldBase: 8,
  seenShieldScale: 1.6,
  seenShieldMul: 1,
  rewardBonusMul: 1,
  rewardBonusAdd: 0,
  finalBossMult: 1,
  earlyWaves: 0,
  earlyBudgetMul: 1,
  earlyIntervalMul: 1,
  earlyHpMul: 1,
  earlyHpScaleMul: 1,
  earlyEliteMult: 1,
  earlySeenShieldMul: 1,
  earlyRewardWaves: 0,
  earlyRewardAdd: 0,
};

const DEFAULT_CUSTOM_MODE = {
  name: "Custom Mode",
  description: "Custom ruleset.",
  totalWaves: 0,
  eliteEvery: 5,
  bossEvery: 10,
  finalBoss: "",
  recommendedMap: "",
  requiredMap: "",
  start: { ...DEFAULT_CUSTOM_START },
  difficulty: { ...DEFAULT_CUSTOM_DIFFICULTY },
  enemyPool: [],
  elitePool: [],
  bossPool: [],
};

const DEFAULT_CUSTOM_MAP = {
  name: "Custom Map",
  tileSize: 30,
  cols: 32,
  rows: 18,
  startingMoney: 150,
  startingLives: 20,
  base: { x: 30, y: 9 },
  paths: [[{ x: 0, y: 9 }, { x: 30, y: 9 }]],
  decor: [],
};

const MAP_TOOL = {
  PATH: "path",
  BASE: "base",
  DECOR: "decor",
  ERASE: "erase",
};

export class UI {
  constructor({ data, game, progression, shop, cloud }) {
    this._data = data;
    this._game = game;
    this._progression = progression;
    this._shop = shop;
    this._cloud = cloud || null;

    this._els = {
      titleScreen: document.getElementById("title-screen"),
      setupScreen: document.getElementById("setup-screen"),
      startBtn: document.getElementById("start-btn"),
      shopOpen: document.getElementById("shop-open"),
      shopOpenAlt: document.getElementById("shop-open-alt"),
      openSetup: document.getElementById("open-setup"),
      setupBack: document.getElementById("setup-back"),
      codexOpen: document.getElementById("codex-open"),
      settingsOpen: document.getElementById("settings-open"),
      themesOpen: document.getElementById("themes-open"),
      settingsScreen: document.getElementById("settings-screen"),
      settingsClose: document.getElementById("settings-close"),
      themesScreen: document.getElementById("themes-screen"),
      themesClose: document.getElementById("themes-close"),
      themeCards: document.querySelectorAll(".theme-card"),
      savesOpen: document.getElementById("saves-open"),
      savesScreen: document.getElementById("saves-screen"),
      savesClose: document.getElementById("saves-close"),
      savesList: document.getElementById("saves-list"),
      savesStatus: document.getElementById("saves-status"),
      savesOpenAlt: document.getElementById("saves-open-alt"),
      profileSelectScreen: document.getElementById("profile-select-screen"),
      profileSelectList: document.getElementById("profile-select-list"),
      statsOpen: document.getElementById("stats-open"),
      statsScreen: document.getElementById("stats-screen"),
      statsClose: document.getElementById("stats-close"),
      codexScreen: document.getElementById("codex-screen"),
      codexClose: document.getElementById("codex-close"),
      codexLocked: document.getElementById("codex-locked"),
      codexBody: document.getElementById("codex-body"),
      codexList: document.getElementById("codex-list"),
      codexTabs: document.querySelectorAll(".codex-tab"),
      codexDetail: document.getElementById("codex-detail"),
      codexDetailClose: document.getElementById("codex-detail-close"),
      codexDetailBody: document.getElementById("codex-detail-body"),
      codexDetailName: document.getElementById("codex-detail-name"),
      codexDetailSub: document.getElementById("codex-detail-sub"),
      shopScreen: document.getElementById("shop-screen"),
      shopClose: document.getElementById("shop-close"),
      shopList: document.getElementById("shop-list"),
      shopTabs: document.querySelectorAll("[data-shop-tab]"),
      shopCoinCount: document.getElementById("shop-coin-count"),
      shopStatus: document.getElementById("shop-status"),
      mapSelect: document.getElementById("map-select"),
      customMapOpen: document.getElementById("custom-map-open"),
      customMapCount: document.getElementById("custom-map-count"),
      customMapScreen: document.getElementById("custom-map-screen"),
      customMapClose: document.getElementById("custom-map-close"),
      customMapSelect: document.getElementById("custom-map-select"),
      customMapNew: document.getElementById("custom-map-new"),
      customMapDelete: document.getElementById("custom-map-delete"),
      customMapTemplate: document.getElementById("custom-map-template"),
      customMapLoadTemplate: document.getElementById("custom-map-load-template"),
      customMapReset: document.getElementById("custom-map-reset"),
      customMapSave: document.getElementById("custom-map-save"),
      customMapSaveCopy: document.getElementById("custom-map-save-copy"),
      customMapStatus: document.getElementById("custom-map-status"),
      customMapWarnings: document.getElementById("custom-map-warnings"),
      customMapName: document.getElementById("custom-map-name"),
      customMapCols: document.getElementById("custom-map-cols"),
      customMapRows: document.getElementById("custom-map-rows"),
      customMapTileSize: document.getElementById("custom-map-tile-size"),
      customMapStartMoney: document.getElementById("custom-map-start-money"),
      customMapStartLives: document.getElementById("custom-map-start-lives"),
      customMapBaseX: document.getElementById("custom-map-base-x"),
      customMapBaseY: document.getElementById("custom-map-base-y"),
      customMapCanvas: document.getElementById("custom-map-canvas"),
      customMapCursor: document.getElementById("custom-map-cursor"),
      customMapToolPath: document.getElementById("custom-map-tool-path"),
      customMapToolBase: document.getElementById("custom-map-tool-base"),
      customMapToolDecor: document.getElementById("custom-map-tool-decor"),
      customMapToolErase: document.getElementById("custom-map-tool-erase"),
      customMapSnap: document.getElementById("custom-map-snap"),
      customMapBuildable: document.getElementById("custom-map-buildable"),
      customMapPathSelect: document.getElementById("custom-map-path-select"),
      customMapPathAdd: document.getElementById("custom-map-path-add"),
      customMapPathRemove: document.getElementById("custom-map-path-remove"),
      customMapPathUndo: document.getElementById("custom-map-path-undo"),
      customMapPathClear: document.getElementById("custom-map-path-clear"),
      customMapFix: document.getElementById("custom-map-fix"),
      customMapPathInfo: document.getElementById("custom-map-path-info"),
      customMapDecorType: document.getElementById("custom-map-decor-type"),
      customMapDecorSize: document.getElementById("custom-map-decor-size"),
      customMapDecorClear: document.getElementById("custom-map-decor-clear"),
      customMapJson: document.getElementById("custom-map-json"),
      customMapExport: document.getElementById("custom-map-export"),
      customMapCopy: document.getElementById("custom-map-copy"),
      customMapImport: document.getElementById("custom-map-import"),
      modeSelect: document.getElementById("mode-select"),
      modeBadge: document.getElementById("mode-badge"),
      modeDesc: document.getElementById("mode-desc"),
      runModeName: document.getElementById("run-mode-name"),
      runWaves: document.getElementById("run-waves"),
      runElites: document.getElementById("run-elites"),
      runBosses: document.getElementById("run-bosses"),
      runStartCash: document.getElementById("run-start-cash"),
      runStartLives: document.getElementById("run-start-lives"),
      runInterval: document.getElementById("run-interval"),
      runHp: document.getElementById("run-hp"),
      runElitePower: document.getElementById("run-elite-power"),
      runBossPower: document.getElementById("run-boss-power"),
      runCoinMult: document.getElementById("run-coin-mult"),
      mapPreview: document.getElementById("map-preview"),
      sidePanel: document.getElementById("side-panel"),
      customModeOpen: document.getElementById("custom-mode-open"),
      customModeCount: document.getElementById("custom-mode-count"),
      customModeScreen: document.getElementById("custom-mode-screen"),
      customModeClose: document.getElementById("custom-mode-close"),
      customModeSelect: document.getElementById("custom-mode-select"),
      customModeNew: document.getElementById("custom-mode-new"),
      customModeDelete: document.getElementById("custom-mode-delete"),
      customModeTemplate: document.getElementById("custom-mode-template"),
      customModeLoadTemplate: document.getElementById("custom-mode-load-template"),
      customModeReset: document.getElementById("custom-mode-reset"),
      customModeSave: document.getElementById("custom-mode-save"),
      customModeSaveCopy: document.getElementById("custom-mode-save-copy"),
      customModeStatus: document.getElementById("custom-mode-status"),
      customModeWarnings: document.getElementById("custom-mode-warnings"),
      customModeName: document.getElementById("custom-mode-name"),
      customModeDescription: document.getElementById("custom-mode-description"),
      customModeTotalWaves: document.getElementById("custom-mode-total-waves"),
      customModeEliteEvery: document.getElementById("custom-mode-elite-every"),
      customModeBossEvery: document.getElementById("custom-mode-boss-every"),
      customModeFinalBoss: document.getElementById("custom-mode-final-boss"),
      customModeRecommendedMap: document.getElementById("custom-mode-recommended-map"),
      customModeRequiredMap: document.getElementById("custom-mode-required-map"),
      customModeStartMoneyAdd: document.getElementById("custom-mode-start-money-add"),
      customModeStartMoneyMul: document.getElementById("custom-mode-start-money-mul"),
      customModeStartLivesAdd: document.getElementById("custom-mode-start-lives-add"),
      customModeStartLivesMul: document.getElementById("custom-mode-start-lives-mul"),
      customModeBudgetMul: document.getElementById("custom-mode-budget-mul"),
      customModeIntervalMul: document.getElementById("custom-mode-interval-mul"),
      customModeEliteMult: document.getElementById("custom-mode-elite-mult"),
      customModeBossMult: document.getElementById("custom-mode-boss-mult"),
      customModeHpMul: document.getElementById("custom-mode-hp-mul"),
      customModeHpScale: document.getElementById("custom-mode-hp-scale"),
      customModeHpLateStart: document.getElementById("custom-mode-hp-late-start"),
      customModeHpLateScale: document.getElementById("custom-mode-hp-late-scale"),
      customModeSeenShieldBase: document.getElementById("custom-mode-seen-shield-base"),
      customModeSeenShieldScale: document.getElementById("custom-mode-seen-shield-scale"),
      customModeSeenShieldMul: document.getElementById("custom-mode-seen-shield-mul"),
      customModeFinalBossMult: document.getElementById("custom-mode-final-boss-mult"),
      customModeRewardBonusMul: document.getElementById("custom-mode-reward-bonus-mul"),
      customModeRewardBonusAdd: document.getElementById("custom-mode-reward-bonus-add"),
      customModeEarlyRewardWaves: document.getElementById("custom-mode-early-reward-waves"),
      customModeEarlyRewardAdd: document.getElementById("custom-mode-early-reward-add"),
      customModeEarlyWaves: document.getElementById("custom-mode-early-waves"),
      customModeEarlyBudgetMul: document.getElementById("custom-mode-early-budget-mul"),
      customModeEarlyIntervalMul: document.getElementById("custom-mode-early-interval-mul"),
      customModeEarlyHpMul: document.getElementById("custom-mode-early-hp-mul"),
      customModeEarlyHpScaleMul: document.getElementById("custom-mode-early-hp-scale-mul"),
      customModeEarlyEliteMult: document.getElementById("custom-mode-early-elite-mult"),
      customModeEarlySeenShieldMul: document.getElementById("custom-mode-early-seen-shield-mul"),
      customModeEnemyPool: document.getElementById("custom-mode-enemy-pool"),
      customModeElitePool: document.getElementById("custom-mode-elite-pool"),
      customModeBossPool: document.getElementById("custom-mode-boss-pool"),
      customModeEnemyAdd: document.getElementById("custom-mode-enemy-add"),
      customModeEliteAdd: document.getElementById("custom-mode-elite-add"),
      customModeBossAdd: document.getElementById("custom-mode-boss-add"),
      customModeJson: document.getElementById("custom-mode-json"),
      customModeExport: document.getElementById("custom-mode-export"),
      customModeCopy: document.getElementById("custom-mode-copy"),
      customModeImport: document.getElementById("custom-mode-import"),
      modifierList: document.getElementById("modifier-list"),
      modifierCount: document.getElementById("modifier-count"),
      modifierRandomBtn: document.getElementById("modifier-random-btn"),
      modifierAllBtn: document.getElementById("modifier-all-btn"),
      modifierClearBtn: document.getElementById("modifier-clear-btn"),
      modifierLocked: document.getElementById("modifier-locked"),
      restartBtn: document.getElementById("restart-btn"),
      gameOver: document.getElementById("game-over"),
      gameOverTitle: document.getElementById("game-over-title"),
      gameOverReason: document.getElementById("game-over-reason"),
      gameOverCoins: document.getElementById("game-over-coins"),
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
      statsRuns: document.getElementById("stats-runs"),
      statsVictories: document.getElementById("stats-victories"),
      statsWaves: document.getElementById("stats-waves"),
      statsCoins: document.getElementById("stats-coins"),
      statsWinRate: document.getElementById("stats-win-rate"),
      statsAvgWaves: document.getElementById("stats-avg-waves"),
      statsAvgCoins: document.getElementById("stats-avg-coins"),
      statsBestWaves: document.getElementById("stats-best-waves"),
      statsBestCoins: document.getElementById("stats-best-coins"),
      statsCurrentStreak: document.getElementById("stats-current-streak"),
      statsLongestStreak: document.getElementById("stats-longest-streak"),
      statsTotalDamage: document.getElementById("stats-total-damage"),
      statsTotalKills: document.getElementById("stats-total-kills"),
      statsTotalTime: document.getElementById("stats-total-time"),
      statsAvgDamage: document.getElementById("stats-avg-damage"),
      statsAvgKills: document.getElementById("stats-avg-kills"),
      statsAvgTime: document.getElementById("stats-avg-time"),
      statsBestDamage: document.getElementById("stats-best-damage"),
      statsBestKills: document.getElementById("stats-best-kills"),
      statsBestTime: document.getElementById("stats-best-time"),
      statsDamagePerMin: document.getElementById("stats-damage-per-min"),
      statsKillsPerMin: document.getElementById("stats-kills-per-min"),
      statsCoinsPerMin: document.getElementById("stats-coins-per-min"),
      statsDamagePerWave: document.getElementById("stats-damage-per-wave"),
      statsKillsPerWave: document.getElementById("stats-kills-per-wave"),
      statsCoinsPerWave: document.getElementById("stats-coins-per-wave"),
      statsRecentWinRate: document.getElementById("stats-recent-win-rate"),
      statsRecentAvgWaves: document.getElementById("stats-recent-avg-waves"),
      statsRecentAvgCoins: document.getElementById("stats-recent-avg-coins"),
      statsLastRun: document.getElementById("stats-last-run"),
      statsPie: document.getElementById("stats-pie"),
      statsLine: document.getElementById("stats-line"),
      statsChartWaves: document.getElementById("stats-chart-waves"),
      statsChartDamage: document.getElementById("stats-chart-damage"),
      statsChartTime: document.getElementById("stats-chart-time"),
      statsBody: document.getElementById("stats-body"),
      statsLocked: document.getElementById("stats-locked"),
      settingAutoWaves: document.getElementById("setting-auto-waves"),
      settingKeepBuild: document.getElementById("setting-keep-build"),
      settingAutoSelect: document.getElementById("setting-auto-select"),
      settingPauseWaveEnd: document.getElementById("setting-pause-wave-end"),
      settingPauseBoss: document.getElementById("setting-pause-boss"),
      settingShowRanges: document.getElementById("setting-show-ranges"),
      settingShowAuras: document.getElementById("setting-show-auras"),
      settingReduceVfx: document.getElementById("setting-reduce-vfx"),
      settingReduceMotion: document.getElementById("setting-reduce-motion"),
      settingDisableAnimations: document.getElementById("setting-disable-animations"),
      settingCinematicUi: document.getElementById("setting-cinematic-ui"),
      settingTheme: document.getElementById("setting-theme"),
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
      settingResetDefaults: document.getElementById("setting-reset-defaults"),
      settingResetCoachmarks: document.getElementById("setting-reset-coachmarks"),
      cloudStatus: document.getElementById("cloud-status"),
      cloudLastSync: document.getElementById("cloud-last-sync"),
      cloudSigninEmail: document.getElementById("cloud-signin-email"),
      cloudSignout: document.getElementById("cloud-signout"),
      cloudSave: document.getElementById("cloud-save"),
      cloudLoad: document.getElementById("cloud-load"),
      cloudAuthScreen: document.getElementById("cloud-auth-screen"),
      cloudAuthClose: document.getElementById("cloud-auth-close"),
      cloudAuthEmail: document.getElementById("cloud-auth-email"),
      cloudAuthPassword: document.getElementById("cloud-auth-password"),
      cloudAuthLogin: document.getElementById("cloud-auth-login"),
      cloudAuthCreate: document.getElementById("cloud-auth-create"),
      cloudAuthError: document.getElementById("cloud-auth-error"),
      authGate: document.getElementById("auth-gate"),
      authGateStatus: document.getElementById("auth-gate-status"),
      authGateEmail: document.getElementById("auth-gate-email"),

      money: document.getElementById("stat-money"),
      lives: document.getElementById("stat-lives"),
      wave: document.getElementById("stat-wave"),
      threat: document.getElementById("stat-threat"),

      palette: document.getElementById("tower-palette"),
      buildHint: document.getElementById("build-hint"),

      selectedCard: document.getElementById("selected-card"),
      selectedInfo: document.getElementById("selected-info"),
      selectedActions: document.getElementById("selected-actions"),

      nextWaveBtn: document.getElementById("next-wave-btn"),
      skipWaveBtn: document.getElementById("skip-wave-btn"),
      toggleAutoBtn: document.getElementById("toggle-auto-btn"),
      skipWaveHint: document.getElementById("skip-wave-hint"),
      skipWaveHintText: document.getElementById("skip-wave-text"),
      skipWaveStatus: document.getElementById("skip-wave-status"),
      wavePreview: document.getElementById("wave-preview"),
      activeModifiers: document.getElementById("active-modifiers"),

      log: document.getElementById("log"),

      adminPanel: document.getElementById("admin-panel"),
      adminCloseBtn: document.getElementById("admin-close-btn"),
      adminStatusMap: document.getElementById("admin-status-map"),
      adminStatusMode: document.getElementById("admin-status-mode"),
      adminStatusWave: document.getElementById("admin-status-wave"),
      adminStatusTime: document.getElementById("admin-status-time"),
      adminStatusThreat: document.getElementById("admin-status-threat"),
      adminStatusEntities: document.getElementById("admin-status-entities"),
      adminStatusSim: document.getElementById("admin-status-sim"),
      adminStatusSeed: document.getElementById("admin-status-seed"),
      adminTogglePause: document.getElementById("admin-toggle-pause"),
      adminToggleAuto: document.getElementById("admin-toggle-auto"),
      adminTimeScale: document.getElementById("admin-time-scale"),
      adminInvincible: document.getElementById("admin-invincible"),
      adminWaveSet: document.getElementById("admin-wave-set"),
      adminWaveClear: document.getElementById("admin-wave-clear"),
      adminWaveApply: document.getElementById("admin-wave-apply"),
      adminMoneyAmount: document.getElementById("admin-money-amount"),
      adminMoneyAdd: document.getElementById("admin-money-add"),
      adminMoneySet: document.getElementById("admin-money-set"),
      adminLivesAmount: document.getElementById("admin-lives-amount"),
      adminLivesAdd: document.getElementById("admin-lives-add"),
      adminLivesSet: document.getElementById("admin-lives-set"),
      adminEnemySelect: document.getElementById("admin-enemy-select"),
      adminEnemyFilter: document.getElementById("admin-enemy-filter"),
      adminEnemyCount: document.getElementById("admin-enemy-count"),
      adminEnemyPath: document.getElementById("admin-enemy-path"),
      adminEnemySpawn: document.getElementById("admin-enemy-spawn"),
      adminEnemyPreset: document.getElementById("admin-enemy-preset"),
      adminEnemyApplyLive: document.getElementById("admin-enemy-apply-live"),
      adminEnemyClearFx: document.getElementById("admin-enemy-clear-fx"),
      adminEnemyHp: document.getElementById("admin-enemy-hp"),
      adminEnemySpeed: document.getElementById("admin-enemy-speed"),
      adminEnemyElite: document.getElementById("admin-enemy-elite"),
      adminEnemyShield: document.getElementById("admin-enemy-shield"),
      adminEnemyArmor: document.getElementById("admin-enemy-armor"),
      adminEnemyResist: document.getElementById("admin-enemy-resist"),
      adminAllySelect: document.getElementById("admin-ally-select"),
      adminAllyFilter: document.getElementById("admin-ally-filter"),
      adminAllyCount: document.getElementById("admin-ally-count"),
      adminAllyPath: document.getElementById("admin-ally-path"),
      adminAllySpawn: document.getElementById("admin-ally-spawn"),
      adminForceWave: document.getElementById("admin-force-wave"),
      adminForceWaveKeep: document.getElementById("admin-force-wave-keep"),
      adminSkipBoss: document.getElementById("admin-skip-boss"),
      adminStartWave: document.getElementById("admin-start-wave"),
      adminClearTowers: document.getElementById("admin-clear-towers"),
      adminClearAllies: document.getElementById("admin-clear-allies"),
      adminClearEnemies: document.getElementById("admin-clear-enemies"),
      adminClearProjectiles: document.getElementById("admin-clear-projectiles"),
      adminResetCooldowns: document.getElementById("admin-reset-cooldowns"),
      adminClearAll: document.getElementById("admin-clear-all"),
      adminMaxSelected: document.getElementById("admin-max-selected"),
      adminSellSelected: document.getElementById("admin-sell-selected"),
      adminDumpSelected: document.getElementById("admin-dump-selected"),
    };

    this._logItems = [];
    this._paletteButtons = new Map();
    this._modifierSelected = new Set();
    this._modifierActionsBound = false;
    this._runRewarded = false;
    this._lastCoinReward = null;
    this._shopCategory = "Towers";
    this._codexCategory = "Towers";
    this._enemyIconUrls = null;

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
      collapseToken: 0,
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

    this._admin = {
      open: false,
      pausedBefore: null,
      restorePause: true,
    };
    this._adminLists = { enemies: [], allies: [] };

    this._baseMapDefs = [...(this._data.mapDefs || [])];
    this._customMaps = [];
    this._customMapEditingId = null;
    this._customMapDraft = null;
    this._customMapTool = MAP_TOOL.PATH;
    this._customMapSnapAxis = true;
    this._customMapShowBuildable = false;
    this._customMapSelectedPath = 0;
    this._customMapCanvasState = { scale: 1, offsetX: 0, offsetY: 0, tileSize: 30 };
    this._customMapDrag = null;

    this._baseModeDefs = [...(this._data.modeDefs || [])];
    this._customModes = [];
    this._customModeEditingId = null;
    this._enemyList = [];
    this._profiles = [];
    this._activeProfileId = this._getActiveProfileId();
    this._savesOverlay = { pausedBefore: null };
    this._profileSelectOpen = false;

    this._settings = this._loadSettings();
    this._lastFreeMapId = (this._data.mapDefs || [])[0]?.id ?? null;
    this._lastFreeModeId = (this._data.modeDefs || []).find((m) => !m.requiredMap)?.id ?? (this._data.modeDefs || [])[0]?.id ?? null;

    this._towerIconUrls = null;
  }

  init() {
    this._syncCoins();
    this._bindShop();
    this._bindCodex();
    this._ensureActiveProfile();
    this._profiles = this._loadProfiles();
    this._bindProfiles();
    this._bindProfileSelect();
    this._showProfileSelectScreen();
    // Custom maps + map selector.
    this._customMaps = this._loadCustomMaps();
    this._refreshMapDefs();
    this._buildMapSelect();
    this._bindCustomMaps();

    // Custom modes + mode selector.
    this._customModes = this._loadCustomModes();
    this._refreshModeDefs();
    this._syncBundleUnlocks();
    this._buildModeSelect();
    this._enemyList = this._buildEnemyList();
    this._bindCustomModes();
    this._populateCustomMapSelects();
    this._syncModeDescription();
    this._els.modeSelect.addEventListener("change", () => {
      this._applyMapModeLock("mode");
      this._syncModeDescription();
      this._syncMapPreview();
      this._syncRunIntel();
    });
    this._els.mapSelect.addEventListener("change", () => {
      this._applyMapModeLock("map");
      this._syncModeDescription();
      this._syncMapPreview();
      this._syncRunIntel();
    });
    this._applyMapModeLock("init");
    this._syncModeDescription();
    this._syncMapPreview();
    this._syncRunIntel();

    // Modifiers.
    this._buildModifierList();
    this._applyModifierLockState();

    // Palette.
    this._buildPalette();

    this._syncBundleUnlocks();
    this._syncFeatureLocks();
    this._buildShop();

    // Tutorial.
    this._bindTutorial();

    // Coachmarks.
    this._bindCoachmarks();

    // Settings.
    this._bindSettings();
    this._bindCloud();
    this._bindThemes();
    this._syncSettingsUi();
    this._applySettings();
    this._setStartMenuOpen(this._isMenuVisible());
    this._ensureMenuVisible();
    this._bindSidePanelScroll();

    // Admin panel (secret).
    this._bindAdmin();
    this._populateAdminLists();
    this._refreshAdminPaths();

    this._els.openSetup?.addEventListener("click", () => {
      if (this._els.titleScreen) this._els.titleScreen.classList.add("hidden");
      if (this._els.setupScreen) this._els.setupScreen.classList.remove("hidden");
      this._setStartMenuOpen(true);
      this._syncCoins();
    });

    this._els.setupBack?.addEventListener("click", () => {
      if (this._els.setupScreen) this._els.setupScreen.classList.add("hidden");
      if (this._els.titleScreen) this._els.titleScreen.classList.remove("hidden");
      this._setStartMenuOpen(true);
      this._syncCoins();
    });

    this._els.settingsOpen?.addEventListener("click", () => this._showSettingsScreen());
    this._els.settingsClose?.addEventListener("click", () => this._hideSettingsScreen());
    this._els.themesOpen?.addEventListener("click", () => this._showThemesFeature());
    this._els.themesClose?.addEventListener("click", () => this._hideThemesScreen());

    this._els.statsOpen?.addEventListener("click", () => this._showStatsScreen());
    this._els.statsClose?.addEventListener("click", () => this._hideStatsScreen());

    this._els.codexOpen?.addEventListener("click", () => this._showCodexScreen());
    this._els.codexClose?.addEventListener("click", () => this._hideCodexScreen());
    this._els.codexDetailClose?.addEventListener("click", () => this._hideBossDetail());
    this._els.codexDetail?.addEventListener("click", (event) => {
      if (event.target === this._els.codexDetail) this._hideBossDetail();
    });
    this._els.codexList?.addEventListener("click", (event) => {
      if (this._codexCategory !== "Bosses") return;
      const card = event.target.closest?.(".codex-item");
      if (!card) return;
      const bossId = card.dataset?.bossId;
      if (bossId) this._showBossDetail(bossId);
    });

    this._els.startBtn.addEventListener("click", () => {
      const mapId = this._els.mapSelect.value;
      const modeId = this._els.modeSelect.value;
      const resolved = this._resolveMapModePair(mapId, modeId, "init");
      const finalMapId = resolved?.mapId ?? mapId;
      const finalModeId = resolved?.modeId ?? modeId;
      const modifierIds = this._isFeatureUnlocked(FEATURE_IDS.MODIFIERS) ? [...this._modifierSelected] : [];
      if (this._els.titleScreen) this._els.titleScreen.classList.add("hidden");
      if (this._els.setupScreen) this._els.setupScreen.classList.add("hidden");
      this._setStartMenuOpen(false);
      this._els.gameOver.classList.add("hidden");
      this._els.gameOver.classList.remove("victory");
      this._runRewarded = false;
      this._lastCoinReward = null;
      this._game.newRun(finalMapId, finalModeId, modifierIds);
      this._applySettings();
      this.refreshPaletteCosts();
      this._refreshAdminPaths();
      setTimeout(() => this.maybeShowCoachmarks(), 60);
    });

    this._els.restartBtn.addEventListener("click", () => {
      this._els.gameOver.classList.add("hidden");
      this._els.gameOver.classList.remove("victory");
      if (this._els.setupScreen) this._els.setupScreen.classList.add("hidden");
      if (this._els.titleScreen) this._els.titleScreen.classList.remove("hidden");
      this._setStartMenuOpen(true);
      this._syncCoins();
    });

    this._els.nextWaveBtn.addEventListener("click", () => this._game.startNextWave());
    this._els.skipWaveBtn?.addEventListener("click", () => this._game.skipWave());
    this._els.toggleAutoBtn.addEventListener("click", () => this._game.toggleAuto());
  }

  _isFeatureUnlocked(featureId) {
    if (!this._shop) return true;
    return this._shop.isFeatureUnlocked(featureId);
  }

  _getUnlockedMapDefs() {
    const defs = this._data.mapDefs || [];
    const includeCustom = this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS);
    return defs.filter((m) => (includeCustom || !m.custom) && (!this._shop || this._shop.isMapUnlocked(m.id)));
  }

  _getUnlockedModeDefs() {
    const defs = this._data.modeDefs || [];
    const includeCustom = this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES);
    return defs.filter((mode) => {
      if (!includeCustom && mode.custom) return false;
      if (!this._shop) return true;
      if (mode.requiredMap) return this._shop.isMapUnlocked(mode.requiredMap);
      return this._shop.isModeUnlocked(mode.id);
    });
  }

  _syncCoins() {
    const coins = this._formatCoinCount(this._progression?.coins || 0);
    if (this._els.shopCoinCount) this._els.shopCoinCount.textContent = coins;
  }

  _formatCoinCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "∞";
    const coins = Math.max(0, Math.round(numeric || 0));
    return String(coins);
  }

  _setShopStatus(message, type = "info") {
    if (!this._els.shopStatus) return;
    this._els.shopStatus.textContent = message || "";
    this._els.shopStatus.classList.toggle("danger", type === "error");
  }

  _bindShop() {
    this._els.shopOpen?.addEventListener("click", () => this._showShopScreen());
    this._els.shopOpenAlt?.addEventListener("click", () => this._showShopScreen());
    this._els.shopClose?.addEventListener("click", () => this._hideShopScreen());
    this._bindShopTabs();
  }

  _bindCodex() {
    if (!this._els.codexTabs || !this._els.codexTabs.length) return;
    for (const btn of this._els.codexTabs) {
      btn.addEventListener("click", () => {
        const next = btn.dataset.codexTab || "Towers";
        this._buildCodex(next);
        this._syncCodexTabs();
      });
    }
  }

  _bindProfiles() {
    this._els.savesOpen?.addEventListener("click", () => this._showSavesScreen());
    this._els.savesOpenAlt?.addEventListener("click", () => this._showSavesScreen(true));
    this._els.savesClose?.addEventListener("click", () => this._hideSavesScreen());
    this._els.savesList?.addEventListener("click", (event) => {
      const btn = event.target?.closest?.("[data-profile-switch]");
      if (!btn) return;
      const slotId = btn.dataset.profileSwitch || "";
      this._switchProfile(slotId);
    });
  }

  _bindProfileSelect() {
    this._els.profileSelectList?.addEventListener("click", (event) => {
      const btn = event.target?.closest?.("[data-profile-select]");
      if (!btn) return;
      const slotId = btn.dataset.profileSelect || "";
      this._selectProfileFromStartup(slotId);
    });
  }

  _showProfileSelectScreen() {
    if (!this._els.profileSelectScreen || !this._els.profileSelectList) return;
    this._renderProfileSelectScreen();
    this._els.profileSelectScreen.classList.remove("hidden");
    this._profileSelectOpen = true;
  }

  _hideProfileSelectScreen() {
    if (!this._els.profileSelectScreen) return;
    this._els.profileSelectScreen.classList.add("hidden");
    this._profileSelectOpen = false;
  }

  _selectProfileFromStartup(slotId) {
    if (!slotId || this._isDebugProfile(slotId)) return;
    if (slotId !== this._activeProfileId) {
      this._switchProfile(slotId);
    }
    this._hideProfileSelectScreen();
  }

  _readProfileMeta(slotId) {
    const defaults = defaultUnlocks();
    const fallback = {
      coins: 0,
      unlockedCount: defaults.length,
      unlockedIds: defaults,
      runs: 0,
      victories: 0,
      bestWaves: 0,
      bestCoins: 0,
      totalWaves: 0,
      totalCoins: 0,
      lastPlayed: null,
    };
    try {
      const raw = window.localStorage?.getItem(this._profileStorageKey(slotId));
      if (!raw) return fallback;
      const payload = JSON.parse(raw);
      const coinsRaw = payload?.coins;
      const coins = coinsRaw === "inf" ? Number.POSITIVE_INFINITY : Number.parseInt(coinsRaw, 10);
      const unlocked = Array.isArray(payload?.unlocked)
        ? payload.unlocked.filter((id) => typeof id === "string" && id)
        : defaults;
      const stats = payload?.stats || {};
      const runs = Math.max(0, Math.round(stats.runs || 0));
      const victories = Math.max(0, Math.round(stats.victories || 0));
      const bestWaves = Math.max(0, Math.round(stats.bestWaves || 0));
      const bestCoins = Math.max(0, Math.round(stats.bestCoins || 0));
      const totalWaves = Math.max(0, Math.round(stats.totalWaves || 0));
      const totalCoins = Math.max(0, Math.round(stats.totalCoins || 0));
      const history = Array.isArray(stats.history) ? stats.history : [];
      const lastTs = history[0]?.ts ? Number(history[0].ts) : null;
      return {
        coins: Number.isFinite(coins) ? Math.max(0, coins) : 0,
        unlockedCount: Array.isArray(unlocked) ? unlocked.length : defaults.length,
        unlockedIds: Array.isArray(unlocked) ? unlocked : defaults,
        runs,
        victories,
        bestWaves,
        bestCoins,
        totalWaves,
        totalCoins,
        lastPlayed: Number.isFinite(lastTs) ? lastTs : null,
      };
    } catch {
      return fallback;
    }
  }

  _renderProfileSelectScreen() {
    if (!this._els.profileSelectList) return;
    const list = this._els.profileSelectList;
    list.innerHTML = "";
    const slots = PROFILE_SLOTS.filter((slot) => !this._isDebugProfile(slot.id));
    const paidUnlocks = this._getPaidUnlockSet();
    const paidTotal = paidUnlocks.size;
    for (const slot of slots) {
      const meta = this._readProfileMeta(slot.id);
      const unlockedIds = meta.unlockedIds || [];
      const paidUnlockedCount = unlockedIds.reduce(
        (sum, id) => (paidUnlocks.has(id) ? sum + 1 : sum),
        0,
      );
      const card = document.createElement("div");
      card.className = "profile-select-card";
      if (slot.id === this._activeProfileId) card.classList.add("active");

      const top = document.createElement("div");
      top.className = "profile-select-top";
      const header = document.createElement("div");
      header.className = "profile-select-card-header";
      const titleWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "profile-select-title";
      title.textContent = slot.name;
      titleWrap.appendChild(title);
      header.appendChild(titleWrap);
      const badge = document.createElement("span");
      if (slot.id === this._activeProfileId) {
        badge.className = "profile-select-badge active";
        badge.textContent = "Active";
        header.appendChild(badge);
      } else if (meta.runs === 0) {
        badge.className = "profile-select-badge new";
        badge.textContent = "New";
        header.appendChild(badge);
      }
      top.appendChild(header);

      const topStats = document.createElement("div");
      topStats.className = "profile-select-top-stats";
      const lastPlayedText = meta.lastPlayed ? new Date(meta.lastPlayed).toLocaleDateString() : "Never";
      const topLines = [
        ["Coins", this._formatCoinCount(meta.coins)],
        ["Last Played", lastPlayedText],
      ];
      for (const [label, value] of topLines) {
        const item = document.createElement("div");
        item.className = "profile-select-top-stat";
        const labelEl = document.createElement("div");
        labelEl.className = "profile-select-top-label";
        labelEl.textContent = label;
        const valueEl = document.createElement("div");
        valueEl.className = "profile-select-top-value";
        if (label === "Coins") {
          const icon = document.createElement("span");
          icon.className = "profile-coin-icon";
          valueEl.appendChild(icon);
        }
        valueEl.appendChild(document.createTextNode(value));
        item.appendChild(labelEl);
        item.appendChild(valueEl);
        topStats.appendChild(item);
      }
      top.appendChild(topStats);

      const metaList = document.createElement("div");
      metaList.className = "profile-select-meta";
      const bestCoins = Number.isFinite(meta.bestCoins) ? this._formatCoinCount(meta.bestCoins) : "0";
      const totalCoins = Number.isFinite(meta.totalCoins) ? this._formatCoinCount(meta.totalCoins) : "0";
      const winRate = meta.runs > 0 ? `${Math.round((meta.victories / meta.runs) * 100)}%` : "—";
      const winRateDecimal = meta.runs > 0 ? (meta.victories / meta.runs).toFixed(2) : "0.00";
      const unlockPercent = paidTotal > 0 ? Math.round((paidUnlockedCount / paidTotal) * 100) : 0;
      const lines = [
        ["Unlocked", String(paidUnlockedCount)],
        ["Runs", String(meta.runs)],
        ["Victories", String(meta.victories)],
        ["Win Rate", winRate],
        ["Best Waves", String(meta.bestWaves)],
        ["Best Coins", bestCoins],
        ["Total Waves", String(meta.totalWaves)],
        ["Total Coins", totalCoins],
      ];
      const visual = document.createElement("div");
      visual.className = "profile-select-visual";
      const ring = document.createElement("div");
      ring.className = "profile-ring";
      ring.style.setProperty("--ring", `${unlockPercent}%`);
      const ringLabel = document.createElement("div");
      ringLabel.className = "profile-ring-label";
      const ringValue = document.createElement("div");
      ringValue.className = "profile-ring-value";
      ringValue.textContent = `${unlockPercent}%`;
      const ringSub = document.createElement("div");
      ringSub.className = "profile-ring-sub";
      ringSub.textContent = "Progress";
      ringLabel.appendChild(ringValue);
      ringLabel.appendChild(ringSub);
      ring.appendChild(ringLabel);
      const visualMeta = document.createElement("div");
      visualMeta.className = "profile-mini";
      const miniLines = [
        ["Unlocks", `${paidUnlockedCount} / ${paidTotal}`],
        ["Win Rate", winRateDecimal],
        ["Best Waves", String(meta.bestWaves)],
      ];
      for (const [label, value] of miniLines) {
        const row = document.createElement("div");
        row.className = "profile-mini-row";
        const labelEl = document.createElement("span");
        labelEl.className = "profile-mini-label";
        labelEl.textContent = label;
        const valueEl = document.createElement("span");
        valueEl.className = "profile-mini-value";
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        visualMeta.appendChild(row);
      }
      visual.appendChild(ring);
      visual.appendChild(visualMeta);
      top.appendChild(visual);
      for (const [label, value] of lines) {
        const row = document.createElement("div");
        row.className = "profile-select-row";
        const labelEl = document.createElement("span");
        labelEl.className = "profile-select-label";
        labelEl.textContent = label;
        const valueEl = document.createElement("span");
        valueEl.className = "profile-select-value";
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        metaList.appendChild(row);
      }
      top.appendChild(metaList);
      card.appendChild(top);

      const cta = document.createElement("div");
      cta.className = "profile-select-cta";
      const btn = document.createElement("button");
      btn.className = slot.id === this._activeProfileId ? "profile-select-cta--continue" : "primary";
      btn.type = "button";
      btn.dataset.profileSelect = slot.id;
      btn.textContent = slot.id === this._activeProfileId ? "Continue" : "Select";
      cta.appendChild(btn);
      card.appendChild(cta);

      list.appendChild(card);
    }
  }

  _showShopScreen() {
    if (!this._els.shopScreen) return;
    if (!this._isMenuVisible()) return;
    if (this._shopCategory === "Modifiers" && this._modifiersLocked()) {
      this._shopCategory = "Towers";
    }
    this._buildShop();
    this._syncShopTabs();
    this._els.shopScreen.classList.remove("hidden");
  }

  _hideShopScreen() {
    if (!this._els.shopScreen) return;
    this._els.shopScreen.classList.add("hidden");
  }

  _bindShopTabs() {
    if (!this._els.shopTabs || !this._els.shopTabs.length) return;
    for (const btn of this._els.shopTabs) {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const next = btn.dataset.shopTab || "Towers";
        this._buildShop(next);
        this._syncShopTabs();
      });
    }
  }

  _syncShopTabs() {
    if (!this._els.shopTabs || !this._els.shopTabs.length) return;
    const modifiersLocked = this._modifiersLocked();
    if (this._shopCategory === "Modifiers" && modifiersLocked) this._shopCategory = "Towers";
    const active = this._shopCategory || "Towers";
    for (const btn of this._els.shopTabs) {
      const isActive = btn.dataset.shopTab === active;
      const isModifiers = btn.dataset.shopTab === "Modifiers";
      const locked = isModifiers && modifiersLocked;
      btn.disabled = locked;
      btn.classList.toggle("locked", locked);
      btn.classList.toggle("active", isActive);
    }
  }

  _syncCodexTabs() {
    if (!this._els.codexTabs || !this._els.codexTabs.length) return;
    const active = this._codexCategory || "Towers";
    for (const btn of this._els.codexTabs) {
      const isActive = btn.dataset.codexTab === active;
      btn.classList.toggle("active", isActive);
    }
  }

  _formatAbilityName(ability) {
    if (ability?.name) return ability.name;
    const raw = ability?.type || "Ability";
    return raw
      .toString()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  _hideBossDetail() {
    if (this._els.codexDetail) this._els.codexDetail.classList.add("hidden");
    if (this._els.codexDetailBody) this._els.codexDetailBody.innerHTML = "";
  }

  _showBossDetail(bossId) {
    if (!this._els.codexDetail || !this._els.codexDetailBody) return;
    const def = this._data?.enemyDefs?.[bossId];
    if (!def) return;

    const isFinal = (this._data?.modeDefs || []).some((mode) => mode?.finalBoss === def.id);
    if (this._els.codexDetailName) this._els.codexDetailName.textContent = def.name || def.id;
    if (this._els.codexDetailSub) this._els.codexDetailSub.textContent = isFinal ? "FINAL BOSS" : "BOSS";

    const body = this._els.codexDetailBody;
    body.innerHTML = "";

    const lines = [
      `HP ${Math.round(def.hp ?? 0)} • Armor ${def.armor ?? 0} • Speed ${Math.round(def.speed ?? 0)}`,
      `Reward ${def.reward ?? 0} • Threat ${Math.round((def.threat ?? 0) * 100) / 100}`,
    ];
    for (const line of lines) {
      const row = document.createElement("div");
      row.className = "codex-detail-line";
      row.textContent = line;
      body.appendChild(row);
    }

    const tags = Array.isArray(def.tags) && def.tags.length ? `Tags: ${def.tags.join(", ")}` : "";
    if (tags) {
      const tagEl = document.createElement("div");
      tagEl.className = "codex-detail-tags";
      tagEl.textContent = tags;
      body.appendChild(tagEl);
    }

    const appendAbilitySection = (label, abilities) => {
      if (!Array.isArray(abilities) || !abilities.length) return;
      const block = document.createElement("div");
      block.className = "codex-abilities";
      const title = document.createElement("div");
      title.className = "codex-ability-title";
      title.textContent = label;
      block.appendChild(title);

      for (const ability of abilities) {
        const entry = document.createElement("div");
        entry.className = "codex-ability";

        const entryName = document.createElement("div");
        entryName.className = "codex-ability-name";
        entryName.textContent = this._formatAbilityName(ability);
        entry.appendChild(entryName);

        const entryDesc = document.createElement("div");
        entryDesc.className = "codex-ability-desc muted";
        entryDesc.textContent = ability?.description || "Ability details unavailable.";
        entry.appendChild(entryDesc);

        block.appendChild(entry);
      }

      body.appendChild(block);
    };

    const baseAbilities = Array.isArray(def.abilities) ? def.abilities : [];
    const phase2Abilities = Array.isArray(def.phase2?.abilities) ? def.phase2.abilities : [];
    if (baseAbilities.length) {
      appendAbilitySection(phase2Abilities.length ? "Phase 1 Abilities" : "Abilities", baseAbilities);
    }
    if (phase2Abilities.length) {
      appendAbilitySection("Phase 2 Abilities", phase2Abilities);
    }

    this._els.codexDetail.classList.remove("hidden");
  }

  _buildCodex(category = null) {
    if (!this._els.codexList) return;
    if (category) this._codexCategory = category;
    const locked = !this._isFeatureUnlocked(FEATURE_IDS.CODEX);
    if (this._els.codexLocked) this._els.codexLocked.classList.toggle("hidden", !locked);
    if (this._els.codexBody) this._els.codexBody.classList.toggle("hidden", locked);
    if (locked) return;

    const list = this._els.codexList;
    list.innerHTML = "";
    const active = this._codexCategory || "Towers";
    if (active !== "Bosses") this._hideBossDetail();

    const makeCard = ({ title, subtitle, iconUrl, lines = [], role = "", tagLine = "" } = {}) => {
      const card = document.createElement("div");
      card.className = "codex-item";

      const icon = document.createElement("span");
      icon.className = "codex-icon";
      if (iconUrl) icon.style.setProperty("--codex-icon", `url(${iconUrl})`);
      card.appendChild(icon);

      const body = document.createElement("div");
      body.className = "codex-item-body";

      const name = document.createElement("div");
      name.className = "codex-item-name";
      name.textContent = title || "Unknown";
      body.appendChild(name);

      if (subtitle) {
        const sub = document.createElement("div");
        sub.className = "codex-item-sub muted";
        sub.textContent = subtitle;
        body.appendChild(sub);
      }

      if (role) {
        const roleRow = document.createElement("div");
        roleRow.className = "codex-role-row";
        const roleLabel = document.createElement("span");
        roleLabel.className = "shop-role-label";
        roleLabel.textContent = "Role";
        const roleKey = role.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "other";
        const roleChip = document.createElement("span");
        roleChip.className = `shop-role role-${roleKey}`;
        roleChip.textContent = role;
        roleRow.appendChild(roleLabel);
        roleRow.appendChild(roleChip);
        body.appendChild(roleRow);
      }

      for (const line of lines) {
        const item = document.createElement("div");
        item.className = "codex-item-line muted";
        item.textContent = line;
        body.appendChild(item);
      }

      if (tagLine) {
        const tags = document.createElement("div");
        tags.className = "codex-item-tags muted small";
        tags.textContent = tagLine;
        body.appendChild(tags);
      }

      card.appendChild(body);
      return card;
    };

    if (active === "Towers") {
      const defs = Object.values(this._data.towerDefs || {}).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      for (const def of defs) {
        const stats = def.stats || {};
        const lines = [
          `Cost ${Math.round(def.cost ?? 0)}g • Range ${Math.round(stats.range ?? 0)}`,
          `Damage ${Math.round(stats.damage ?? 0)} • Rate ${Math.round((stats.fireRate ?? 0) * 100) / 100}s`,
          `Type ${stats.damageType || "neutral"} • Target ${stats.targeting || "first"}`,
        ];
        list.appendChild(
          makeCard({
            title: def.name || def.id,
            subtitle: def.role ? def.role.toUpperCase() : "",
            iconUrl: this._getTowerIconUrl(def),
            role: def.role || "",
            lines,
          }),
        );
      }
    } else {
      const defs = Object.values(this._data.enemyDefs || {}).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      const bossIds = new Set();
      const finalBossIds = new Set();
      for (const mode of this._data.modeDefs || []) {
        if (mode?.finalBoss) {
          bossIds.add(mode.finalBoss);
          finalBossIds.add(mode.finalBoss);
        }
      }
      for (const def of defs) {
        if (Array.isArray(def.tags) && def.tags.includes("boss")) bossIds.add(def.id);
      }
      const filtered = active === "Bosses" ? defs.filter((def) => bossIds.has(def.id)) : defs;
      for (const def of filtered) {
        const lines = [
          `HP ${Math.round(def.hp ?? 0)} • Armor ${def.armor ?? 0} • Speed ${Math.round(def.speed ?? 0)}`,
          `Reward ${def.reward ?? 0} • Threat ${Math.round((def.threat ?? 0) * 100) / 100}`,
        ];
        const tags = Array.isArray(def.tags) && def.tags.length ? `Tags: ${def.tags.join(", ")}` : "";
        const subtitle = active === "Bosses" ? (finalBossIds.has(def.id) ? "FINAL BOSS" : "BOSS") : "ENEMY";
        const card = makeCard({
          title: def.name || def.id,
          subtitle,
          iconUrl: this._getEnemyIconUrl(def.id),
          lines,
          tagLine: tags,
        });
        if (active === "Bosses") {
          card.classList.add("codex-item-clickable");
          card.dataset.bossId = def.id;
        }
        list.appendChild(card);
      }
    }
  }

  _buildShop(category = null) {
    if (!this._els.shopList || !this._shop) return;
    this._syncCoins();
    this._setShopStatus("", "info");
    const list = this._els.shopList;
    list.innerHTML = "";
    if (category) this._shopCategory = category;
    const activeCategory = this._shopCategory;

    const getVictoryCoinReward = (mode) => {
      const totalWaves = Math.max(0, Math.round(mode?.totalWaves || 0));
      if (!totalWaves) return null;
      const reward = calculateCoinReward({
        mode,
        wavesCleared: totalWaves,
        victory: true,
        modifiers: [],
      });
      return Math.max(0, Math.round(reward.total || 0));
    };
    const getPerWaveCoinReward = (mode) => {
      const reward = calculateCoinReward({
        mode,
        wavesCleared: 1,
        victory: false,
        modifiers: [],
      });
      return Math.max(0, Math.round(reward.waveCoins || 0));
    };

    const items = this._shop.getItems();
    const order = ["Towers", "Maps", "Modes", "Modifiers", "Features"];
    const grouped = new Map();
    for (const item of items) {
      const group = item.category || "Other";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(item);
    }

    const sortItems = (a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name);
    const sectionMeta = {
      Towers: {
        name: "Tower Arsenal",
        subtitle: "Expand your roster with new roles and endgame tech.",
      },
      Maps: {
        name: "Battlefields",
        subtitle: "Unlock new layouts for your next run.",
      },
      Modes: {
        name: "Operations",
        subtitle: "Standalone modes plus bundled operations that unlock their required maps.",
      },
      Modifiers: {
        name: "Modifier Vault",
        subtitle: "Unlock Modifier Access, then purchase modifiers individually.",
      },
      Features: {
        name: "Late-Game Systems",
        subtitle: "Permanent utilities, analytics, and advanced tools.",
      },
    };
    const coins = this._progression?.coins ?? 0;
    const modifierDefs = new Map((this._data?.modifierDefs || []).map((mod) => [mod.id, mod]));

    const getModifierCoinInfo = (item) => {
      if (!item || item.type !== "modifier") return null;
      const def = modifierDefs.get(item.refId);
      if (!def) return null;
      const { mult } = computeModifierCoinMultiplier([def]);
      const group = mult < 1 ? "Helpful" : "Challenge";
      return { mult, group };
    };

    const appendItemsToGrid = (grid, sectionItems) => {
      for (const item of sectionItems) {
        const unlocked = item.unlocked || item.cost === 0;
        const requiresFeature = item.requiresFeature || null;
        const featureUnlocked = requiresFeature ? this._shop.isFeatureUnlocked(requiresFeature) : true;
        const gated = requiresFeature && !featureUnlocked;
        const canAfford = !unlocked && !gated && coins >= item.cost;

        const card = document.createElement("div");
        card.className = "shop-item";
        if (item.type === "map") card.classList.add("shop-item-map");
        if (unlocked) card.classList.add("unlocked");
        if (!unlocked) card.classList.add("locked");

        const info = document.createElement("div");
        info.className = "shop-item-info";
        let towerRole = "";
        let towerBaseCost = null;
        let mapDef = null;
        let modeDef = null;
        if (item.type === "tower") {
          const def = this._data?.towerDefs?.[item.refId];
          const iconUrl = def ? this._getTowerIconUrl(def) : null;
          const icon = document.createElement("span");
          icon.className = "tower-icon shop-tower-icon";
          if (iconUrl) icon.style.setProperty("--tower-icon", `url(${iconUrl})`);
          info.appendChild(icon);
          towerRole = String(def?.role || "").trim();
          if (def?.cost != null) towerBaseCost = Math.round(def.cost);
        } else if (item.type === "map") {
          mapDef = (this._data?.mapDefs || []).find((m) => m.id === item.refId) || null;
          if (mapDef) {
            const preview = document.createElement("canvas");
            preview.className = "shop-map-preview";
            preview.width = 120;
            preview.height = 72;
            this._renderMapPreview(preview, mapDef);
            info.appendChild(preview);
          }
        } else if (item.type === "mode") {
          modeDef = (this._data?.modeDefs || []).find((m) => m.id === item.refId) || null;
          const modeIcon = document.createElement("span");
          modeIcon.className = "shop-mode-icon";
          if (modeDef?.id === "cataclysm") {
            card.classList.add("shop-item-cataclysm");
            modeIcon.classList.add("shop-mode-icon--cataclysm");
          }
          const bossId = modeDef?.finalBoss || null;
          const bossIconUrl = bossId ? this._getEnemyIconUrl(bossId) : null;
          if (bossIconUrl) {
            modeIcon.style.setProperty("--mode-icon", `url(${bossIconUrl})`);
            const bossName = this._data?.enemyDefs?.[bossId]?.name || bossId;
            if (bossName) modeIcon.setAttribute("title", bossName);
          } else {
            modeIcon.classList.add("is-generic");
            modeIcon.textContent = "∞";
          }
          info.appendChild(modeIcon);
        }
        const text = document.createElement("div");
        text.className = "shop-item-text";
        const name = document.createElement("div");
        name.className = "shop-item-name";
        name.textContent = item.name;
        text.appendChild(name);
        const desc = document.createElement("div");
        desc.className = "shop-item-desc muted";
        const rawDesc = item.description || "";
        if (towerRole) {
          const roleRow = document.createElement("div");
          roleRow.className = "shop-role-row";
          const roleLabel = document.createElement("span");
          roleLabel.className = "shop-role-label";
          roleLabel.textContent = "Role";
          const roleKey = towerRole.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "other";
          const roleChip = document.createElement("span");
          roleChip.className = `shop-role role-${roleKey}`;
          roleChip.textContent = towerRole;
          roleRow.appendChild(roleLabel);
          roleRow.appendChild(roleChip);
          text.appendChild(roleRow);
          if (towerBaseCost != null) {
            const costRow = document.createElement("div");
            costRow.className = "shop-tower-row";
            costRow.textContent = `Build cost ${towerBaseCost}c`;
            text.appendChild(costRow);
          }
        } else if (modeDef) {
          const meta = [];
          const totalWaves = Math.max(0, Math.round(modeDef.totalWaves || 0));
          if (totalWaves > 0) {
            meta.push(`Waves ${totalWaves}`);
            const coinReward = getVictoryCoinReward(modeDef);
            if (Number.isFinite(coinReward)) meta.push(`Final reward +${coinReward}c`);
          } else {
            meta.push("Waves Endless");
            const perWave = getPerWaveCoinReward(modeDef);
            if (Number.isFinite(perWave)) meta.push(`Per wave +${perWave}c`);
            else meta.push("Per wave —");
          }
          if (meta.length) {
            const modeRow = document.createElement("div");
            modeRow.className = "shop-mode-row";
            modeRow.textContent = meta.join(" • ");
            text.appendChild(modeRow);
          }
        }
        if (!towerRole && rawDesc) {
          desc.textContent = rawDesc;
        } else if (towerRole && rawDesc && !/^role:/i.test(rawDesc)) {
          desc.textContent = rawDesc;
        } else {
          desc.textContent = "";
        }
        desc.classList.toggle("hidden", !desc.textContent);
        text.appendChild(desc);

        if (item.type === "modifier") {
          const coinInfo = getModifierCoinInfo(item);
          const coinMult = coinInfo?.mult ?? item._coinMult;
          if (Number.isFinite(coinMult)) {
            const row = document.createElement("div");
            row.className = "modifier-meta-row";
            const coin = document.createElement("span");
            const kind = coinMult < 1 ? "helpful" : "challenge";
            coin.className = `modifier-coin ${kind}`;
            coin.textContent = `Coins x${coinMult.toFixed(2)}`;
            row.appendChild(coin);
            text.appendChild(row);
          }
        }
        info.appendChild(text);

        const action = document.createElement("div");
        action.className = "shop-item-action";
        const cost = document.createElement("div");
        cost.className = "shop-item-cost";
        cost.textContent = item.cost > 0 ? `${item.cost}c` : "Free";
        const button = document.createElement("button");
        button.className = unlocked ? "ghost" : "primary";
        button.disabled = unlocked || !canAfford;
        if (unlocked) {
          button.textContent = "Unlocked";
        } else if (gated) {
          button.textContent = "Unlock Modifier Access";
          button.disabled = true;
        } else if (canAfford) {
          button.textContent = "Unlock";
        } else {
          button.textContent = `Need ${item.cost - coins}c`;
        }
        button.addEventListener("click", () => {
          if (unlocked) return;
          if (gated) {
            this._setShopStatus("Unlock Modifier Access to purchase modifiers.", "error");
            return;
          }
          const result = this._shop.purchase(item.id);
          if (!result.ok) {
            this._setShopStatus(result.reason || "Purchase failed", "error");
            this._buildShop();
            return;
          }
          this._setShopStatus(`Unlocked ${item.name}.`, "info");
          this._syncCoins();
          this._applyUnlockState();
          this._buildShop();
          this._syncShopTabs();
        });

        action.appendChild(cost);
        action.appendChild(button);
        card.appendChild(info);
        card.appendChild(action);
        grid.appendChild(card);
      }
    };

    for (const section of order) {
      if (activeCategory && section !== activeCategory) continue;
      const sectionItems = grouped.get(section);
      if (!sectionItems || !sectionItems.length) continue;
      sectionItems.sort(sortItems);

      const meta = sectionMeta[section] || {};
      const wrapper = document.createElement("section");
      wrapper.className = "shop-section";
      wrapper.dataset.category = section;

      const header = document.createElement("div");
      header.className = "shop-section-header";
      const headerLeft = document.createElement("div");
      const label = document.createElement("div");
      label.className = "shop-section-title";
      label.textContent = section.toUpperCase();
      const name = document.createElement("div");
      name.className = "shop-section-name";
      name.textContent = meta.name || section;
      const sub = document.createElement("div");
      sub.className = "shop-section-sub";
      sub.textContent = meta.subtitle || "";
      headerLeft.appendChild(label);
      headerLeft.appendChild(name);
      if (sub.textContent) headerLeft.appendChild(sub);
      header.appendChild(headerLeft);
      wrapper.appendChild(header);
      if (section === "Modifiers") {
        const buckets = { Challenge: [], Helpful: [] };
        for (const item of sectionItems) {
          const info = getModifierCoinInfo(item);
          if (info) {
            item._coinMult = info.mult;
            item._coinGroup = info.group;
          }
          const group = info?.group || "Challenge";
          buckets[group === "Helpful" ? "Helpful" : "Challenge"].push(item);
        }

        const appendGroup = (label, subtitle, items, tone) => {
          if (!items.length) return;
          const groupHeader = document.createElement("div");
          groupHeader.className = "shop-subsection-header";
          const groupLabel = document.createElement("div");
          groupLabel.className = "shop-subsection-title";
          if (tone) groupLabel.classList.add(tone);
          groupLabel.textContent = label;
          groupHeader.appendChild(groupLabel);
          if (subtitle) {
            const groupSub = document.createElement("div");
            groupSub.className = "shop-subsection-sub";
            groupSub.textContent = subtitle;
            groupHeader.appendChild(groupSub);
          }
          wrapper.appendChild(groupHeader);

          const grid = document.createElement("div");
          grid.className = "shop-section-grid";
          appendItemsToGrid(grid, items);
          wrapper.appendChild(grid);
        };

        buckets.Challenge.sort(sortItems);
        buckets.Helpful.sort(sortItems);
        appendGroup("Challenge Modifiers", "Higher coin rewards", buckets.Challenge, "challenge");
        appendGroup("Helpful Modifiers", "Lower coin rewards", buckets.Helpful, "helpful");
      } else {
        const grid = document.createElement("div");
        grid.className = "shop-section-grid";
        appendItemsToGrid(grid, sectionItems);
        wrapper.appendChild(grid);
      }
      list.appendChild(wrapper);
    }
  }

  _applyUnlockState() {
    this._refreshMapDefs();
    this._refreshModeDefs();
    this._syncBundleUnlocks();
    this._buildMapSelect();
    this._buildModeSelect();
    this._applyMapModeLock("init");
    this._syncModeDescription();
    this._syncRunIntel();
    this._syncMapPreview();
    this._buildModifierList();
    this._applyModifierLockState();
    this._syncFeatureLocks();
    this.refreshPaletteCosts();
  }

  _syncFeatureLocks() {
    const mapLocked = !this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS);
    if (this._els.customMapOpen) {
      this._els.customMapOpen.disabled = mapLocked;
      this._els.customMapOpen.classList.toggle("locked", mapLocked);
    }
    this._syncCustomMapCount();

    const modeLocked = !this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES);
    if (this._els.customModeOpen) {
      this._els.customModeOpen.disabled = modeLocked;
      this._els.customModeOpen.classList.toggle("locked", modeLocked);
    }
    this._syncCustomModeCount();

    const statsLocked = !this._isFeatureUnlocked(FEATURE_IDS.STATS_CHARTS);
    if (this._els.statsOpen) {
      this._els.statsOpen.classList.toggle("locked", statsLocked);
      this._els.statsOpen.disabled = statsLocked;
      this._els.statsOpen.textContent = "Stats";
    }

    const codexLocked = !this._isFeatureUnlocked(FEATURE_IDS.CODEX);
    if (this._els.codexOpen) {
      this._els.codexOpen.classList.toggle("locked", codexLocked);
      this._els.codexOpen.disabled = codexLocked;
      this._els.codexOpen.textContent = "Codex";
    }

    const themeLocked = !this._isFeatureUnlocked(FEATURE_IDS.THEME_PACK);
    if (this._els.themesOpen) {
      this._els.themesOpen.disabled = themeLocked;
      this._els.themesOpen.classList.toggle("locked", themeLocked);
    }
    if (this._els.themeCards && this._els.themeCards.length) {
      for (const card of this._els.themeCards) {
        card.disabled = themeLocked;
        card.classList.toggle("locked", themeLocked);
      }
    }
    if (this._els.settingTheme) {
      this._els.settingTheme.disabled = themeLocked;
      const wrap = this._els.settingTheme.closest?.(".setting-item");
      if (wrap) wrap.classList.toggle("locked", themeLocked);
    }
    this._applySettings();
    this._syncThemeCards();

    const cinemaLocked = !this._isFeatureUnlocked(FEATURE_IDS.CINEMATIC_UI);
    if (this._els.settingCinematicUi) {
      this._els.settingCinematicUi.disabled = cinemaLocked;
      const wrap = this._els.settingCinematicUi.closest?.(".setting-item");
      if (wrap) wrap.classList.toggle("locked", cinemaLocked);
      if (cinemaLocked && this._settings.cinematicUi) {
        this._settings.cinematicUi = false;
        this._applySettings();
      }
    }
  }

  _modifiersLocked() {
    return !this._isFeatureUnlocked(FEATURE_IDS.MODIFIERS);
  }

  _syncBundleUnlocks() {
    if (!this._progression || !this._shop) return;
    const modeDefs = this._data?.modeDefs || [];
    const unlocks = [];
    for (const mode of modeDefs) {
      if (!mode?.requiredMap) continue;
      const mapId = mode.requiredMap;
      if (!mapId) continue;
      if (this._shop.isMapUnlocked(mapId)) {
        unlocks.push(modeUnlockKey(mode.id));
      }
    }
    if (unlocks.length) this._progression.unlockMany(unlocks);
  }

  _getUnlockedModifierDefs() {
    const defs = this._data?.modifierDefs || [];
    if (this._modifiersLocked()) return [];
    if (!this._shop) return defs;
    return defs.filter((mod) => this._shop.isModifierUnlocked(mod.id));
  }

  _getSelectedModifierDefs() {
    if (!this._modifierSelected?.size) return [];
    const defs = this._data?.modifierDefs || [];
    const selected = this._modifierSelected;
    return defs.filter((mod) => selected.has(mod.id));
  }

  _applyModifierLockState() {
    const featureLocked = this._modifiersLocked();
    const list = this._els.modifierList;
    if (!list) return;

    const unlocked = new Set(this._getUnlockedModifierDefs().map((m) => m.id));
    const hasUnlocked = unlocked.size > 0;

    for (const label of list.querySelectorAll("label.modifier-item")) {
      const input = label.querySelector("input[type=checkbox]");
      if (!input) continue;
      const id = input.value;
      const modUnlocked = !featureLocked && unlocked.has(id);
      input.disabled = !modUnlocked;
      if (!modUnlocked) {
        input.checked = false;
        this._modifierSelected.delete(id);
      }
      label.classList.toggle("locked", !modUnlocked);
      const lockTag = label.querySelector("[data-mod-lock]");
      if (lockTag) {
        if (featureLocked) {
          lockTag.textContent = "Requires Modifier Access";
          lockTag.classList.remove("hidden");
        } else if (!modUnlocked) {
          const cost = this._shop?.getModifierUnlockCost?.(id);
          lockTag.textContent = cost ? `Unlock ${cost}c` : "Locked";
          lockTag.classList.remove("hidden");
        } else {
          lockTag.classList.add("hidden");
        }
      }
    }

    const disableActions = featureLocked || !hasUnlocked;
    this._els.modifierRandomBtn?.toggleAttribute("disabled", disableActions);
    this._els.modifierAllBtn?.toggleAttribute("disabled", disableActions);
    this._els.modifierClearBtn?.toggleAttribute("disabled", disableActions);

    if (this._els.modifierLocked) {
      if (featureLocked) {
        this._els.modifierLocked.textContent = "Locked — unlock Modifier Access in the Shop.";
        this._els.modifierLocked.classList.remove("hidden");
      } else if (!hasUnlocked) {
        this._els.modifierLocked.textContent = "No modifiers unlocked yet — visit the Shop to unlock some.";
        this._els.modifierLocked.classList.remove("hidden");
      } else {
        this._els.modifierLocked.classList.add("hidden");
      }
    }

    const wrapper = list.closest("details");
    if (wrapper) wrapper.classList.toggle("locked", featureLocked);
    this._syncModifierCount();
  }

  _bindSidePanelScroll() {
    const panel = this._els.sidePanel;
    if (!panel) return;
    const stats = panel.querySelector(".stats");
    if (!stats) return;
    let rafId = null;
    const apply = () => {
      rafId = null;
      const t = Math.max(0, Math.min(1, panel.scrollTop / 80));
      const scale = 1 - t * 0.035;
      const padY = 12 - t * 3;
      const padX = 12 - t * 3;
      const gap = 10 - t * 3;
      const label = 12 - t * 2;
      const value = 18 - t * 3;
      stats.style.setProperty("--stats-scale", scale.toFixed(3));
      stats.style.setProperty("--stats-pad-y", `${padY.toFixed(2)}px`);
      stats.style.setProperty("--stats-pad-x", `${padX.toFixed(2)}px`);
      stats.style.setProperty("--stats-gap", `${gap.toFixed(2)}px`);
      stats.style.setProperty("--stats-label-size", `${label.toFixed(2)}px`);
      stats.style.setProperty("--stats-value-size", `${value.toFixed(2)}px`);
    };
    const update = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(apply);
    };
    panel.addEventListener("scroll", update, { passive: true });
    apply();
  }

  _isMenuVisible() {
    const titleOpen = this._els.titleScreen && !this._els.titleScreen.classList.contains("hidden");
    const setupOpen = this._els.setupScreen && !this._els.setupScreen.classList.contains("hidden");
    return Boolean(titleOpen || setupOpen);
  }

  _isSetupVisible() {
    return Boolean(this._els.setupScreen && !this._els.setupScreen.classList.contains("hidden"));
  }

  _showSettingsScreen() {
    if (!this._els.settingsScreen) return;
    if (!this._isMenuVisible()) return;
    this._els.settingsScreen.classList.remove("hidden");
  }

  _showThemesFeature() {
    if (!this._isMenuVisible()) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.THEME_PACK)) {
      this._notifyFeatureLocked("Theme Pack");
      return;
    }
    this._showThemesScreen();
  }

  _showThemesScreen() {
    if (!this._els.themesScreen) return;
    if (!this._isMenuVisible()) return;
    this._syncThemeCards();
    this._els.themesScreen.classList.remove("hidden");
  }

  _hideThemesScreen() {
    if (!this._els.themesScreen) return;
    this._els.themesScreen.classList.add("hidden");
  }

  _hideSettingsScreen() {
    if (!this._els.settingsScreen) return;
    this._els.settingsScreen.classList.add("hidden");
  }

  _showSavesScreen(force = false) {
    if (!this._els.savesScreen) return;
    if (!force && !this._isMenuVisible()) return;
    if (this._game?.state?.mode === "playing") {
      this._savesOverlay.pausedBefore = this._game.state.paused;
      this._game.state.paused = true;
    }
    this._renderProfiles();
    this._els.savesScreen.classList.remove("hidden");
  }

  _hideSavesScreen(restorePause = true) {
    if (!this._els.savesScreen) return;
    this._els.savesScreen.classList.add("hidden");
    if (restorePause && this._savesOverlay.pausedBefore != null && this._game?.state?.mode === "playing") {
      this._game.state.paused = this._savesOverlay.pausedBefore;
    }
    this._savesOverlay.pausedBefore = null;
  }

  _showStatsScreen() {
    if (!this._els.statsScreen) return;
    if (!this._isMenuVisible()) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.STATS_CHARTS)) {
      this._notifyFeatureLocked("Stats Charts");
      return;
    }
    this._els.statsScreen.classList.remove("hidden");
    this._renderStatsScreen();
    requestAnimationFrame(() => this._renderStatsScreen());
  }

  _hideStatsScreen() {
    if (!this._els.statsScreen) return;
    this._els.statsScreen.classList.add("hidden");
  }

  _showCodexScreen() {
    if (!this._els.codexScreen) return;
    if (!this._isMenuVisible()) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.CODEX)) {
      this._notifyFeatureLocked("Tower & Enemy Codex");
      return;
    }
    this._hideBossDetail();
    this._buildCodex();
    this._syncCodexTabs();
    this._els.codexScreen.classList.remove("hidden");
  }

  _hideCodexScreen() {
    if (!this._els.codexScreen) return;
    this._hideBossDetail();
    this._els.codexScreen.classList.add("hidden");
  }

  isTutorialOpen() {
    return this._tutorial.open;
  }

  toggleTutorial() {
    if (this._tutorial.open) this.hideTutorial();
    else this.showTutorial();
  }

  toggleCinematicUi() {
    if (!this._isFeatureUnlocked(FEATURE_IDS.CINEMATIC_UI)) {
      this._notifyFeatureLocked("Cinematic UI");
      return;
    }
    this._settings.cinematicUi = !this._settings.cinematicUi;
    this._syncSettingsUi();
    this._applySettings();
    const state = this._settings.cinematicUi ? "ON" : "OFF";
    this._game?.log?.(`Cinematic UI: ${state}`);
  }

  _setStartMenuOpen(open) {
    document.body.classList.toggle("start-menu-open", Boolean(open));
    if (!open) this._hideCustomModeScreen();
    if (!open) this._hideCustomMapScreen();
    if (!open) this._hideShopScreen();
    if (!open) this._hideSettingsScreen();
    if (!open) this._hideSavesScreen();
    if (!open) this._hideProfileSelectScreen();
    if (!open) this._hideStatsScreen();
    if (!open) this._hideCodexScreen();
    this._applySettings();
  }

  _ensureMenuVisible() {
    if (!this._els.titleScreen) return;
    if (this._game?.state?.mode === "playing") return;
    if (this._isMenuVisible()) return;
    if (this._els.setupScreen) this._els.setupScreen.classList.add("hidden");
    this._els.titleScreen.classList.remove("hidden");
    this._setStartMenuOpen(true);
  }

  _notifyFeatureLocked(label) {
    if (this._isMenuVisible()) {
      this._setShopStatus(`Unlock ${label} in the Shop.`, "error");
      this._showShopScreen();
      return;
    }
    this._game?.log?.(`Unlock ${label} in the Shop to use this feature.`);
  }

  _renderStatsScreen() {
    if (!this._progression) return;
    const stats = this._progression.stats || {};
    const runs = Math.max(0, Math.round(stats.runs ?? 0));
    const victories = Math.max(0, Math.round(stats.victories ?? 0));
    const totalWaves = Math.max(0, Math.round(stats.totalWaves ?? 0));
    const totalCoins = Math.max(0, Math.round(stats.totalCoins ?? 0));
    const totalDamage = Math.max(0, Math.round(stats.totalDamage ?? 0));
    const totalKills = Math.max(0, Math.round(stats.totalKills ?? 0));
    const totalTime = Math.max(0, Math.round(stats.totalTime ?? 0));
    const history = Array.isArray(stats.history) ? stats.history : [];
    const hasRuns = runs > 0;
    const setText = (el, value) => {
      if (el) el.textContent = value;
    };
    const formatBig = (value) => (Number.isFinite(value) ? Math.round(value).toLocaleString() : "-");

    setText(this._els.statsRuns, String(runs));
    setText(this._els.statsVictories, String(victories));
    setText(this._els.statsWaves, String(totalWaves));
    setText(this._els.statsCoins, String(totalCoins));

    const winRate = hasRuns ? victories / runs : null;
    const avgWaves = hasRuns ? totalWaves / runs : null;
    const avgCoins = hasRuns ? totalCoins / runs : null;
    const bestWaves = Math.max(0, Math.round(stats.bestWaves ?? 0));
    const bestCoins = Math.max(0, Math.round(stats.bestCoins ?? 0));
    const bestDamage = Math.max(0, Math.round(stats.bestDamage ?? 0));
    const bestKills = Math.max(0, Math.round(stats.bestKills ?? 0));
    const bestTime = Math.max(0, Math.round(stats.bestTime ?? 0));
    const currentStreak = Math.max(0, Math.round(stats.currentWinStreak ?? 0));
    const longestStreak = Math.max(0, Math.round(stats.longestWinStreak ?? 0));
    const avgDamage = hasRuns ? totalDamage / runs : null;
    const avgKills = hasRuns ? totalKills / runs : null;
    const avgTime = hasRuns ? totalTime / runs : null;
    const damagePerMin = totalTime > 0 ? (totalDamage * 60) / totalTime : null;
    const killsPerMin = totalTime > 0 ? (totalKills * 60) / totalTime : null;
    const coinsPerMin = totalTime > 0 ? (totalCoins * 60) / totalTime : null;
    const damagePerWave = totalWaves > 0 ? totalDamage / totalWaves : null;
    const killsPerWave = totalWaves > 0 ? totalKills / totalWaves : null;
    const coinsPerWave = totalWaves > 0 ? totalCoins / totalWaves : null;

    setText(this._els.statsWinRate, winRate == null ? "-" : `${fmt(winRate * 100, 1)}%`);
    setText(this._els.statsAvgWaves, avgWaves == null ? "-" : fmt(avgWaves, 1));
    setText(this._els.statsAvgCoins, avgCoins == null ? "-" : fmt(avgCoins, 1));
    setText(this._els.statsBestWaves, hasRuns ? String(bestWaves) : "-");
    setText(this._els.statsBestCoins, hasRuns ? String(bestCoins) : "-");
    setText(this._els.statsCurrentStreak, hasRuns ? String(currentStreak) : "-");
    setText(this._els.statsLongestStreak, hasRuns ? String(longestStreak) : "-");
    setText(this._els.statsTotalDamage, hasRuns ? formatBig(totalDamage) : "-");
    setText(this._els.statsTotalKills, hasRuns ? formatBig(totalKills) : "-");
    setText(this._els.statsTotalTime, hasRuns ? formatDuration(totalTime) : "-");
    setText(this._els.statsAvgDamage, avgDamage == null ? "-" : fmt(avgDamage, 1));
    setText(this._els.statsAvgKills, avgKills == null ? "-" : fmt(avgKills, 1));
    setText(this._els.statsAvgTime, avgTime == null ? "-" : formatDuration(avgTime));
    setText(this._els.statsBestDamage, hasRuns ? formatBig(bestDamage) : "-");
    setText(this._els.statsBestKills, hasRuns ? formatBig(bestKills) : "-");
    setText(this._els.statsBestTime, hasRuns ? formatDuration(bestTime) : "-");
    setText(this._els.statsDamagePerMin, damagePerMin == null ? "-" : fmt(damagePerMin, 1));
    setText(this._els.statsKillsPerMin, killsPerMin == null ? "-" : fmt(killsPerMin, 1));
    setText(this._els.statsCoinsPerMin, coinsPerMin == null ? "-" : fmt(coinsPerMin, 1));
    setText(this._els.statsDamagePerWave, damagePerWave == null ? "-" : fmt(damagePerWave, 1));
    setText(this._els.statsKillsPerWave, killsPerWave == null ? "-" : fmt(killsPerWave, 1));
    setText(this._els.statsCoinsPerWave, coinsPerWave == null ? "-" : fmt(coinsPerWave, 1));

    const recentRuns = history.slice(0, 5);
    const recentCount = recentRuns.length;
    const recentWins = recentRuns.reduce((sum, run) => sum + (run?.victory ? 1 : 0), 0);
    const recentWaveTotal = recentRuns.reduce((sum, run) => sum + Math.max(0, Math.round(run?.waves || 0)), 0);
    const recentCoinTotal = recentRuns.reduce((sum, run) => sum + Math.max(0, Math.round(run?.coins || 0)), 0);
    const recentWinRate = recentCount ? recentWins / recentCount : null;
    const recentAvgWaves = recentCount ? recentWaveTotal / recentCount : null;
    const recentAvgCoins = recentCount ? recentCoinTotal / recentCount : null;

    setText(this._els.statsRecentWinRate, recentWinRate == null ? "-" : `${fmt(recentWinRate * 100, 1)}%`);
    setText(this._els.statsRecentAvgWaves, recentAvgWaves == null ? "-" : fmt(recentAvgWaves, 1));
    setText(this._els.statsRecentAvgCoins, recentAvgCoins == null ? "-" : fmt(recentAvgCoins, 1));

    let lastRunText = "No runs recorded yet.";
    const lastRun = history[0];
    if (lastRun) {
      const mapName =
        (this._data?.mapDefs || []).find((map) => map.id === lastRun.mapId)?.name ||
        (lastRun.mapId ? String(lastRun.mapId) : "");
      const modeName =
        (this._data?.modeDefs || []).find((mode) => mode.id === lastRun.modeId)?.name ||
        (lastRun.modeId ? String(lastRun.modeId) : "");
      const outcome = lastRun.victory ? "Victory" : "Defeat";
      const waves = Math.max(0, Math.round(lastRun.waves || 0));
      const coins = Math.max(0, Math.round(lastRun.coins || 0));
      const damage = Math.max(0, Math.round(lastRun.damage || 0));
      const kills = Math.max(0, Math.round(lastRun.kills || 0));
      const time = Math.max(0, Math.round(lastRun.time || 0));
      const coinText = `${coins > 0 ? "+" : ""}${coins} coins`;
      const dateText = lastRun.ts
        ? new Date(lastRun.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "";
      const parts = [
        outcome,
        `Wave ${waves}`,
        coinText,
        `${formatBig(damage)} dmg`,
        `${formatBig(kills)} kills`,
        `Time ${formatDuration(time)}`,
      ];
      if (mapName) parts.push(mapName);
      if (modeName) parts.push(modeName);
      if (dateText) parts.push(dateText);
      lastRunText = parts.join(" • ");
    }
    setText(this._els.statsLastRun, lastRunText);

    const chartHistory = history.slice(0, 12).reverse();
    const renderChart = (el, values, options = {}) => {
      if (!el) return;
      el.innerHTML = "";
      if (!values.length) {
        const empty = document.createElement("div");
        empty.className = "muted small";
        empty.textContent = "No runs recorded yet.";
        el.appendChild(empty);
        return;
      }
      const max = Math.max(1, ...values.map((v) => v.value || 0));
      const heightCap = options.height ?? 120;
      for (const entry of values) {
        const bar = document.createElement("div");
        bar.className = `stats-bar ${entry.className || ""}`.trim();
        const height = Math.max(6, Math.round((Number(entry.value) || 0) / max * heightCap));
        bar.style.height = `${height}px`;
        bar.dataset.value = entry.label ?? String(entry.value ?? 0);
        el.appendChild(bar);
      }
    };

    renderChart(
      this._els.statsChartWaves,
      chartHistory.map((run) => ({
        value: Math.max(0, Math.round(run.waves || 0)),
        label: String(run.waves ?? 0),
        className: "waves",
      })),
      { height: 100 }
    );
    renderChart(
      this._els.statsChartDamage,
      chartHistory.map((run) => ({
        value: Math.max(0, Math.round(run.damage || 0)),
        label: formatBig(run.damage ?? 0),
        className: "damage",
      })),
      { height: 100 }
    );
    renderChart(
      this._els.statsChartTime,
      chartHistory.map((run) => ({
        value: Math.max(0, Math.round(run.time || 0)),
        label: formatDuration(run.time ?? 0),
        className: "time",
      })),
      { height: 100 }
    );

    const losses = Math.max(0, runs - victories);
    renderPieChart(this._els.statsPie, [
      { label: "Wins", value: victories, color: "rgba(56, 189, 248, 0.9)" },
      { label: "Losses", value: losses, color: "rgba(244, 114, 182, 0.9)" },
    ]);
    renderLineChart(
      this._els.statsLine,
      chartHistory.map((run) => Math.max(0, Math.round(run.coins || 0))),
      { color: "rgba(56, 189, 248, 0.9)", accent: "rgba(129, 140, 248, 0.9)" }
    );
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

  isAdminOpen() {
    return this._admin.open;
  }

  toggleAdmin() {
    if (!this._isFeatureUnlocked(FEATURE_IDS.DEBUG_MENU)) {
      this._notifyFeatureLocked("Debug Menu");
      return;
    }
    if (this._admin.open) this.hideAdmin();
    else this.showAdmin();
  }

  showAdmin() {
    if (!this._isFeatureUnlocked(FEATURE_IDS.DEBUG_MENU)) {
      this._notifyFeatureLocked("Debug Menu");
      return;
    }
    if (!this._els.adminPanel) return;
    this._admin.open = true;
    this._admin.restorePause = true;
    if (this._game?.state?.mode === "playing") {
      this._admin.pausedBefore = this._game.state.paused;
      this._game.state.paused = true;
    }
    this._refreshAdminPaths();
    if (this._els.adminWaveSet && this._game?.state) {
      this._els.adminWaveSet.value = String(Math.max(1, this._game.state.waveNumber + 1));
    }
    this._els.adminPanel.classList.remove("hidden");
  }

  hideAdmin() {
    if (!this._els.adminPanel) return;
    this._admin.open = false;
    if (this._admin.restorePause && this._admin.pausedBefore != null && this._game?.state?.mode === "playing") {
      this._game.state.paused = this._admin.pausedBefore;
    }
    this._admin.pausedBefore = null;
    this._admin.restorePause = true;
    this._els.adminPanel.classList.add("hidden");
  }

  _bindTutorial() {
    const open = () => this.showTutorial();
    this._els.tutorialBtn?.addEventListener("click", open);
    this._els.tutorialBtnAlt?.addEventListener("click", open);
    this._els.tutorialCloseBtn?.addEventListener("click", () => this.hideTutorial());
    this._els.tutorialNextBtn?.addEventListener("click", () => this._shiftTutorialStep(1));
    this._els.tutorialBackBtn?.addEventListener("click", () => this._shiftTutorialStep(-1));
  }

  _bindAdmin() {
    const safeNumber = (value, fallback = 0) => {
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    const ensureRun = () => {
      if (this._game?.state?.mode !== "playing") {
        this._game?.log?.("Start a run before using admin tools.");
        return false;
      }
      return true;
    };
    this._els.adminCloseBtn?.addEventListener("click", () => this.hideAdmin());
    this._els.adminEnemyFilter?.addEventListener("input", () => this._applyAdminFilter("enemy"));
    this._els.adminAllyFilter?.addEventListener("input", () => this._applyAdminFilter("ally"));
    this._els.adminTogglePause?.addEventListener("click", () => {
      this._game?.togglePause?.();
      this._admin.restorePause = false;
    });
    this._els.adminToggleAuto?.addEventListener("click", () => {
      this._game?.toggleAuto?.();
    });
    this._els.adminTimeScale?.addEventListener("change", (ev) => {
      const value = ev?.target?.value;
      this._game?.adminSetTimeScale?.(value);
    });
    this._els.adminInvincible?.addEventListener("change", (ev) => {
      const checked = Boolean(ev?.target?.checked);
      this._game?.adminSetInvincible?.(checked);
    });
    this._els.adminWaveApply?.addEventListener("click", () => {
      if (!ensureRun()) return;
      const wave = Math.max(1, Math.round(safeNumber(this._els.adminWaveSet?.value, 1)));
      const clear = Boolean(this._els.adminWaveClear?.checked);
      this._game?.adminSetWave?.(wave, { clearEnemies: clear, clearProjectiles: clear });
    });
    this._els.adminForceWave?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminForceCompleteWave?.({ clearEnemies: true });
    });
    this._els.adminForceWaveKeep?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminForceCompleteWave?.({ clearEnemies: false });
    });
    this._els.adminSkipBoss?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminSkipBossWave?.({ clearEnemies: true });
    });

    this._els.adminMoneyAdd?.addEventListener("click", () => {
      const amt = safeNumber(this._els.adminMoneyAmount?.value, 0);
      this._game?.adminAddMoney?.(amt);
    });
    this._els.adminMoneySet?.addEventListener("click", () => {
      const amt = safeNumber(this._els.adminMoneyAmount?.value, 0);
      this._game?.adminSetMoney?.(amt);
    });
    this._els.adminLivesAdd?.addEventListener("click", () => {
      const amt = safeNumber(this._els.adminLivesAmount?.value, 0);
      this._game?.adminAddLives?.(amt);
    });
    this._els.adminLivesSet?.addEventListener("click", () => {
      const amt = safeNumber(this._els.adminLivesAmount?.value, 0);
      this._game?.adminSetLives?.(amt);
    });

    this._els.adminEnemySpawn?.addEventListener("click", () => {
      if (!ensureRun()) return;
      const id = this._els.adminEnemySelect?.value;
      const count = Math.max(1, Math.round(safeNumber(this._els.adminEnemyCount?.value, 1)));
      const pathValue = this._els.adminEnemyPath?.value ?? "any";
      const pathIndex = pathValue === "any" ? null : Number.parseInt(pathValue, 10);
      const mod = this._readEnemyAdminMod();
      this._game?.adminSpawnEnemy?.(id, count, pathIndex, mod);
    });

    this._els.adminAllySpawn?.addEventListener("click", () => {
      if (!ensureRun()) return;
      const id = this._els.adminAllySelect?.value;
      const count = Math.max(1, Math.round(safeNumber(this._els.adminAllyCount?.value, 1)));
      const pathValue = this._els.adminAllyPath?.value ?? "any";
      const pathIndex = pathValue === "any" ? null : Number.parseInt(pathValue, 10);
      this._game?.adminSpawnSummons?.(id, count, pathIndex);
    });

    this._els.adminEnemyApplyLive?.addEventListener("click", () => {
      if (!ensureRun()) return;
      const mod = this._readEnemyAdminMod();
      this._game?.adminApplyEnemyModifiers?.(mod);
    });
    this._els.adminEnemyClearFx?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearEnemyEffects?.();
    });

    this._els.adminStartWave?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.startNextWave?.();
    });
    this._els.adminClearTowers?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearTowers?.();
    });
    this._els.adminClearAllies?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearAllies?.();
    });
    this._els.adminClearEnemies?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearEnemies?.();
    });
    this._els.adminClearProjectiles?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearProjectiles?.();
    });
    this._els.adminResetCooldowns?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminResetCooldowns?.();
    });
    this._els.adminClearAll?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminClearAll?.();
    });
    this._els.adminMaxSelected?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.adminMaxSelectedTower?.();
    });
    this._els.adminSellSelected?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._game?.sellSelectedTower?.();
    });
    this._els.adminDumpSelected?.addEventListener("click", () => {
      if (!ensureRun()) return;
      this._dumpSelectedTowerStats();
    });
  }

  _dumpSelectedTowerStats() {
    const tower = this._game?.getSelectedTower?.();
    if (!tower) {
      this._game?.log?.("Admin: No tower selected.");
      return;
    }
    const def = this._data?.towerDefs?.[tower.defId];
    if (!def) {
      this._game?.log?.("Admin: Selected tower def missing.");
      return;
    }
    const stats = tower.computeStats(def, { modifiers: this._game?.modifierState });
    const dps = stats ? calcTotalDps(stats) : null;
    const upgrades = (def.upgrades || []).filter((u) => tower.appliedUpgrades.has(u.id));
    const upgradeNames = upgrades.length ? upgrades.map((u) => u.name || u.id).join(", ") : "None";
    const targeting = stats ? labelForTargeting(stats.targeting) : "-";
    const override = tower.targetingOverride ? labelForTargeting(tower.targetingOverride) : "Default";

    this.log(`Admin: ${def.name} (${tower.id})`);
    this.log(`Admin: Upgrades ${upgrades.length}/${(def.upgrades || []).length} — ${upgradeNames}`);
    if (stats && dps) {
      this.log(
        `Admin: DPS ${fmt(dps.total, 1)} (base ${fmt(dps.base, 1)} + ability ${fmt(dps.ability, 1)}) | Dmg ${Math.round(stats.damage)} ${stats.damageType} | FR ${fmt(stats.fireRate, 2)}/s | Range ${Math.round(stats.range)}`
      );
    }
    if (stats?.ability) {
      this.log(`Admin: Ability ${describeTowerAbility(stats.ability, stats)}`);
    }
    this.log(`Admin: Targeting ${targeting} | Override ${override}`);
    const buffs = tower.buffs || {};
    const buffParts = [
      `dmg x${fmt(buffs.damageMul ?? 1, 2)}`,
      `fr x${fmt(buffs.fireRateMul ?? 1, 2)}`,
      `range x${fmt(buffs.rangeMul ?? 1, 2)}`,
      `proj x${fmt(buffs.projectileSpeedMul ?? 1, 2)}`,
    ];
    if (buffs.stunImmune) buffParts.push("stun immune");
    if (buffs.cleanseStun) buffParts.push("cleanse stun");
    this.log(`Admin: Buffs ${buffParts.join(" | ")}`);
    this.log(`Admin: Total dmg ${Math.round(tower.totalDamage ?? 0)} | Spent ${Math.round(tower.totalCost ?? 0)}g`);
  }

  _readEnemyAdminMod() {
    const safeNumber = (value, fallback = 0) => {
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      preset: this._els.adminEnemyPreset?.value ?? "none",
      hpMul: Math.max(0.1, safeNumber(this._els.adminEnemyHp?.value, 1)),
      speedMul: Math.max(0.1, safeNumber(this._els.adminEnemySpeed?.value, 1)),
      eliteMult: Math.max(0, safeNumber(this._els.adminEnemyElite?.value, 1)),
      shieldAdd: Math.max(0, safeNumber(this._els.adminEnemyShield?.value, 0)),
      armorAdd: Math.max(0, safeNumber(this._els.adminEnemyArmor?.value, 0)),
      resistAdd: Math.max(-0.9, Math.min(0.9, safeNumber(this._els.adminEnemyResist?.value, 0))),
    };
  }

  _populateAdminLists() {
    const enemies = Object.values(this._data.enemyDefs || {}).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const summons = Object.values(this._data.towerDefs || {})
      .filter((def) => def?.stats?.ability?.type === "summon" && def?.stats?.ability?.summon)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    this._adminLists.enemies = enemies.map((def) => ({
      id: def.id,
      label: def.name || def.id,
    }));
    this._adminLists.allies = summons.map((def) => ({
      id: def.id,
      label: `${def.name} Unit`,
    }));
    this._applyAdminFilter("enemy");
    this._applyAdminFilter("ally");
  }

  _applyAdminFilter(kind) {
    const isEnemy = kind === "enemy";
    const select = isEnemy ? this._els.adminEnemySelect : this._els.adminAllySelect;
    const filterInput = isEnemy ? this._els.adminEnemyFilter : this._els.adminAllyFilter;
    const list = isEnemy ? this._adminLists.enemies : this._adminLists.allies;
    if (!select) return;
    const term = String(filterInput?.value || "").trim().toLowerCase();
    const filtered = term
      ? list.filter((item) => item.label.toLowerCase().includes(term) || item.id.toLowerCase().includes(term))
      : list;
    const prev = select.value;
    select.innerHTML = "";
    if (!filtered.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No matches";
      opt.disabled = true;
      select.appendChild(opt);
      return;
    }
    for (const item of filtered) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.label;
      select.appendChild(opt);
    }
    if (prev && filtered.some((item) => item.id === prev)) {
      select.value = prev;
    }
  }

  _refreshAdminPaths() {
    const pathCount = Math.max(1, this._game?.pathInfos?.length || 1);
    const fill = (select) => {
      if (!select) return;
      select.innerHTML = "";
      const anyOpt = document.createElement("option");
      anyOpt.value = "any";
      anyOpt.textContent = "Any path";
      select.appendChild(anyOpt);
      for (let i = 0; i < pathCount; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `Path ${i + 1}`;
        select.appendChild(opt);
      }
    };
    fill(this._els.adminEnemyPath);
    fill(this._els.adminAllyPath);
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
    if (navigator.webdriver) return;
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
    this._els.settingKeepBuild?.addEventListener("change", (ev) => {
      this._settings.keepBuildMode = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingAutoSelect?.addEventListener("change", (ev) => {
      this._settings.autoSelectBuilt = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingPauseWaveEnd?.addEventListener("change", (ev) => {
      this._settings.pauseOnWaveEnd = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingPauseBoss?.addEventListener("change", (ev) => {
      this._settings.pauseOnBossWave = Boolean(ev.target.checked);
      this._applySettings();
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
    this._els.settingDisableAnimations?.addEventListener("change", (ev) => {
      this._settings.disableUiAnimations = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingCinematicUi?.addEventListener("change", (ev) => {
      this._settings.cinematicUi = Boolean(ev.target.checked);
      this._applySettings();
    });
    this._els.settingTheme?.addEventListener("change", (ev) => {
      this._settings.theme = String(ev.target.value || "default");
      this._applySettings();
    });
    if (this._els.settingTheme) {
      this._els.settingTheme.addEventListener("click", () => {
        if (this._isFeatureUnlocked(FEATURE_IDS.THEME_PACK)) return;
        this._notifyFeatureLocked("Theme Pack");
      });
    }
    if (this._els.settingCinematicUi) {
      this._els.settingCinematicUi.addEventListener("click", () => {
        if (this._isFeatureUnlocked(FEATURE_IDS.CINEMATIC_UI)) return;
        this._notifyFeatureLocked("Cinematic UI");
      });
    }
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
    this._els.settingResetDefaults?.addEventListener("click", () => {
      this._settings = { ...DEFAULT_SETTINGS };
      this._syncSettingsUi();
      this._applySettings();
      this._game?.log?.("Settings reset to defaults.");
    });
    this._els.settingResetCoachmarks?.addEventListener("click", () => {
      window.localStorage?.removeItem("td_coachmarks_seen_v1");
      this._game?.log?.("Tutorial tips reset.");
    });
  }

  _bindCloud() {
    if (this._cloudBound) return;
    this._cloudBound = true;
    if (!this._cloud) {
      this._syncCloudStatus({ enabled: false, signedIn: false, message: "Cloud saves unavailable." });
      return;
    }
    if (this._cloud.setStatusHandler) {
      this._cloud.setStatusHandler((status) => this._syncCloudStatus(status));
    }
    const status = this._cloud.getStatus?.() || null;
    if (status) this._syncCloudStatus(status);

    this._els.cloudSigninEmail?.addEventListener("click", () => this._showCloudAuth());
    this._els.cloudSignout?.addEventListener("click", () => this._cloud.signOut?.());
    this._els.cloudSave?.addEventListener("click", () => this._cloud.uploadNow?.());
    this._els.cloudLoad?.addEventListener("click", () => this._cloud.downloadNow?.());

    this._els.authGateEmail?.addEventListener("click", () => this._showCloudAuth());

    this._els.cloudAuthClose?.addEventListener("click", () => this._hideCloudAuth());
    this._els.cloudAuthScreen?.addEventListener("click", (event) => {
      if (event.target === this._els.cloudAuthScreen) this._hideCloudAuth();
    });
    const submitEmail = (mode) => {
      const username = String(this._els.cloudAuthEmail?.value || "").trim();
      const password = String(this._els.cloudAuthPassword?.value || "");
      if (!username || !password) {
        this._setCloudAuthError("Username and password are required.");
        return;
      }
      const email = this._usernameToEmail(username);
      if (!email) {
        this._setCloudAuthError("Usernames must be 3-20 characters: letters, numbers, dot, dash, underscore.");
        return;
      }
      this._setCloudAuthError("");
      if (mode === "create") this._cloud.createAccount?.(email, password);
      else this._cloud.signInWithEmail?.(email, password);
    };
    this._els.cloudAuthLogin?.addEventListener("click", () => submitEmail("login"));
    this._els.cloudAuthCreate?.addEventListener("click", () => submitEmail("create"));
  }

  setCloud(cloud) {
    this._cloud = cloud || null;
    this._cloudBound = false;
    this._bindCloud();
  }

  _showCloudAuth() {
    if (this._els.cloudAuthScreen) this._els.cloudAuthScreen.classList.remove("hidden");
    this._setCloudAuthError("");
    if (this._els.cloudAuthEmail) this._els.cloudAuthEmail.focus();
  }

  _hideCloudAuth() {
    if (this._els.cloudAuthScreen) this._els.cloudAuthScreen.classList.add("hidden");
  }

  _setCloudAuthError(message = "") {
    if (!this._els.cloudAuthError) return;
    this._els.cloudAuthError.textContent = message || "";
  }

  _usernameToEmail(username) {
    const cleaned = String(username || "").trim().toLowerCase();
    if (!cleaned) return null;
    if (cleaned.includes("@")) return cleaned;
    if (!/^[a-z0-9._-]{3,20}$/.test(cleaned)) return null;
    return `${cleaned}@towerdefensegpt.local`;
  }

  _formatCloudUser(status) {
    const email = status?.userEmail || "";
    if (email.endsWith("@towerdefensegpt.local")) {
      return email.replace("@towerdefensegpt.local", "");
    }
    return status?.userName || email || "Signed in";
  }

  _syncCloudStatus(status) {
    if (!this._els.cloudStatus) return;
    if (!status || !status.enabled) {
      this._els.cloudStatus.textContent = status?.message || "Cloud saves unavailable.";
      if (this._els.cloudLastSync) this._els.cloudLastSync.textContent = "";
      if (this._els.cloudSigninEmail) this._els.cloudSigninEmail.disabled = true;
      if (this._els.cloudSignout) this._els.cloudSignout.disabled = true;
      if (this._els.cloudSave) this._els.cloudSave.disabled = true;
      if (this._els.cloudLoad) this._els.cloudLoad.disabled = true;
      this._applyAuthGate(status);
      return;
    }
    if (status.signedIn) {
      const name = this._formatCloudUser(status);
      this._els.cloudStatus.textContent = `Signed in as ${name}.`;
      this._hideCloudAuth();
    } else {
      this._els.cloudStatus.textContent = "Not signed in.";
    }
    if (this._els.cloudLastSync) {
      if (status.lastSyncAt) {
        const stamp = new Date(status.lastSyncAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        this._els.cloudLastSync.textContent = `Last sync: ${stamp}`;
      } else {
        this._els.cloudLastSync.textContent = "";
      }
    }
    if (status.message) {
      this._els.cloudLastSync.textContent = status.message;
    }
    if (this._els.cloudSigninEmail) this._els.cloudSigninEmail.disabled = status.signedIn || status.busy;
    if (this._els.cloudSignout) this._els.cloudSignout.disabled = !status.signedIn || status.busy;
    if (this._els.cloudSave) this._els.cloudSave.disabled = !status.signedIn || status.busy;
    if (this._els.cloudLoad) this._els.cloudLoad.disabled = !status.signedIn || status.busy;
    this._applyAuthGate(status);
  }

  _applyAuthGate(status) {
    if (!this._els.authGate) return;
    if (!status || !status.enabled) {
      this._els.authGate.classList.remove("hidden");
      if (this._els.authGateStatus) {
        this._els.authGateStatus.textContent = status?.message || "Cloud saves unavailable. Configure Firebase to continue.";
      }
      if (this._els.authGateEmail) this._els.authGateEmail.disabled = true;
      return;
    }
    if (status.signedIn) {
      this._els.authGate.classList.add("hidden");
      return;
    }
    this._els.authGate.classList.remove("hidden");
    if (this._els.authGateStatus) this._els.authGateStatus.textContent = "Sign in to access the game.";
    if (this._els.authGateEmail) this._els.authGateEmail.disabled = status.busy;
  }

  exportCloudSnapshot() {
    const snapshot = {
      version: 1,
      activeSlot: this._getActiveProfileId(),
      profiles: {},
      settings: JSON.parse(JSON.stringify(this._settings || {})),
      customModes: JSON.parse(JSON.stringify(this._customModes || [])),
      customMaps: JSON.parse(JSON.stringify(this._customMaps || [])),
      coachmarksSeen: window.localStorage?.getItem("td_coachmarks_seen_v1") === "1",
    };
    for (const slot of PROFILE_SLOTS) {
      if (this._isDebugProfile(slot.id)) continue;
      try {
        const raw = window.localStorage?.getItem(this._profileStorageKey(slot.id));
        if (raw) snapshot.profiles[slot.id] = JSON.parse(raw);
      } catch {
        // Ignore malformed slot data.
      }
    }
    return snapshot;
  }

  applyCloudSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    const profiles = snapshot.profiles && typeof snapshot.profiles === "object" ? snapshot.profiles : {};
    for (const slot of PROFILE_SLOTS) {
      if (this._isDebugProfile(slot.id)) continue;
      const payload = profiles[slot.id];
      if (!payload) continue;
      try {
        window.localStorage?.setItem(this._profileStorageKey(slot.id), JSON.stringify(payload));
      } catch {
        // Ignore storage errors.
      }
    }
    if (snapshot.settings && typeof snapshot.settings === "object") {
      this._settings = { ...DEFAULT_SETTINGS, ...snapshot.settings };
      this._saveSettings();
      this._syncSettingsUi();
      this._applySettings();
    }
    if (Array.isArray(snapshot.customModes)) {
      try {
        window.localStorage?.setItem("td_custom_modes_v1", JSON.stringify(snapshot.customModes));
      } catch {
        // Ignore storage errors.
      }
      this._customModes = this._loadCustomModes();
      this._refreshModeDefs();
      this._buildModeSelect();
      this._syncCustomModeCount();
      this._populateCustomModeSelects();
      this._syncModeDescription();
    }
    if (Array.isArray(snapshot.customMaps)) {
      try {
        window.localStorage?.setItem("td_custom_maps_v1", JSON.stringify(snapshot.customMaps));
      } catch {
        // Ignore storage errors.
      }
      this._customMaps = this._loadCustomMaps();
      this._refreshMapDefs();
      this._buildMapSelect();
      this._syncCustomMapCount();
      this._populateCustomMapSelects();
      this._syncMapPreview();
    }
    if (snapshot.coachmarksSeen) {
      window.localStorage?.setItem("td_coachmarks_seen_v1", "1");
    }
    if (snapshot.activeSlot) {
      this._setActiveProfileId(snapshot.activeSlot);
    }
    this._ensureActiveProfile();
    this._profiles = this._loadProfiles();
    this._renderProfiles();
    this._buildShop();
    return true;
  }

  _bindThemes() {
    if (!this._els.themeCards || !this._els.themeCards.length) return;
    for (const card of this._els.themeCards) {
      card.addEventListener("click", () => {
        if (card.disabled || card.classList.contains("locked")) return;
        const theme = String(card.dataset.themeChoice || "default");
        this._settings.theme = theme;
        this._applySettings();
        this._syncThemeCards();
      });
    }
  }

  _syncSettingsUi() {
    if (this._els.settingAutoWaves) this._els.settingAutoWaves.checked = Boolean(this._settings.autoStartWaves);
    if (this._els.settingKeepBuild) this._els.settingKeepBuild.checked = this._settings.keepBuildMode !== false;
    if (this._els.settingAutoSelect) this._els.settingAutoSelect.checked = this._settings.autoSelectBuilt !== false;
    if (this._els.settingPauseWaveEnd) this._els.settingPauseWaveEnd.checked = Boolean(this._settings.pauseOnWaveEnd);
    if (this._els.settingPauseBoss) this._els.settingPauseBoss.checked = Boolean(this._settings.pauseOnBossWave);
    if (this._els.settingShowRanges) this._els.settingShowRanges.checked = Boolean(this._settings.showAllRanges);
    if (this._els.settingShowAuras) this._els.settingShowAuras.checked = this._settings.showAuraRings !== false;
    if (this._els.settingReduceVfx) this._els.settingReduceVfx.checked = (this._settings.vfxScale ?? 1) < 1;
    if (this._els.settingReduceMotion) this._els.settingReduceMotion.checked = Boolean(this._settings.reduceMotion);
    if (this._els.settingDisableAnimations) {
      this._els.settingDisableAnimations.checked = Boolean(this._settings.disableUiAnimations);
    }
    if (this._els.settingCinematicUi) this._els.settingCinematicUi.checked = Boolean(this._settings.cinematicUi);
    if (this._els.settingTheme) this._els.settingTheme.value = this._resolveTheme();
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
    this._syncThemeCards();
  }

  _syncThemeCards() {
    if (!this._els.themeCards || !this._els.themeCards.length) return;
    const current = this._resolveTheme();
    for (const card of this._els.themeCards) {
      const choice = String(card.dataset.themeChoice || "default");
      const active = choice === current;
      card.classList.toggle("active", active);
      const status = card.querySelector(".theme-status");
      if (status) status.textContent = active ? "Active" : "Apply";
    }
  }

  _resolveTheme() {
    const pref = String(this._settings?.theme || "default");
    const safe = THEME_CHOICES.includes(pref) ? pref : "default";
    return this._isFeatureUnlocked(FEATURE_IDS.THEME_PACK) ? safe : "default";
  }

  _resolveAppliedTheme() {
    if (this._isDebugProfile(this._activeProfileId)) return "debug";
    return this._resolveTheme();
  }

  _applySettings(logAuto = false) {
    if (!this._game?.state) return;
    this._game.state.settings = { ...DEFAULT_SETTINGS, ...this._settings };
    if (this._game.world) this._game.world.settings = this._game.state.settings;
    if (document?.body) {
      document.body.classList.toggle("disable-animations", Boolean(this._settings.disableUiAnimations));
      const theme = this._resolveAppliedTheme();
      const themes = ["theme-ember", "theme-aurora", "theme-cinder", "theme-verdant", "theme-nebula", "theme-debug"];
      for (const cls of themes) document.body.classList.remove(cls);
      if (theme && theme !== "default") document.body.classList.add(`theme-${theme}`);
      const cinematic = Boolean(this._settings.cinematicUi) && this._game?.state?.mode === "playing";
      document.body.classList.toggle("cinematic-ui", cinematic);
    }
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
    this._cloud?.scheduleSave?.("settings");
  }

  _getActiveProfileId() {
    try {
      const stored = window.localStorage?.getItem(PROFILE_SLOT_KEY);
      if (stored && PROFILE_SLOTS.some((slot) => slot.id === stored)) {
        if (this._isDebugProfile(stored)) {
          const lastReal = window.localStorage?.getItem(PROFILE_LAST_REAL_KEY);
          if (lastReal && PROFILE_SLOTS.some((slot) => slot.id === lastReal) && !this._isDebugProfile(lastReal)) {
            return lastReal;
          }
          return PROFILE_SLOTS[0].id;
        }
        return stored;
      }
    } catch {
      // Ignore storage errors.
    }
    return PROFILE_SLOTS[0].id;
  }

  _setActiveProfileId(slotId) {
    if (!slotId) return;
    this._activeProfileId = slotId;
    try {
      window.localStorage?.setItem(PROFILE_SLOT_KEY, slotId);
      if (!this._isDebugProfile(slotId)) {
        window.localStorage?.setItem(PROFILE_LAST_REAL_KEY, slotId);
      }
    } catch {
      // Ignore storage errors.
    }
  }

  _profileStorageKey(slotId) {
    return `${PROFILE_STORAGE_PREFIX}${slotId}`;
  }

  _ensureActiveProfile() {
    const slotId = this._getActiveProfileId();
    this._activeProfileId = slotId;
    const storageKey = this._profileStorageKey(slotId);
    const isDebug = this._isDebugProfile(slotId);
    if (this._progression?.setPersistence) {
      this._progression.setPersistence(!isDebug);
    }
    if (this._progression?.setStorageKey) {
      this._progression.setStorageKey(storageKey);
    }
    this._applyProfileOverrides(slotId);
    this._syncCoins();
  }

  _readProfileSnapshot(slotId) {
    if (this._isDebugProfile(slotId)) {
      return {
        coins: Number.POSITIVE_INFINITY,
        unlocked: this._buildDebugUnlocks(),
      };
    }
    const defaults = defaultUnlocks();
    const fallback = {
      coins: 0,
      unlocked: defaults,
    };
    try {
      const raw = window.localStorage?.getItem(this._profileStorageKey(slotId));
      if (!raw) return fallback;
      const payload = JSON.parse(raw);
      const coinsRaw = payload?.coins;
      const coins = coinsRaw === "inf" ? Number.POSITIVE_INFINITY : Number.parseInt(coinsRaw, 10);
      const unlocked = Array.isArray(payload?.unlocked)
        ? payload.unlocked.filter((id) => typeof id === "string" && id)
        : defaults;
      return {
        coins: Number.isFinite(coins) ? Math.max(0, coins) : 0,
        unlocked,
      };
    } catch {
      return fallback;
    }
  }

  _isDebugProfile(slotId) {
    return slotId === DEBUG_PROFILE_ID;
  }

  _buildDebugUnlocks() {
    const unlocks = new Set();
    const towerDefs = this._data?.towerDefs || {};
    for (const id of Object.keys(towerDefs)) unlocks.add(towerUnlockKey(id));
    for (const map of this._data?.mapDefs || []) {
      if (map?.id) unlocks.add(mapUnlockKey(map.id));
    }
    for (const mode of this._data?.modeDefs || []) {
      if (mode?.id) unlocks.add(modeUnlockKey(mode.id));
    }
    for (const mod of this._data?.modifierDefs || []) {
      if (mod?.id) unlocks.add(modifierUnlockKey(mod.id));
    }
    for (const featureId of Object.values(FEATURE_IDS)) {
      unlocks.add(featureUnlockKey(featureId));
    }
    return [...unlocks];
  }

  _getPaidUnlockSet() {
    const ids = this._shop?.getPaidUnlockIds?.() || [];
    return new Set(ids);
  }

  _loadProfiles() {
    return PROFILE_SLOTS.map((slot) => {
      const snapshot = this._readProfileSnapshot(slot.id);
      return {
        id: slot.id,
        name: slot.name,
        coins: snapshot.coins ?? 0,
        unlockedCount: Array.isArray(snapshot.unlocked) ? snapshot.unlocked.length : defaultUnlocks().length,
        isActive: slot.id === this._activeProfileId,
      };
    });
  }

  _renderProfiles() {
    if (!this._els.savesList) return;
    const list = this._els.savesList;
    list.innerHTML = "";
    if (this._els.savesStatus) this._els.savesStatus.textContent = "";
    this._profiles = this._loadProfiles();
    for (const profile of this._profiles) {
      const card = document.createElement("div");
      card.className = "save-card";
      if (this._isDebugProfile(profile.id)) card.classList.add("debug");

      const meta = document.createElement("div");
      meta.className = "save-meta";
      const title = document.createElement("div");
      title.className = "save-title";
      title.textContent = profile.name;
      meta.appendChild(title);

      if (this._isDebugProfile(profile.id)) {
        const tags = document.createElement("div");
        tags.className = "save-tags";
        const tag = document.createElement("span");
        tag.className = "save-tag debug";
        tag.textContent = "Debug";
        tags.appendChild(tag);
        meta.appendChild(tags);
      }

      const coinLine = document.createElement("div");
      coinLine.className = "save-sub";
      coinLine.textContent = `Coins: ${this._formatCoinCount(profile.coins)}`;
      meta.appendChild(coinLine);

      const unlockLine = document.createElement("div");
      unlockLine.className = "save-sub";
      unlockLine.textContent = `Unlocked: ${profile.unlockedCount}`;
      meta.appendChild(unlockLine);

      if (this._isDebugProfile(profile.id)) {
        const note = document.createElement("div");
        note.className = "save-sub debug";
        note.textContent = "Progress does not save in Debug.";
        meta.appendChild(note);

        const themeNote = document.createElement("div");
        themeNote.className = "save-sub debug";
        themeNote.textContent = "Theme locked to Debug.";
        meta.appendChild(themeNote);
      }

      const actions = document.createElement("div");
      actions.className = "save-actions";
      const switchBtn = document.createElement("button");
      switchBtn.className = profile.isActive ? "ghost" : "primary";
      switchBtn.type = "button";
      switchBtn.dataset.profileSwitch = profile.id;
      switchBtn.textContent = profile.isActive ? "Active" : "Switch";
      switchBtn.disabled = profile.isActive;
      actions.appendChild(switchBtn);

      card.appendChild(meta);
      card.appendChild(actions);
      list.appendChild(card);
    }
  }

  _setSavesStatus(message = "", type = "info") {
    if (!this._els.savesStatus) return;
    this._els.savesStatus.textContent = message;
    this._els.savesStatus.classList.toggle("danger", type === "error");
  }

  _switchProfile(slotId) {
    if (!slotId || !PROFILE_SLOTS.some((slot) => slot.id === slotId)) return;
    if (slotId === this._activeProfileId) return;
    this._setActiveProfileId(slotId);
    const isDebug = this._isDebugProfile(slotId);
    if (this._progression?.setPersistence) {
      this._progression.setPersistence(!isDebug);
    }
    if (this._progression?.setStorageKey) {
      this._progression.setStorageKey(this._profileStorageKey(slotId));
    }
    this._applyProfileOverrides(slotId);
    this._applyUnlockState();
    this._syncCoins();
    this._buildShop();
    this._resetToMenuForProfileSwitch();
    this._renderProfiles();
    const label = PROFILE_SLOTS.find((slot) => slot.id === slotId)?.name || "Profile";
    this._setSavesStatus(`Switched to ${label}.`, "info");
  }

  _applyProfileOverrides(slotId) {
    if (!this._progression) return;
    if (!this._isDebugProfile(slotId)) return;
    this._progression.resetToDefaults?.();
    this._progression.setCoins(Number.POSITIVE_INFINITY);
    this._progression.unlockMany(this._buildDebugUnlocks());
  }

  _resetToMenuForProfileSwitch() {
    if (this._game?.state) {
      this._game.state.mode = "menu";
      this._game.state.paused = false;
      this._game.state.inWave = false;
      this._game.state.pendingVictory = null;
    }
    this._els.gameOver?.classList.add("hidden");
    this._els.gameOver?.classList.remove("victory");
    if (this._els.setupScreen) this._els.setupScreen.classList.add("hidden");
    if (this._els.titleScreen) this._els.titleScreen.classList.remove("hidden");
    this._setStartMenuOpen(true);
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

    const allDefs = Object.values(this._data.towerDefs);
    const defs = this._shop?.isTowerUnlocked
      ? allDefs.filter((def) => this._shop.isTowerUnlocked(def.id))
      : allDefs;
    const groups = new Map();
    for (const def of defs) {
      const role = String(def?.role || "other");
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role).push(def);
    }

    const roleOrder = [
      "single-target",
      "splash",
      "dps",
      "slowing",
      "debuff",
      "support",
      "summoner",
      "other",
    ];
    const roleKeys = [...groups.keys()].sort((a, b) => {
      const ia = roleOrder.indexOf(a);
      const ib = roleOrder.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      return a.localeCompare(b);
    });

    for (const role of roleKeys) {
      const header = document.createElement("div");
      header.className = "palette-group-title";
      header.textContent = formatRoleLabel(role);
      palette.appendChild(header);

      const list = groups.get(role) || [];
      list.sort((a, b) => this._game.getTowerCost(a) - this._game.getTowerCost(b));

      for (const def of list) {
        const btn = document.createElement("button");
        const icon = document.createElement("span");
        icon.className = "tower-icon";
        const iconUrl = this._getTowerIconUrl(def);
        if (iconUrl) icon.style.setProperty("--tower-icon", `url(${iconUrl})`);
        const text = document.createElement("span");
        text.className = "tower-text";
        const label = document.createElement("span");
        label.className = "tower-label";
        label.textContent = def.name;
        const meta = document.createElement("span");
        meta.className = "tower-meta";
        const cost = document.createElement("span");
        cost.className = "tower-cost";
        const sub = document.createElement("span");
        sub.className = "tower-subtext";
        meta.appendChild(cost);
        meta.appendChild(sub);
        text.appendChild(label);
        text.appendChild(meta);
        btn.appendChild(icon);
        btn.appendChild(text);
        btn.removeAttribute("title");
        this._setPaletteTooltipData(btn, def);
        btn.addEventListener("click", () => {
          const locked = this._shop ? !this._shop.isTowerUnlocked(def.id) : false;
          if (locked) {
            this._setShopStatus(`Unlock ${def.name} to build it.`, "error");
            this._showShopScreen();
            return;
          }
          const cur = this._game.state.buildTowerId;
          this._game.state.buildTowerId = cur === def.id ? null : def.id;
        });
        palette.appendChild(btn);
        this._paletteButtons.set(def.id, btn);
      }
    }

    this._els.buildHint.textContent =
      "Pick a tower, then click a build tile. Right‑click or Esc to cancel. Q sells selected tower.";
  }

  refreshPaletteCosts() {
    this._buildPalette();
    this.setBuildSelection(this._game.state.buildTowerId);
  }

  _refreshPaletteTooltips() {
    for (const def of Object.values(this._data.towerDefs)) {
      const btn = this._paletteButtons.get(def.id);
      if (!btn) continue;
      this._setPaletteTooltipData(btn, def);
    }
  }

  _setPaletteTooltipData(btn, def) {
    if (!btn || !def) return;
    const locked = this._shop ? !this._shop.isTowerUnlocked(def.id) : false;
    btn.classList.toggle("locked", locked);
    const stats = this._game.getTowerBaseStats?.(def) || def?.stats || null;
    const totalDps = stats ? calcTotalDps(stats).total ?? 0 : 0;
    const cost = this._game.getTowerCost(def);
    const costEl = btn.querySelector(".tower-cost");
    const subEl = btn.querySelector(".tower-subtext");
    if (locked) {
      const unlockCost = this._shop?.getTowerUnlockCost?.(def.id);
      if (costEl) costEl.textContent = unlockCost ? `${unlockCost}c` : "Locked";
      if (subEl) subEl.textContent = "Locked";
    } else {
      if (costEl) costEl.textContent = `${cost}g`;
      if (subEl) subEl.textContent = getTowerSubtext(def, stats, totalDps);
    }
  }

  _ensureTowerIcons() {
    if (this._towerIconUrls) return;
    const sprites = buildTowerSprites(this._data.towerDefs || {});
    const urls = new Map();
    for (const [id, canvas] of Object.entries(sprites || {})) {
      try {
        urls.set(id, canvas.toDataURL());
      } catch {
        // Ignore serialization failures; fallback will be empty.
      }
    }
    this._towerIconUrls = urls;
  }

  _getTowerIconUrl(def) {
    if (!def) return null;
    this._ensureTowerIcons();
    return this._towerIconUrls?.get(def.id) || null;
  }

  _ensureEnemyIcons() {
    if (this._enemyIconUrls) return;
    const sprites = buildSprites({
      towerDefs: this._data.towerDefs || {},
      enemyDefs: this._data.enemyDefs || {},
    });
    const urls = new Map();
    for (const [id, canvas] of Object.entries(sprites?.enemies || {})) {
      try {
        urls.set(id, canvas.toDataURL());
      } catch {
        // Ignore serialization failures; fallback will be empty.
      }
    }
    this._enemyIconUrls = urls;
  }

  _getEnemyIconUrl(enemyId) {
    if (!enemyId) return null;
    this._ensureEnemyIcons();
    return this._enemyIconUrls?.get(enemyId) || null;
  }

  setStats(s) {
    this._els.money.textContent = String(s.money);
    this._els.lives.textContent = String(s.lives);
    const waveSuffix = s.waveGoal ? ` / ${s.waveGoal}` : "";
    this._els.wave.textContent = `${s.wave}${waveSuffix}`;
    this._els.threat.textContent = s.threat == null ? "-" : String(s.threat);
    this._els.toggleAutoBtn.textContent = `Auto: ${s.auto ? "On" : "Off"}`;
    this._els.nextWaveBtn.disabled = Boolean(s.inWave);
    if (this._els.skipWaveBtn) {
      const skipLocked = !this._isFeatureUnlocked(FEATURE_IDS.AUTO_SKIP);
      const disabled = skipLocked || !s.inWave || Boolean(s.bossWave) || Boolean(s.spawnPending);
      this._els.skipWaveBtn.disabled = disabled;
      this._els.skipWaveBtn.classList.toggle("locked", skipLocked);
      if (skipLocked) this._els.skipWaveBtn.title = "Unlock Auto Skip in the Shop.";
      else if (s.bossWave) this._els.skipWaveBtn.title = "Boss waves cannot be skipped.";
      else if (!s.inWave) this._els.skipWaveBtn.title = "Start a wave to enable.";
      else if (s.spawnPending) this._els.skipWaveBtn.title = "Wait for all spawns to finish.";
      else this._els.skipWaveBtn.title = "Skip the current wave and start the next (enemies remain).";
    }
    if (this._els.skipWaveHint || this._els.skipWaveHintText || this._els.skipWaveStatus) {
      const hintText = this._els.skipWaveHintText || this._els.skipWaveHint;
      const status = this._els.skipWaveStatus;
      if (status) status.className = "status-dot";

      if (!this._isFeatureUnlocked(FEATURE_IDS.AUTO_SKIP)) {
        if (status) status.classList.add("locked");
        if (hintText) hintText.textContent = "Unlock Auto Skip in the Shop to enable wave skipping.";
      } else if (s.bossWave) {
        if (status) status.classList.add("locked");
        if (hintText) hintText.textContent = "Boss wave: skipping is disabled.";
      } else if (!s.inWave) {
        if (hintText) hintText.textContent = "Skip becomes available once a wave starts.";
      } else if (s.spawnPending) {
        if (status) status.classList.add("pending");
        const remaining = Math.max(0, Number.isFinite(s.spawnRemaining) ? s.spawnRemaining : 0);
        const display = remaining >= 10 ? Math.ceil(remaining) : Math.max(0.1, Math.ceil(remaining * 10) / 10);
        if (hintText) hintText.textContent = `Spawns finishing in ${display}s.`;
      } else {
        if (status) status.classList.add("ready");
        if (hintText) hintText.textContent = "Spawns complete. Skip starts the next wave; enemies remain.";
      }
    }

    for (const def of Object.values(this._data.towerDefs)) {
      const btn = this._paletteButtons.get(def.id);
      if (!btn) continue;
      const cost = this._game.getTowerCost(def);
      btn.classList.toggle("costly", s.money < cost);
    }
  }

  setAdminStats(s) {
    if (!this._els.adminPanel) return;
    const counts = s.counts || {};
    if (this._els.adminStatusMap) this._els.adminStatusMap.textContent = s.map ?? "-";
    if (this._els.adminStatusMode) this._els.adminStatusMode.textContent = s.mode ?? "-";
    if (this._els.adminStatusWave) {
      const waveSuffix = s.waveGoal ? ` / ${s.waveGoal}` : "";
      const active = s.inWave ? " (active)" : "";
      this._els.adminStatusWave.textContent = `${s.wave}${waveSuffix}${active}`;
    }
    if (this._els.adminStatusTime) this._els.adminStatusTime.textContent = formatClock(s.time ?? 0);
    if (this._els.adminStatusThreat) this._els.adminStatusThreat.textContent = s.threat == null ? "-" : String(s.threat);
    if (this._els.adminStatusEntities) {
      const towers = counts.towers ?? 0;
      const enemies = counts.enemies ?? 0;
      const allies = counts.allies ?? 0;
      const projectiles = counts.projectiles ?? 0;
      const vfx = counts.vfx ?? 0;
      this._els.adminStatusEntities.textContent = `T ${towers} | E ${enemies} | A ${allies} | P ${projectiles} | V ${vfx}`;
    }
    if (this._els.adminStatusSim) {
      const rawSpeed = Number.isFinite(s.timeScale) ? Math.round(s.timeScale * 100) / 100 : 1;
      const speed = Number.isInteger(rawSpeed) ? String(rawSpeed) : String(rawSpeed);
      const state = s.paused ? "Paused" : "Running";
      this._els.adminStatusSim.textContent = `${speed}x · ${state}`;
    }
    if (this._els.adminStatusSeed) this._els.adminStatusSeed.textContent = s.seed == null ? "-" : String(s.seed);

    if (this._els.adminTogglePause) {
      this._els.adminTogglePause.textContent = s.paused ? "Resume" : "Pause";
    }
    if (this._els.adminToggleAuto) {
      this._els.adminToggleAuto.textContent = `Auto Waves: ${s.auto ? "On" : "Off"}`;
    }
    const activeEl = document.activeElement;
    if (this._els.adminTimeScale && activeEl !== this._els.adminTimeScale) {
      const value = String(s.timeScale ?? 1);
      if (this._els.adminTimeScale.value !== value) this._els.adminTimeScale.value = value;
    }
    if (this._els.adminInvincible && activeEl !== this._els.adminInvincible) {
      this._els.adminInvincible.checked = Boolean(s.invincible);
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

  _setSelectedCardVisible(visible) {
    const card = this._els.selectedCard;
    if (!card) return;
    const reduceUiAnimations = Boolean(this._settings?.disableUiAnimations);

    if (visible) {
      card.classList.remove("hidden");
      card.setAttribute("aria-hidden", "false");
      if (!card.classList.contains("is-collapsed")) return;
      if (reduceUiAnimations) {
        card.classList.remove("is-collapsed");
        return;
      }
      // Remove immediately to avoid stuck collapsed state in non-RAF loops.
      card.classList.remove("is-collapsed");
      return;
    }

    if (card.classList.contains("is-collapsed")) {
      card.setAttribute("aria-hidden", "true");
      card.classList.add("hidden");
      return;
    }

    this._selectedUi.collapseToken += 1;
    const token = this._selectedUi.collapseToken;

    card.setAttribute("aria-hidden", "true");
    if (reduceUiAnimations) {
      card.classList.add("is-collapsed");
      card.classList.add("hidden");
      return;
    }
    card.classList.add("is-collapsed");
    const handleTransitionEnd = (ev) => {
      if (token !== this._selectedUi.collapseToken) {
        card.removeEventListener("transitionend", handleTransitionEnd);
        return;
      }
      if (ev.propertyName !== "max-height") return;
      card.removeEventListener("transitionend", handleTransitionEnd);
      card.classList.add("hidden");
    };
    card.addEventListener("transitionend", handleTransitionEnd);
  }

  _ensureSelectedCardDom() {
    let card = this._els.selectedCard || document.getElementById("selected-card");
    if (!card) {
      const sidePanel = document.getElementById("side-panel");
      if (sidePanel) {
        card = document.createElement("section");
        card.id = "selected-card";
        card.className = "card is-collapsed";
        card.setAttribute("aria-hidden", "true");
        const stats = sidePanel.querySelector(".stats");
        if (stats && stats.nextSibling) {
          sidePanel.insertBefore(card, stats.nextSibling);
        } else if (stats) {
          sidePanel.appendChild(card);
        } else {
          sidePanel.prepend(card);
        }
      }
    }
    if (!card) return null;

    let header = card.querySelector("h3");
    if (!header) {
      header = document.createElement("h3");
      header.textContent = "Selected";
      card.prepend(header);
    }

    let info = card.querySelector("#selected-info");
    if (!info) {
      info = document.createElement("div");
      info.id = "selected-info";
      card.appendChild(info);
    }

    let actions = card.querySelector("#selected-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.id = "selected-actions";
      card.appendChild(actions);
    }

    info.classList.remove("hidden");
    actions.classList.remove("hidden");

    this._els.selectedCard = card;
    this._els.selectedInfo = info;
    this._els.selectedActions = actions;

    return { card, info, actions };
  }

  setSelected(sel) {
    const dom = this._ensureSelectedCardDom();
    if (!dom) return;

    const { card } = dom;

    if (!sel) {
      const info = this._els.selectedInfo;
      const actions = this._els.selectedActions;
      if (info) {
        info.className = "muted small";
        info.textContent = "Nothing selected.";
      }
      if (actions) actions.innerHTML = "";
      if (card) this._setSelectedCardVisible(false);
      this._selectedUi.viewKey = null;
      return;
    }

    const { tower, def, stats } = sel;
    if (!def || !stats) {
      const info = this._els.selectedInfo;
      const actions = this._els.selectedActions;
      if (info) {
        info.className = "muted small";
        info.textContent = "Selection missing data.";
      }
      if (actions) actions.innerHTML = "";
      if (card) this._setSelectedCardVisible(false);
      this._selectedUi.viewKey = null;
      return;
    }

    if (card) this._setSelectedCardVisible(true);

    const upgrades = def.upgrades || [];
    const upgradeNameById = new Map(upgrades.map((u) => [u.id, u.name]));
    const upgradeById = new Map(upgrades.map((u) => [u.id, u]));

    const childrenByReq = new Map();
    for (const up of upgrades) {
      for (const req of up.requires || []) {
        if (!upgradeById.has(req)) continue;
        if (!childrenByReq.has(req)) childrenByReq.set(req, []);
        childrenByReq.get(req).push(up);
      }
    }

    const tierOf = (u) => (u?.tier ?? 1);
    const roots = upgrades.filter((u) => tierOf(u) === 1);

    const rootFor = (upgradeId) => {
      let current = upgradeById.get(upgradeId);
      const seen = new Set();
      while (current) {
        const req = (current.requires || []).find((r) => upgradeById.has(r));
        if (!req) break;
        if (seen.has(req)) break;
        seen.add(req);
        current = upgradeById.get(req);
      }
      return current;
    };

    const ownedRoots = new Set();
    for (const id of tower.appliedUpgrades) {
      const root = rootFor(id);
      if (root) ownedRoots.add(root.id);
    }

    const activeRoots = ownedRoots.size ? [...ownedRoots] : roots.map((r) => r.id);
    const activeRootId = ownedRoots.size ? activeRoots[0] : null;
    const chosenRootNames = ownedRoots.size
      ? [...ownedRoots].map((id) => upgradeById.get(id)?.name || id).filter(Boolean)
      : [];

    const rootMatches = (up) => {
      if (!activeRootId) return true;
      const root = rootFor(up.id);
      return root?.id === activeRootId;
    };

    const pathUpgrades = upgrades.filter((u) => rootMatches(u));
    const maxTier = pathUpgrades.length ? Math.max(...pathUpgrades.map((u) => tierOf(u))) : 1;
    const ownedInPath = pathUpgrades.filter((u) => tower.appliedUpgrades.has(u.id));
    const highestOwnedTier = ownedInPath.length ? Math.max(...ownedInPath.map((u) => tierOf(u))) : 0;
    const maxedPath = pathUpgrades.length
      ? highestOwnedTier >= maxTier && pathUpgrades.every((u) => tower.appliedUpgrades.has(u.id))
      : false;
    const activeTier = activeRootId ? Math.min(maxTier, Math.max(1, highestOwnedTier + 1)) : 1;
    const upgradesToShow = pathUpgrades.filter((u) => tierOf(u) === activeTier);

    const appliedKey = [...tower.appliedUpgrades].sort().join("|");
    const viewKey = `${tower.id}|${activeRootId || "any"}|${activeTier}|${maxedPath ? "max" : "open"}|${appliedKey}`;
    const needsRebuild =
      this._selectedUi.viewKey !== viewKey ||
      !this._selectedUi.infoEls ||
      !this._selectedUi.targetingSelect ||
      !this._selectedUi.upgradesById;

    if (needsRebuild) {
      // Hard reset only when the selection or tier/path view changes.
      card.innerHTML = "";
      const header = document.createElement("h3");
      header.textContent = "Selected";
      card.appendChild(header);

      const info = document.createElement("div");
      info.id = "selected-info";
      info.style.display = "block";
      card.appendChild(info);

      const actions = document.createElement("div");
      actions.id = "selected-actions";
      actions.style.display = "grid";
      card.appendChild(actions);

      this._els.selectedInfo = info;
      this._els.selectedActions = actions;
      this._els.selectedCard = card;

      this._selectedUi.upgradesById = new Map();

      // Info block
      info.className = "small";
      info.innerHTML = "";

      const title = document.createElement("div");
      title.className = "selected-title";
      title.textContent = `${def.name} — ${formatRoleLabel(def.role)}`;

      const sub = document.createElement("div");
      sub.className = "selected-sub muted";
      sub.textContent = `Tile: (${tower.tx}, ${tower.ty})`;

      const metrics = document.createElement("div");
      metrics.className = "selected-metrics";

      const costPill = document.createElement("div");
      costPill.className = "selected-metric";
      const costLabel = document.createElement("span");
      costLabel.className = "selected-metric-label";
      costLabel.textContent = "Total cost";
      const costValue = document.createElement("span");
      costValue.className = "selected-metric-value";
      costPill.appendChild(costLabel);
      costPill.appendChild(costValue);

      const dmgPill = document.createElement("div");
      dmgPill.className = "selected-metric";
      const dmgLabel = document.createElement("span");
      dmgLabel.className = "selected-metric-label";
      dmgLabel.textContent = "Damage dealt";
      const dmgValue = document.createElement("span");
      dmgValue.className = "selected-metric-value";
      dmgPill.appendChild(dmgLabel);
      dmgPill.appendChild(dmgValue);

      metrics.appendChild(costPill);
      metrics.appendChild(dmgPill);

      const statsEl = document.createElement("div");
      statsEl.className = "selected-stats";

      info.appendChild(title);
      info.appendChild(sub);
      info.appendChild(metrics);
      info.appendChild(statsEl);
      this._selectedUi.metricsEls = { costValue, dmgValue };

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
        const dpsBreakdown = calcTotalDps(stats);
        if (dpsBreakdown.total > 0) {
          const baseText = fmt(dpsBreakdown.base, 1);
          const abilityText = fmt(dpsBreakdown.ability, 1);
          const totalText = fmt(dpsBreakdown.total, 1);
          const suffix = dpsBreakdown.ability > 0 ? ` (Base ${baseText} + Ability ${abilityText})` : "";
          const tooltip = dpsBreakdown.ability > 0
            ? "DPS = base attacks + average ability DPS (damage per use / cooldown). Summons use uptime."
            : "DPS = base attacks (expected crit damage included).";
          lines.push({ text: `DPS: ${totalText}${suffix}`, title: tooltip });
        }
        lines.push(`Splash: ${Math.round(stats.splashRadius) || "-"} | Projectile: ${Math.round(stats.projectileSpeed)}`);
        if (stats.onHitEffects?.length) lines.push(`On-hit: ${stats.onHitEffects.map((e) => e.type).join(", ")}`);
      }
      if (stats.ability) {
        const count = stats.ability.count ? ` x${stats.ability.count}` : "";
        lines.push(`Ability: ${stats.ability.name || "Ability"} (CD ${fmt(stats.ability.cooldown ?? 0, 1)}s${count})`);
        const abilityDesc = describeTowerAbility(stats.ability, stats);
        if (abilityDesc) lines.push(`Ability Effect: ${abilityDesc}`);
        if (stats.ability.summon) {
          const s = stats.ability.summon;
          lines.push(`Summon: ${s.name || "Unit"} | HP ${Math.round(s.hp ?? 0)} | Dmg ${Math.round(s.damage ?? 0)} (${s.damageType || stats.damageType})`);
          lines.push(`Summon FR ${fmt(s.fireRate ?? 0, 2)}/s | Range ${Math.round(s.range ?? 0)} | Life ${fmt(s.lifetime ?? 0, 1)}s`);
          lines.push(`Summon Speed ${Math.round(s.speed ?? 0)} | Projectile ${Math.round(s.projectileSpeed ?? 0)}`);
          if (s.chain) {
            lines.push(`Summon Chain: jumps ${s.chain.maxJumps ?? 0} | range ${Math.round(s.chain.range ?? 0)}`);
          }
          if (s.onHitEffects?.length) lines.push(`Summon On-hit: ${s.onHitEffects.map((e) => e.type).join(", ")}`);
        }
      }
      statsEl.innerHTML = "";
      for (const line of lines) {
        const row = document.createElement("div");
        if (typeof line === "string") {
          row.textContent = line;
        } else if (line && typeof line === "object") {
          row.textContent = line.text || "";
          if (line.title) row.title = line.title;
        }
        statsEl.appendChild(row);
      }
      // Controls
      actions.innerHTML = "";
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

      const override = tower.targetingOverride ?? null;
      targetingSelect.value = override ? normalizeTargeting(override) : "";
      if (stats.aura) {
        optDefault.textContent = "N/A (Support)";
        targetingSelect.disabled = true;
      } else {
        const baseTargeting = tower.computeStats(def, { ignoreOverride: true, modifiers: this._game.modifierState }).targeting;
        optDefault.textContent = `Default (${labelForTargeting(baseTargeting)})`;
      }

      targetingRow.appendChild(targetingLabel);
      targetingRow.appendChild(targetingSelect);
      controls.appendChild(targetingRow);

      const sellBtn = document.createElement("button");
      sellBtn.className = "danger";
      sellBtn.textContent = "Sell (70% refund)";
      sellBtn.addEventListener("click", () => this._game.sellSelectedTower());
      controls.appendChild(sellBtn);

      actions.appendChild(controls);

      this._selectedUi.targetingSelect = targetingSelect;
      this._selectedUi.sellBtn = sellBtn;
      this._selectedUi.infoEls = { title, sub, statsEl };

      // Upgrades (current tier only)
      const upgradeWrap = document.createElement("div");
      upgradeWrap.className = "upgrade-wrap";
      actions.appendChild(upgradeWrap);

      if (!upgrades.length) {
        const empty = document.createElement("div");
        empty.className = "muted small";
        empty.textContent = "No upgrades available.";
        upgradeWrap.appendChild(empty);
      } else {
        if (chosenRootNames.length) {
          const chosen = document.createElement("div");
          chosen.className = "upgrade-path-chosen";
          const label = document.createElement("span");
          label.className = "upgrade-path-label";
          label.textContent = "Path chosen";
          const name = document.createElement("span");
          name.className = "upgrade-path-name";
          name.textContent = chosenRootNames.join(" / ");
          chosen.appendChild(label);
          chosen.appendChild(name);
          upgradeWrap.appendChild(chosen);
        }

        if (!maxedPath) {
          const wrap = document.createElement("div");
          wrap.className = "upgrade-tier-wrap";
          upgradeWrap.appendChild(wrap);

          const head = document.createElement("div");
          head.className = "upgrade-tier";
          head.textContent = `Tier ${activeTier}`;
          wrap.appendChild(head);

          const grid = document.createElement("div");
          grid.className = "upgrade-grid";
          wrap.appendChild(grid);

          for (const up of upgradesToShow) {
            const cardEl = document.createElement("div");
            cardEl.className = "upgrade-card";

            const top = document.createElement("div");
            top.className = "upgrade-top";

            const name = document.createElement("div");
            name.className = "upgrade-name";
            if ((up.tier ?? 1) === 1) {
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
            const costValue = this._game.getUpgradeCost(up);
            cost.textContent = `${costValue}g`;

            const badge = document.createElement("span");
            badge.className = "badge";

            top.appendChild(name);
            top.appendChild(cost);
            top.appendChild(badge);

            const desc = document.createElement("div");
            desc.className = "upgrade-desc muted";
            const nextStats = getStatsWithUpgrade(tower, def, up, this._game.modifierState);
            if (up.description) {
              const row = document.createElement("div");
              row.className = "upgrade-desc-line";
              row.textContent = up.description;
              desc.appendChild(row);
            }
            const abilityLine = getUpgradeAbilityDescription(stats, nextStats);
            if (abilityLine) {
              const row = document.createElement("div");
              row.className = "upgrade-ability";
              row.textContent = abilityLine;
              desc.appendChild(row);
            }
            const changeLines = getUpgradeStatChanges(stats, nextStats);
            if (changeLines.length) {
              const changes = document.createElement("div");
              changes.className = "upgrade-changes";
              for (const line of changeLines) {
                const row = document.createElement("div");
                row.className = "upgrade-change";
                row.textContent = line;
                changes.appendChild(row);
              }
              desc.appendChild(changes);
            }

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
            btn.addEventListener("click", () => this._game.buyUpgrade(up.id));

            cardEl.appendChild(top);
            cardEl.appendChild(desc);
            if (tags.length) cardEl.appendChild(tagRow);
            cardEl.appendChild(reason);
            cardEl.appendChild(btn);
            grid.appendChild(cardEl);

            this._selectedUi.upgradesById.set(up.id, {
              card: cardEl,
              btn,
              badge,
              reason,
              costValue,
              upgrade: up,
              nameEl: name,
            });
          }
        }

        if (maxedPath) {
          const root = activeRootId ? upgradeById.get(activeRootId) : null;
          const maxed = document.createElement("div");
          maxed.className = "upgrade-maxed";
          if (root?.name) {
            const titleEl = document.createElement("div");
            titleEl.className = "upgrade-maxed-title";
            titleEl.textContent = `Maxed Path: ${root.name}`;
            maxed.appendChild(titleEl);
          } else {
            const titleEl = document.createElement("div");
            titleEl.className = "upgrade-maxed-title";
            titleEl.textContent = "Path maxed";
            maxed.appendChild(titleEl);
          }
          const ownedNames = ownedInPath
            .slice()
            .sort((a, b) => tierOf(a) - tierOf(b))
            .map((u) => u.name)
            .join(" → ");
          const sub = document.createElement("div");
          sub.className = "upgrade-maxed-sub";
          sub.textContent = ownedNames || "All upgrades acquired.";
          maxed.appendChild(sub);
          upgradeWrap.appendChild(maxed);
        }
      }

      this._selectedUi.viewKey = viewKey;
    }

    // Info block
    if (this._selectedUi.metricsEls) {
      const totalCost = Math.round(tower.totalCost ?? 0);
      const totalDamage = Math.round(tower.totalDamage ?? 0);
      this._selectedUi.metricsEls.costValue.textContent = `${totalCost}g`;
      this._selectedUi.metricsEls.dmgValue.textContent = `${totalDamage}`;
    }

    // Update upgrade button states (no DOM rebuild)
    const money = this._game.state.money;
    if (this._selectedUi.upgradesById?.size) {
      for (const [id, item] of this._selectedUi.upgradesById.entries()) {
        const up = item.upgrade;
        const owned = tower.appliedUpgrades.has(id);
        const canAfford = money >= item.costValue;
        const missingReq = (up.requires || []).filter((r) => !tower.appliedUpgrades.has(r));
        const conflicts = (up.excludes || []).filter((x) => tower.appliedUpgrades.has(x));
        const canBuy = !owned && canAfford && missingReq.length === 0 && conflicts.length === 0;

        item.card.classList.toggle("owned", owned);
        item.badge.classList.toggle("owned", owned);
        item.badge.classList.toggle("locked", !owned && !canBuy);
        item.badge.textContent = owned ? "Owned" : canBuy ? "Ready" : "Locked";

        item.btn.disabled = !canBuy;
        item.btn.textContent = owned ? "Owned" : `Buy (-${item.costValue}g)`;

        if (owned) {
          item.reason.textContent = "Owned";
        } else if (!canAfford) {
          item.reason.textContent = `Need ${item.costValue - money}g`;
        } else if (missingReq.length) {
          item.reason.textContent = `Requires: ${missingReq.map((rid) => upgradeNameById.get(rid) || rid).join(", ")}`;
        } else if (conflicts.length) {
          item.reason.textContent = `Blocked by: ${conflicts.map((rid) => upgradeNameById.get(rid) || rid).join(", ")}`;
        } else {
          item.reason.textContent = "Available";
        }
      }
    }
  }


  setActiveModifiers(names) {
    const el = this._els.activeModifiers;
    if (!el) return;
    if (this._modifiersLocked()) {
      el.textContent = "Locked";
      el.classList.add("muted");
      return;
    }
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

  _loadCustomModes() {
    try {
      const raw = window.localStorage?.getItem(CUSTOM_MODE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const out = [];
      const seen = new Set();
      for (const entry of parsed) {
        const mode = this._normalizeCustomMode(entry);
        if (!mode) continue;
        let id = mode.id;
        if (!id || seen.has(id)) {
          id = this._makeCustomModeId(mode.name || "custom");
          mode.id = id;
        }
        mode.custom = true;
        seen.add(id);
        out.push(mode);
      }
      return out;
    } catch (err) {
      console.warn("Failed to load custom modes", err);
      return [];
    }
  }

  _saveCustomModes() {
    try {
      window.localStorage?.setItem(CUSTOM_MODE_STORAGE_KEY, JSON.stringify(this._customModes));
    } catch (err) {
      console.warn("Failed to save custom modes", err);
    }
    this._cloud?.scheduleSave?.("custom-modes");
  }

  _refreshModeDefs() {
    const includeCustom = this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES);
    this._data.modeDefs = includeCustom ? [...this._baseModeDefs, ...this._customModes] : [...this._baseModeDefs];
  }

  _buildModeSelect() {
    if (!this._els.modeSelect) return;
    const current = this._els.modeSelect.value;
    this._els.modeSelect.innerHTML = "";

    const baseGroup = document.createElement("optgroup");
    baseGroup.label = "Built-in Modes";
    for (const m of this._baseModeDefs) {
      const opt = document.createElement("option");
      opt.value = m.id;
      let locked = false;
      let label = m.name;
      if (m.requiredMap) {
        const mapName = this._mapName(m.requiredMap);
        const mapUnlocked = this._shop ? this._shop.isMapUnlocked(m.requiredMap) : true;
        locked = !mapUnlocked;
        label = locked ? `${m.name} — Bundle with ${mapName}` : `${m.name} — Included with ${mapName}`;
      } else {
        locked = this._shop ? !this._shop.isModeUnlocked(m.id) : false;
        const cost = this._shop?.getModeUnlockCost?.(m.id);
        if (locked && cost) label = `${m.name} — Locked (${cost}c)`;
      }
      opt.textContent = label;
      opt.disabled = locked;
      baseGroup.appendChild(opt);
    }
    this._els.modeSelect.appendChild(baseGroup);

    if (this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES) && this._customModes.length) {
      const customGroup = document.createElement("optgroup");
      customGroup.label = "Custom Modes";
      for (const m of this._customModes) {
        const opt = document.createElement("option");
        opt.value = m.id;
        let label = m.name;
        let locked = false;
        if (m.requiredMap) {
          const mapName = this._mapName(m.requiredMap);
          const mapUnlocked = this._shop ? this._shop.isMapUnlocked(m.requiredMap) : true;
          locked = !mapUnlocked;
          label = locked ? `${m.name} — Requires ${mapName}` : `${m.name} — Map ${mapName}`;
        }
        opt.textContent = label;
        opt.disabled = locked;
        customGroup.appendChild(opt);
      }
      this._els.modeSelect.appendChild(customGroup);
    }

    const currentOpt = current ? this._els.modeSelect.querySelector(`option[value="${current}"]`) : null;
    if (currentOpt && !currentOpt.disabled) {
      this._els.modeSelect.value = current;
      return;
    }
    const firstEnabled = [...this._els.modeSelect.options].find((opt) => !opt.disabled);
    if (firstEnabled) this._els.modeSelect.value = firstEnabled.value;
  }

  _buildEnemyList() {
    const defs = this._data.enemyDefs || {};
    return Object.values(defs)
      .map((e) => ({ id: e.id, name: e.name || e.id, tags: e.tags || [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _bindCustomModes() {
    if (!this._els.customModeOpen) return;

    this._renderCustomModeSelect();
    this._syncCustomModeCount();
    this._populateCustomModeSelects();
    this._resetCustomModeForm();
    this._updateCustomModeWarnings();

    this._els.customModeOpen.addEventListener("click", () => this._showCustomModeScreen());
    this._els.customModeClose?.addEventListener("click", () => this._hideCustomModeScreen());

    this._els.customModeSelect?.addEventListener("change", () => {
      const id = this._els.customModeSelect.value;
      if (!id) {
        this._customModeEditingId = null;
        this._resetCustomModeForm();
        return;
      }
      const mode = this._customModes.find((m) => m.id === id);
      if (mode) this._loadCustomMode(mode);
    });

    this._els.customModeNew?.addEventListener("click", () => {
      this._customModeEditingId = null;
      if (this._els.customModeSelect) this._els.customModeSelect.value = "";
      this._resetCustomModeForm();
      this._setCustomModeStatus("New custom mode ready.", "info");
    });

    this._els.customModeDelete?.addEventListener("click", () => this._deleteCustomMode());
    this._els.customModeSave?.addEventListener("click", () => this._saveCustomMode(false));
    this._els.customModeSaveCopy?.addEventListener("click", () => this._saveCustomMode(true));

    this._els.customModeLoadTemplate?.addEventListener("click", () => this._loadTemplateMode());
    this._els.customModeReset?.addEventListener("click", () => {
      this._customModeEditingId = null;
      if (this._els.customModeSelect) this._els.customModeSelect.value = "";
      this._resetCustomModeForm();
      this._setCustomModeStatus("Form reset.", "info");
    });

    this._els.customModeExport?.addEventListener("click", () => this._exportCustomModeJson());
    this._els.customModeImport?.addEventListener("click", () => this._importCustomModeJson());
    this._els.customModeCopy?.addEventListener("click", () => this._copyCustomModeJson());

    this._els.customModeEnemyAdd?.addEventListener("click", () => this._addPoolRow(this._els.customModeEnemyPool));
    this._els.customModeEliteAdd?.addEventListener("click", () => this._addPoolRow(this._els.customModeElitePool));
    this._els.customModeBossAdd?.addEventListener("click", () => this._addPoolRow(this._els.customModeBossPool));

    this._els.customModeScreen?.addEventListener("input", () => this._updateCustomModeWarnings());
    this._els.customModeScreen?.addEventListener("change", () => this._updateCustomModeWarnings());
  }

  _renderCustomModeSelect() {
    if (!this._els.customModeSelect) return;
    this._els.customModeSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "New custom mode";
    this._els.customModeSelect.appendChild(placeholder);
    for (const mode of this._customModes) {
      const opt = document.createElement("option");
      opt.value = mode.id;
      opt.textContent = mode.name;
      this._els.customModeSelect.appendChild(opt);
    }
  }

  _syncCustomModeCount() {
    if (!this._els.customModeCount) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES)) {
      this._els.customModeCount.textContent = "Locked in Shop";
      return;
    }
    const count = this._customModes.length;
    this._els.customModeCount.textContent = count ? `${count} saved` : "No saved modes";
  }

  _populateCustomModeSelects() {
    if (this._els.customModeFinalBoss) {
      this._els.customModeFinalBoss.innerHTML = "";
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "None";
      this._els.customModeFinalBoss.appendChild(none);
      for (const boss of this._enemyList) {
        const opt = document.createElement("option");
        opt.value = boss.id;
        opt.textContent = `${boss.name} (${boss.id})`;
        this._els.customModeFinalBoss.appendChild(opt);
      }
    }

    const mapOptions = (select) => {
      if (!select) return;
      select.innerHTML = "";
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "None";
      select.appendChild(none);
      for (const map of this._data.mapDefs || []) {
        const opt = document.createElement("option");
        opt.value = map.id;
        opt.textContent = map.name;
        select.appendChild(opt);
      }
    };
    mapOptions(this._els.customModeRecommendedMap);
    mapOptions(this._els.customModeRequiredMap);

    if (this._els.customModeTemplate) {
      this._els.customModeTemplate.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a built-in template";
      this._els.customModeTemplate.appendChild(placeholder);
      for (const mode of this._baseModeDefs) {
        const opt = document.createElement("option");
        opt.value = mode.id;
        opt.textContent = mode.name;
        this._els.customModeTemplate.appendChild(opt);
      }
    }
  }

  _showCustomModeScreen() {
    if (!this._els.customModeScreen) return;
    if (!this._isSetupVisible()) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MODES)) {
      this._setShopStatus("Unlock Custom Modes to access this screen.", "error");
      this._showShopScreen();
      return;
    }
    this._els.customModeScreen.classList.remove("hidden");
    this._setCustomModeStatus("", "info");
    this._updateCustomModeWarnings();
  }

  _hideCustomModeScreen() {
    if (!this._els.customModeScreen) return;
    this._els.customModeScreen.classList.add("hidden");
  }

  _setCustomModeStatus(message, type = "info") {
    if (!this._els.customModeStatus) return;
    this._els.customModeStatus.textContent = message || "";
    this._els.customModeStatus.classList.toggle("danger", type === "error");
  }

  _setCustomModeWarnings(warnings) {
    if (!this._els.customModeWarnings) return;
    if (!warnings || !warnings.length) {
      this._els.customModeWarnings.textContent = "";
      this._els.customModeWarnings.classList.add("hidden");
      return;
    }
    this._els.customModeWarnings.textContent = warnings.map((w) => `- ${w}`).join("\n");
    this._els.customModeWarnings.classList.remove("hidden");
  }

  _updateCustomModeWarnings() {
    const mode = this._readCustomModeForm();
    const warnings = [];

    if (!mode.enemyPool || mode.enemyPool.length === 0) {
      warnings.push("Enemy pool is empty, so the default enemy pool will be used.");
    }
    if (mode.eliteEvery === 0 && mode.elitePool && mode.elitePool.length) {
      warnings.push("Elite pool is set, but Elite Every is 0, so elites will never spawn.");
    }
    if (mode.bossEvery === 0 && mode.bossPool && mode.bossPool.length) {
      warnings.push("Boss pool is set, but Boss Every is 0, so bosses will never spawn.");
    }
    if (!mode.totalWaves && mode.finalBoss) {
      warnings.push("Final Boss is set, but Total Waves is 0 (endless), so it will never appear.");
    }

    const nonBoss = (mode.bossPool || []).filter((entry) => {
      const tags = this._data.enemyDefs?.[entry.item]?.tags || [];
      return !tags.includes("boss");
    });
    if (nonBoss.length) {
      warnings.push("Boss pool includes non-boss enemies; they will not trigger boss-wave logic.");
    }

    const badMultipliers = [];
    if (mode.start?.moneyMul <= 0) badMultipliers.push("Money Multiplier");
    if (mode.start?.livesMul <= 0) badMultipliers.push("Lives Multiplier");
    if (mode.difficulty?.budgetMul <= 0) badMultipliers.push("Budget Multiplier");
    if (mode.difficulty?.intervalMul <= 0) badMultipliers.push("Interval Multiplier");
    if (mode.difficulty?.hpMul <= 0) badMultipliers.push("HP Multiplier");
    if (badMultipliers.length) {
      warnings.push(`The following multipliers are <= 0: ${badMultipliers.join(", ")}.`);
    }

    this._setCustomModeWarnings(warnings);
  }

  _resetCustomModeForm() {
    const defaults = this._mergeCustomDefaults(null);
    this._populateCustomModeForm(defaults);
    this._renderPoolList(this._els.customModeEnemyPool, []);
    this._renderPoolList(this._els.customModeElitePool, []);
    this._renderPoolList(this._els.customModeBossPool, []);
    if (this._els.customModeJson) this._els.customModeJson.value = "";
    this._updateCustomModeWarnings();
  }

  _mergeCustomDefaults(mode) {
    const base = mode && typeof mode === "object" ? mode : {};
    return {
      ...DEFAULT_CUSTOM_MODE,
      ...base,
      start: { ...DEFAULT_CUSTOM_START, ...(base.start || {}) },
      difficulty: { ...DEFAULT_CUSTOM_DIFFICULTY, ...(base.difficulty || {}) },
      enemyPool: Array.isArray(base.enemyPool) ? base.enemyPool : [],
      elitePool: Array.isArray(base.elitePool) ? base.elitePool : [],
      bossPool: Array.isArray(base.bossPool) ? base.bossPool : [],
    };
  }

  _populateCustomModeForm(mode) {
    const data = this._mergeCustomDefaults(mode);
    if (this._els.customModeName) this._els.customModeName.value = data.name || "";
    if (this._els.customModeDescription) this._els.customModeDescription.value = data.description || "";
    if (this._els.customModeTotalWaves) this._els.customModeTotalWaves.value = data.totalWaves ?? 0;
    if (this._els.customModeEliteEvery) this._els.customModeEliteEvery.value = data.eliteEvery ?? 0;
    if (this._els.customModeBossEvery) this._els.customModeBossEvery.value = data.bossEvery ?? 0;
    if (this._els.customModeFinalBoss) this._els.customModeFinalBoss.value = data.finalBoss || "";
    if (this._els.customModeRecommendedMap) this._els.customModeRecommendedMap.value = data.recommendedMap || "";
    if (this._els.customModeRequiredMap) this._els.customModeRequiredMap.value = data.requiredMap || "";

    if (this._els.customModeStartMoneyAdd) this._els.customModeStartMoneyAdd.value = data.start.moneyAdd ?? 0;
    if (this._els.customModeStartMoneyMul) this._els.customModeStartMoneyMul.value = data.start.moneyMul ?? 1;
    if (this._els.customModeStartLivesAdd) this._els.customModeStartLivesAdd.value = data.start.livesAdd ?? 0;
    if (this._els.customModeStartLivesMul) this._els.customModeStartLivesMul.value = data.start.livesMul ?? 1;

    if (this._els.customModeBudgetMul) this._els.customModeBudgetMul.value = data.difficulty.budgetMul ?? 1;
    if (this._els.customModeIntervalMul) this._els.customModeIntervalMul.value = data.difficulty.intervalMul ?? 1;
    if (this._els.customModeEliteMult) this._els.customModeEliteMult.value = data.difficulty.eliteMult ?? 1;
    if (this._els.customModeBossMult) this._els.customModeBossMult.value = data.difficulty.bossMult ?? 1;
    if (this._els.customModeHpMul) this._els.customModeHpMul.value = data.difficulty.hpMul ?? 1;
    if (this._els.customModeHpScale) this._els.customModeHpScale.value = data.difficulty.hpScale ?? 0.022;
    if (this._els.customModeHpLateStart) this._els.customModeHpLateStart.value = data.difficulty.hpLateStart ?? 18;
    if (this._els.customModeHpLateScale) this._els.customModeHpLateScale.value = data.difficulty.hpLateScale ?? 0.008;
    if (this._els.customModeSeenShieldBase) this._els.customModeSeenShieldBase.value = data.difficulty.seenShieldBase ?? 8;
    if (this._els.customModeSeenShieldScale) this._els.customModeSeenShieldScale.value = data.difficulty.seenShieldScale ?? 1.6;
    if (this._els.customModeSeenShieldMul) this._els.customModeSeenShieldMul.value = data.difficulty.seenShieldMul ?? 1;
    if (this._els.customModeFinalBossMult) this._els.customModeFinalBossMult.value = data.difficulty.finalBossMult ?? 1;

    if (this._els.customModeRewardBonusMul) this._els.customModeRewardBonusMul.value = data.difficulty.rewardBonusMul ?? 1;
    if (this._els.customModeRewardBonusAdd) this._els.customModeRewardBonusAdd.value = data.difficulty.rewardBonusAdd ?? 0;
    if (this._els.customModeEarlyRewardWaves) this._els.customModeEarlyRewardWaves.value = data.difficulty.earlyRewardWaves ?? 0;
    if (this._els.customModeEarlyRewardAdd) this._els.customModeEarlyRewardAdd.value = data.difficulty.earlyRewardAdd ?? 0;

    if (this._els.customModeEarlyWaves) this._els.customModeEarlyWaves.value = data.difficulty.earlyWaves ?? 0;
    if (this._els.customModeEarlyBudgetMul) this._els.customModeEarlyBudgetMul.value = data.difficulty.earlyBudgetMul ?? 1;
    if (this._els.customModeEarlyIntervalMul) this._els.customModeEarlyIntervalMul.value = data.difficulty.earlyIntervalMul ?? 1;
    if (this._els.customModeEarlyHpMul) this._els.customModeEarlyHpMul.value = data.difficulty.earlyHpMul ?? 1;
    if (this._els.customModeEarlyHpScaleMul) this._els.customModeEarlyHpScaleMul.value = data.difficulty.earlyHpScaleMul ?? 1;
    if (this._els.customModeEarlyEliteMult) this._els.customModeEarlyEliteMult.value = data.difficulty.earlyEliteMult ?? 1;
    if (this._els.customModeEarlySeenShieldMul) this._els.customModeEarlySeenShieldMul.value = data.difficulty.earlySeenShieldMul ?? 1;

    this._updateCustomModeWarnings();
  }

  _loadCustomMode(mode) {
    this._customModeEditingId = mode.id;
    if (this._els.customModeSelect) this._els.customModeSelect.value = mode.id;
    this._populateCustomModeForm(mode);
    this._renderPoolList(this._els.customModeEnemyPool, mode.enemyPool || []);
    this._renderPoolList(this._els.customModeElitePool, mode.elitePool || []);
    this._renderPoolList(this._els.customModeBossPool, mode.bossPool || []);
    this._setCustomModeStatus(`Editing: ${mode.name}`, "info");
    this._updateCustomModeWarnings();
  }

  _loadTemplateMode() {
    const templateId = this._els.customModeTemplate?.value;
    if (!templateId) {
      this._setCustomModeStatus("Select a template to load.", "error");
      return;
    }
    const template = this._baseModeDefs.find((m) => m.id === templateId);
    if (!template) {
      this._setCustomModeStatus("Template not found.", "error");
      return;
    }
    if (!window.confirm(`Load template "${template.name}"? This will overwrite the form.`)) return;
    this._customModeEditingId = null;
    if (this._els.customModeSelect) this._els.customModeSelect.value = "";
    const data = this._mergeCustomDefaults(template);
    this._populateCustomModeForm(data);
    this._renderPoolList(this._els.customModeEnemyPool, data.enemyPool || []);
    this._renderPoolList(this._els.customModeElitePool, data.elitePool || []);
    this._renderPoolList(this._els.customModeBossPool, data.bossPool || []);
    if (this._els.customModeJson) this._els.customModeJson.value = "";
    this._setCustomModeStatus(`Loaded template: ${template.name}. Save to create a custom mode.`, "info");
    this._updateCustomModeWarnings();
  }

  _readCustomModeForm() {
    const name = (this._els.customModeName?.value || "").trim() || "Custom Mode";
    const description = (this._els.customModeDescription?.value || "").trim();
    const totalWavesRaw = this._readNumber(this._els.customModeTotalWaves, { integer: true, min: 0, fallback: 0 });
    const totalWaves = totalWavesRaw > 0 ? totalWavesRaw : null;
    const eliteEvery = this._readNumber(this._els.customModeEliteEvery, { integer: true, min: 0, fallback: DEFAULT_CUSTOM_MODE.eliteEvery });
    const bossEvery = this._readNumber(this._els.customModeBossEvery, { integer: true, min: 0, fallback: DEFAULT_CUSTOM_MODE.bossEvery });
    const finalBoss = this._els.customModeFinalBoss?.value || "";
    const recommendedMap = this._els.customModeRecommendedMap?.value || "";
    const requiredMap = this._els.customModeRequiredMap?.value || "";

    const start = {
      moneyAdd: this._readNumber(this._els.customModeStartMoneyAdd, { fallback: DEFAULT_CUSTOM_START.moneyAdd }),
      moneyMul: this._readNumber(this._els.customModeStartMoneyMul, { fallback: DEFAULT_CUSTOM_START.moneyMul }),
      livesAdd: this._readNumber(this._els.customModeStartLivesAdd, { fallback: DEFAULT_CUSTOM_START.livesAdd }),
      livesMul: this._readNumber(this._els.customModeStartLivesMul, { fallback: DEFAULT_CUSTOM_START.livesMul }),
    };

    const difficulty = {
      budgetMul: this._readNumber(this._els.customModeBudgetMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.budgetMul }),
      intervalMul: this._readNumber(this._els.customModeIntervalMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.intervalMul }),
      eliteMult: this._readNumber(this._els.customModeEliteMult, { fallback: DEFAULT_CUSTOM_DIFFICULTY.eliteMult }),
      bossMult: this._readNumber(this._els.customModeBossMult, { fallback: DEFAULT_CUSTOM_DIFFICULTY.bossMult }),
      hpMul: this._readNumber(this._els.customModeHpMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.hpMul }),
      hpScale: this._readNumber(this._els.customModeHpScale, { fallback: DEFAULT_CUSTOM_DIFFICULTY.hpScale }),
      hpLateStart: this._readNumber(this._els.customModeHpLateStart, { integer: true, min: 0, fallback: DEFAULT_CUSTOM_DIFFICULTY.hpLateStart }),
      hpLateScale: this._readNumber(this._els.customModeHpLateScale, { fallback: DEFAULT_CUSTOM_DIFFICULTY.hpLateScale }),
      seenShieldBase: this._readNumber(this._els.customModeSeenShieldBase, { integer: true, min: 0, fallback: DEFAULT_CUSTOM_DIFFICULTY.seenShieldBase }),
      seenShieldScale: this._readNumber(this._els.customModeSeenShieldScale, { fallback: DEFAULT_CUSTOM_DIFFICULTY.seenShieldScale }),
      seenShieldMul: this._readNumber(this._els.customModeSeenShieldMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.seenShieldMul }),
      finalBossMult: this._readNumber(this._els.customModeFinalBossMult, { fallback: DEFAULT_CUSTOM_DIFFICULTY.finalBossMult }),
      rewardBonusMul: this._readNumber(this._els.customModeRewardBonusMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.rewardBonusMul }),
      rewardBonusAdd: this._readNumber(this._els.customModeRewardBonusAdd, { fallback: DEFAULT_CUSTOM_DIFFICULTY.rewardBonusAdd }),
      earlyRewardWaves: this._readNumber(this._els.customModeEarlyRewardWaves, {
        integer: true,
        min: 0,
        fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyRewardWaves,
      }),
      earlyRewardAdd: this._readNumber(this._els.customModeEarlyRewardAdd, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyRewardAdd }),
      earlyWaves: this._readNumber(this._els.customModeEarlyWaves, { integer: true, min: 0, fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyWaves }),
      earlyBudgetMul: this._readNumber(this._els.customModeEarlyBudgetMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyBudgetMul }),
      earlyIntervalMul: this._readNumber(this._els.customModeEarlyIntervalMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyIntervalMul }),
      earlyHpMul: this._readNumber(this._els.customModeEarlyHpMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyHpMul }),
      earlyHpScaleMul: this._readNumber(this._els.customModeEarlyHpScaleMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyHpScaleMul }),
      earlyEliteMult: this._readNumber(this._els.customModeEarlyEliteMult, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlyEliteMult }),
      earlySeenShieldMul: this._readNumber(this._els.customModeEarlySeenShieldMul, { fallback: DEFAULT_CUSTOM_DIFFICULTY.earlySeenShieldMul }),
    };

    const enemyPool = this._readPoolList(this._els.customModeEnemyPool);
    const elitePool = this._readPoolList(this._els.customModeElitePool);
    const bossPool = this._readPoolList(this._els.customModeBossPool);

    const mode = {
      name,
      description,
      eliteEvery,
      bossEvery,
      start,
      difficulty,
    };
    if (totalWaves) mode.totalWaves = totalWaves;
    if (finalBoss) mode.finalBoss = finalBoss;
    if (recommendedMap) mode.recommendedMap = recommendedMap;
    if (requiredMap) mode.requiredMap = requiredMap;
    if (enemyPool.length) mode.enemyPool = enemyPool;
    if (elitePool.length) mode.elitePool = elitePool;
    if (bossPool.length) mode.bossPool = bossPool;

    return mode;
  }

  _exportCustomModeJson() {
    if (!this._els.customModeJson) return;
    const mode = this._readCustomModeForm();
    const exportMode = { ...mode };
    delete exportMode.id;
    delete exportMode.custom;
    this._els.customModeJson.value = JSON.stringify(exportMode, null, 2);
    this._setCustomModeStatus("Exported JSON below.", "info");
  }

  _importCustomModeJson() {
    if (!this._els.customModeJson) return;
    const raw = this._els.customModeJson.value;
    if (!raw.trim()) {
      this._setCustomModeStatus("Paste JSON to import.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const data = Array.isArray(parsed) ? parsed[0] : parsed;
      const normalized = this._normalizeCustomMode(data);
      if (!normalized) {
        this._setCustomModeStatus("JSON did not contain a valid mode.", "error");
        return;
      }
      normalized.id = null;
      normalized.custom = true;
      this._customModeEditingId = null;
      if (this._els.customModeSelect) this._els.customModeSelect.value = "";
      this._populateCustomModeForm(normalized);
      this._renderPoolList(this._els.customModeEnemyPool, normalized.enemyPool || []);
      this._renderPoolList(this._els.customModeElitePool, normalized.elitePool || []);
      this._renderPoolList(this._els.customModeBossPool, normalized.bossPool || []);
      this._setCustomModeStatus("Imported JSON. Save to keep this mode.", "info");
      this._updateCustomModeWarnings();
    } catch (err) {
      this._setCustomModeStatus("Invalid JSON format.", "error");
    }
  }

  _copyCustomModeJson() {
    if (!this._els.customModeJson) return;
    if (!this._els.customModeJson.value.trim()) this._exportCustomModeJson();
    const text = this._els.customModeJson.value;
    if (!text.trim()) {
      this._setCustomModeStatus("Nothing to copy.", "error");
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this._setCustomModeStatus("Copied JSON to clipboard.", "info"))
        .catch(() => this._setCustomModeStatus("Clipboard blocked; JSON is in the box.", "error"));
    } else {
      this._setCustomModeStatus("Clipboard unavailable; JSON is in the box.", "error");
    }
  }

  _saveCustomMode(asNew) {
    const mode = this._readCustomModeForm();
    if (!mode.name.trim()) {
      this._setCustomModeStatus("Name is required.", "error");
      return;
    }

    let id = this._customModeEditingId;
    if (asNew || !id) {
      id = this._makeCustomModeId(mode.name);
      while (this._customModes.some((m) => m.id === id)) {
        id = this._makeCustomModeId(`${mode.name}-${Math.random().toString(36).slice(2, 6)}`);
      }
    }

    const entry = { ...mode, id, custom: true };
    const idx = this._customModes.findIndex((m) => m.id === id);
    if (idx >= 0) this._customModes[idx] = entry;
    else this._customModes.push(entry);

    this._customModeEditingId = id;
    this._saveCustomModes();
    this._refreshModeDefs();
    this._buildModeSelect();
    this._renderCustomModeSelect();
    this._syncCustomModeCount();
    this._populateCustomMapSelects();
    if (this._els.customModeSelect) this._els.customModeSelect.value = id;
    if (this._els.modeSelect) this._els.modeSelect.value = id;
    this._applyMapModeLock("mode");
    this._syncMapPreview();
    this._syncModeDescription();

    this._setCustomModeStatus(asNew ? "Saved as a new custom mode." : "Custom mode saved.", "info");
  }

  _deleteCustomMode() {
    const id = this._customModeEditingId || this._els.customModeSelect?.value;
    if (!id) {
      this._setCustomModeStatus("Select a custom mode to delete.", "error");
      return;
    }
    const mode = this._customModes.find((m) => m.id === id);
    if (!mode) {
      this._setCustomModeStatus("Custom mode not found.", "error");
      return;
    }
    if (!window.confirm(`Delete custom mode "${mode.name}"?`)) return;
    this._customModes = this._customModes.filter((m) => m.id !== id);
    this._customModeEditingId = null;
    this._saveCustomModes();
    this._refreshModeDefs();
    this._buildModeSelect();
    this._renderCustomModeSelect();
    this._syncCustomModeCount();
    this._populateCustomMapSelects();
    this._resetCustomModeForm();
    this._applyMapModeLock("mode");
    this._syncMapPreview();
    this._syncModeDescription();
    this._setCustomModeStatus("Custom mode deleted.", "info");
  }

  _addPoolRow(container, entry = {}) {
    if (!container) return;
    const row = document.createElement("div");
    row.className = "pool-row";

    const enemySelect = document.createElement("select");
    for (const enemy of this._enemyList) {
      const opt = document.createElement("option");
      opt.value = enemy.id;
      opt.textContent = `${enemy.name} (${enemy.id})`;
      enemySelect.appendChild(opt);
    }
    enemySelect.value = entry.item || this._enemyList[0]?.id || "";

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.step = "0.1";
    weightInput.min = "0";
    weightInput.value = Number.isFinite(entry.w) ? entry.w : entry.weight ?? 1;

    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.step = "1";
    minInput.min = "1";
    minInput.placeholder = "-";
    minInput.value = Number.isFinite(entry.minWave) ? entry.minWave : "";

    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.step = "1";
    maxInput.min = "1";
    maxInput.placeholder = "-";
    maxInput.value = Number.isFinite(entry.maxWave) ? entry.maxWave : "";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ghost";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(enemySelect);
    row.appendChild(weightInput);
    row.appendChild(minInput);
    row.appendChild(maxInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  }

  _renderPoolList(container, entries) {
    if (!container) return;
    container.innerHTML = "";
    for (const entry of entries || []) this._addPoolRow(container, entry);
  }

  _readPoolList(container) {
    if (!container) return [];
    const rows = [...container.querySelectorAll(".pool-row")];
    const out = [];
    for (const row of rows) {
      const [enemySelect, weightInput, minInput, maxInput] = row.querySelectorAll("select, input");
      const item = enemySelect?.value;
      if (!item) continue;
      const weight = Math.max(0, this._coerceNumber(weightInput?.value, 1));
      const minWave = this._coerceInt(minInput?.value, null, 1);
      const maxWave = this._coerceInt(maxInput?.value, null, 1);
      const entry = { item, w: weight };
      if (minWave) entry.minWave = minWave;
      if (maxWave) entry.maxWave = maxWave;
      if (entry.minWave && entry.maxWave && entry.maxWave < entry.minWave) {
        const temp = entry.minWave;
        entry.minWave = entry.maxWave;
        entry.maxWave = temp;
      }
      out.push(entry);
    }
    return out;
  }

  _normalizeCustomMode(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return null;
    const mode = {
      id: typeof raw.id === "string" ? raw.id : null,
      name,
      description: typeof raw.description === "string" ? raw.description.trim() : "",
    };

    const totalWaves = this._coerceInt(raw.totalWaves, null, 0);
    if (totalWaves > 0) mode.totalWaves = totalWaves;
    const eliteEvery = this._coerceInt(raw.eliteEvery, null, 0);
    if (eliteEvery != null) mode.eliteEvery = eliteEvery;
    const bossEvery = this._coerceInt(raw.bossEvery, null, 0);
    if (bossEvery != null) mode.bossEvery = bossEvery;

    if (typeof raw.finalBoss === "string" && this._data.enemyDefs?.[raw.finalBoss]) mode.finalBoss = raw.finalBoss;
    if (typeof raw.recommendedMap === "string" && this._data.mapDefs?.some((m) => m.id === raw.recommendedMap)) {
      mode.recommendedMap = raw.recommendedMap;
    }
    if (typeof raw.requiredMap === "string" && this._data.mapDefs?.some((m) => m.id === raw.requiredMap)) {
      mode.requiredMap = raw.requiredMap;
    }

    const start = {};
    if (raw.start) {
      const moneyAdd = this._coerceNumber(raw.start.moneyAdd);
      const moneyMul = this._coerceNumber(raw.start.moneyMul);
      const livesAdd = this._coerceNumber(raw.start.livesAdd);
      const livesMul = this._coerceNumber(raw.start.livesMul);
      if (moneyAdd != null) start.moneyAdd = moneyAdd;
      if (moneyMul != null) start.moneyMul = moneyMul;
      if (livesAdd != null) start.livesAdd = livesAdd;
      if (livesMul != null) start.livesMul = livesMul;
    }
    if (Object.keys(start).length) mode.start = start;

    const difficulty = {};
    if (raw.difficulty) {
      const fields = [
        "budgetMul",
        "intervalMul",
        "eliteMult",
        "bossMult",
        "hpMul",
        "hpScale",
        "hpLateStart",
        "hpLateScale",
        "seenShieldBase",
        "seenShieldScale",
        "seenShieldMul",
        "rewardBonusMul",
        "rewardBonusAdd",
        "finalBossMult",
        "earlyWaves",
        "earlyBudgetMul",
        "earlyIntervalMul",
        "earlyHpMul",
        "earlyHpScaleMul",
        "earlyEliteMult",
        "earlySeenShieldMul",
        "earlyRewardWaves",
        "earlyRewardAdd",
      ];
      for (const field of fields) {
        const value = this._coerceNumber(raw.difficulty[field]);
        if (value != null) difficulty[field] = value;
      }
    }
    if (Object.keys(difficulty).length) mode.difficulty = difficulty;

    const pools = [
      ["enemyPool", raw.enemyPool],
      ["elitePool", raw.elitePool],
      ["bossPool", raw.bossPool],
    ];
    for (const [key, pool] of pools) {
      const list = this._normalizePool(pool);
      if (list.length) mode[key] = list;
    }

    return mode;
  }

  _normalizePool(pool) {
    if (!Array.isArray(pool)) return [];
    const out = [];
    for (const entry of pool) {
      if (!entry || typeof entry !== "object") continue;
      if (!entry.item || !this._data.enemyDefs?.[entry.item]) continue;
      const weight = Math.max(0, this._coerceNumber(entry.w ?? entry.weight, 1));
      const minWave = this._coerceInt(entry.minWave, null, 1);
      const maxWave = this._coerceInt(entry.maxWave, null, 1);
      const normalized = { item: entry.item, w: weight };
      if (minWave) normalized.minWave = minWave;
      if (maxWave) normalized.maxWave = maxWave;
      if (normalized.minWave && normalized.maxWave && normalized.maxWave < normalized.minWave) {
        const temp = normalized.minWave;
        normalized.minWave = normalized.maxWave;
        normalized.maxWave = temp;
      }
      out.push(normalized);
    }
    return out;
  }

  _makeCustomModeId(name) {
    const slug = String(name || "custom")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const stamp = Date.now().toString(36);
    return `custom_${slug || "mode"}_${stamp}`;
  }

  _readNumber(input, { integer = false, min = null, max = null, fallback = null } = {}) {
    if (!input) return fallback;
    const raw = input.value;
    if (raw === "" || raw == null) return fallback;
    const num = Number(raw);
    if (!Number.isFinite(num)) return fallback;
    let value = integer ? Math.round(num) : num;
    if (min != null) value = Math.max(min, value);
    if (max != null) value = Math.min(max, value);
    return value;
  }

  _coerceNumber(value, fallback = null) {
    if (value === "" || value == null) return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num;
  }

  _coerceInt(value, fallback = null, min = null, max = null) {
    if (value === "" || value == null) return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    let val = Math.round(num);
    if (min != null) val = Math.max(min, val);
    if (max != null) val = Math.min(max, val);
    return val;
  }

  _loadCustomMaps() {
    try {
      const raw = window.localStorage?.getItem(CUSTOM_MAP_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const out = [];
      const seen = new Set();
      for (const entry of parsed) {
        const map = this._normalizeCustomMap(entry);
        if (!map) continue;
        let id = map.id;
        if (!id || seen.has(id)) {
          id = this._makeCustomMapId(map.name || "custom_map");
          map.id = id;
        }
        map.custom = true;
        seen.add(id);
        out.push(map);
      }
      return out;
    } catch (err) {
      console.warn("Failed to load custom maps", err);
      return [];
    }
  }

  _saveCustomMaps() {
    try {
      window.localStorage?.setItem(CUSTOM_MAP_STORAGE_KEY, JSON.stringify(this._customMaps));
    } catch (err) {
      console.warn("Failed to save custom maps", err);
    }
    this._cloud?.scheduleSave?.("custom-maps");
  }

  _refreshMapDefs() {
    const includeCustom = this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS);
    this._data.mapDefs = includeCustom ? [...this._baseMapDefs, ...this._customMaps] : [...this._baseMapDefs];
  }

  _buildMapSelect() {
    if (!this._els.mapSelect) return;
    const current = this._els.mapSelect.value;
    this._els.mapSelect.innerHTML = "";

    const baseGroup = document.createElement("optgroup");
    baseGroup.label = "Built-in Maps";
    for (const m of this._baseMapDefs) {
      const opt = document.createElement("option");
      opt.value = m.id;
      const locked = this._shop ? !this._shop.isMapUnlocked(m.id) : false;
      const cost = this._shop?.getMapUnlockCost?.(m.id);
      opt.textContent = locked && cost ? `${m.name} — Locked (${cost}c)` : m.name;
      opt.disabled = locked;
      baseGroup.appendChild(opt);
    }
    this._els.mapSelect.appendChild(baseGroup);

    if (this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS) && this._customMaps.length) {
      const customGroup = document.createElement("optgroup");
      customGroup.label = "Custom Maps";
      for (const m of this._customMaps) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        customGroup.appendChild(opt);
      }
      this._els.mapSelect.appendChild(customGroup);
    }

    const currentOpt = current ? this._els.mapSelect.querySelector(`option[value="${current}"]`) : null;
    if (currentOpt && !currentOpt.disabled) {
      this._els.mapSelect.value = current;
      return;
    }
    const firstEnabled = [...this._els.mapSelect.options].find((opt) => !opt.disabled);
    if (firstEnabled) this._els.mapSelect.value = firstEnabled.value;
  }

  _bindCustomMaps() {
    if (!this._els.customMapOpen) return;

    this._renderCustomMapSelect();
    this._syncCustomMapCount();
    this._populateCustomMapSelects();
    this._resetCustomMapForm();
    this._updateCustomMapWarnings();
    this._syncCustomMapSnapUi();
    this._syncCustomMapBuildableUi();

    this._els.customMapOpen.addEventListener("click", () => this._showCustomMapScreen());
    this._els.customMapClose?.addEventListener("click", () => this._hideCustomMapScreen());

    this._els.customMapSelect?.addEventListener("change", () => {
      const id = this._els.customMapSelect.value;
      if (!id) {
        this._customMapEditingId = null;
        this._resetCustomMapForm();
        return;
      }
      const map = this._customMaps.find((m) => m.id === id);
      if (map) this._loadCustomMap(map);
    });

    this._els.customMapNew?.addEventListener("click", () => {
      this._customMapEditingId = null;
      if (this._els.customMapSelect) this._els.customMapSelect.value = "";
      this._resetCustomMapForm();
      this._setCustomMapStatus("New custom map ready.", "info");
    });

    this._els.customMapDelete?.addEventListener("click", () => this._deleteCustomMap());
    this._els.customMapSave?.addEventListener("click", () => this._saveCustomMap(false));
    this._els.customMapSaveCopy?.addEventListener("click", () => this._saveCustomMap(true));

    this._els.customMapLoadTemplate?.addEventListener("click", () => this._loadTemplateMap());
    this._els.customMapReset?.addEventListener("click", () => {
      this._customMapEditingId = null;
      if (this._els.customMapSelect) this._els.customMapSelect.value = "";
      this._resetCustomMapForm();
      this._setCustomMapStatus("Form reset.", "info");
    });

    this._els.customMapExport?.addEventListener("click", () => this._exportCustomMapJson());
    this._els.customMapImport?.addEventListener("click", () => this._importCustomMapJson());
    this._els.customMapCopy?.addEventListener("click", () => this._copyCustomMapJson());

    this._els.customMapPathAdd?.addEventListener("click", () => this._addCustomMapPath());
    this._els.customMapPathRemove?.addEventListener("click", () => this._removeCustomMapPath());
    this._els.customMapPathUndo?.addEventListener("click", () => this._undoCustomMapPoint());
    this._els.customMapPathClear?.addEventListener("click", () => this._clearCustomMapPath());

    this._els.customMapPathSelect?.addEventListener("change", () => {
      this._customMapSelectedPath = Number(this._els.customMapPathSelect.value) || 0;
      this._renderCustomMapCanvas();
      this._updateCustomMapPathInfo();
    });

    this._els.customMapDecorClear?.addEventListener("click", () => {
      if (!this._customMapDraft) return;
      this._customMapDraft.decor = [];
      this._renderCustomMapCanvas();
      this._updateCustomMapWarnings();
    });

    this._els.customMapToolPath?.addEventListener("click", () => this._setCustomMapTool(MAP_TOOL.PATH));
    this._els.customMapToolBase?.addEventListener("click", () => this._setCustomMapTool(MAP_TOOL.BASE));
    this._els.customMapToolDecor?.addEventListener("click", () => this._setCustomMapTool(MAP_TOOL.DECOR));
    this._els.customMapToolErase?.addEventListener("click", () => this._setCustomMapTool(MAP_TOOL.ERASE));
    this._els.customMapSnap?.addEventListener("click", () => this._toggleCustomMapSnap());
    this._els.customMapBuildable?.addEventListener("click", () => this._toggleCustomMapBuildable());
    this._els.customMapFix?.addEventListener("click", () => this._autoFixCustomMap());

    this._els.customMapCanvas?.addEventListener("pointerdown", (ev) => this._handleCustomMapPointerDown(ev));
    this._els.customMapCanvas?.addEventListener("pointermove", (ev) => this._handleCustomMapPointerMove(ev));
    this._els.customMapCanvas?.addEventListener("pointerup", (ev) => this._handleCustomMapPointerUp(ev));
    this._els.customMapCanvas?.addEventListener("pointercancel", (ev) => this._handleCustomMapPointerUp(ev));
    this._els.customMapCanvas?.addEventListener("mouseleave", () => {
      if (this._els.customMapCursor) this._els.customMapCursor.textContent = "";
    });

    const mapInputs = [
      this._els.customMapName,
      this._els.customMapCols,
      this._els.customMapRows,
      this._els.customMapTileSize,
      this._els.customMapStartMoney,
      this._els.customMapStartLives,
      this._els.customMapBaseX,
      this._els.customMapBaseY,
      this._els.customMapDecorType,
      this._els.customMapDecorSize,
    ];
    for (const input of mapInputs) {
      input?.addEventListener("input", () => this._updateCustomMapFromInputs());
      input?.addEventListener("change", () => this._updateCustomMapFromInputs());
    }
  }

  _renderCustomMapSelect() {
    if (!this._els.customMapSelect) return;
    this._els.customMapSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "New custom map";
    this._els.customMapSelect.appendChild(placeholder);
    for (const map of this._customMaps) {
      const opt = document.createElement("option");
      opt.value = map.id;
      opt.textContent = map.name;
      this._els.customMapSelect.appendChild(opt);
    }
  }

  _syncCustomMapCount() {
    if (!this._els.customMapCount) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS)) {
      this._els.customMapCount.textContent = "Locked in Shop";
      return;
    }
    const count = this._customMaps.length;
    this._els.customMapCount.textContent = count ? `${count} saved` : "No saved maps";
  }

  _populateCustomMapSelects() {
    if (this._els.customMapTemplate) {
      this._els.customMapTemplate.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a built-in template";
      this._els.customMapTemplate.appendChild(placeholder);
      for (const map of this._baseMapDefs) {
        const opt = document.createElement("option");
        opt.value = map.id;
        opt.textContent = map.name;
        this._els.customMapTemplate.appendChild(opt);
      }
    }

  }

  _showCustomMapScreen() {
    if (!this._els.customMapScreen) return;
    if (!this._isSetupVisible()) return;
    if (!this._isFeatureUnlocked(FEATURE_IDS.CUSTOM_MAPS)) {
      this._setShopStatus("Unlock Custom Maps to access this screen.", "error");
      this._showShopScreen();
      return;
    }
    this._els.customMapScreen.classList.remove("hidden");
    this._setCustomMapStatus("", "info");
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _hideCustomMapScreen() {
    if (!this._els.customMapScreen) return;
    this._els.customMapScreen.classList.add("hidden");
  }

  _setCustomMapStatus(message, type = "info") {
    if (!this._els.customMapStatus) return;
    this._els.customMapStatus.textContent = message || "";
    this._els.customMapStatus.classList.toggle("danger", type === "error");
  }

  _setCustomMapWarnings(warnings) {
    if (!this._els.customMapWarnings) return;
    if (!warnings || !warnings.length) {
      this._els.customMapWarnings.textContent = "";
      this._els.customMapWarnings.classList.add("hidden");
      return;
    }
    this._els.customMapWarnings.textContent = warnings.map((w) => `- ${w}`).join("\n");
    this._els.customMapWarnings.classList.remove("hidden");
  }

  _updateCustomMapWarnings() {
    const map = this._readCustomMapForm();
    const warnings = [];

    if (!map.paths || !map.paths.length) {
      warnings.push("At least one path is required.");
    } else {
      const shortPaths = map.paths.filter((p) => p.length < 2);
      if (shortPaths.length) warnings.push("Every path needs at least 2 points.");
    }

    if (map.paths?.length) {
      const baseMatches = map.paths.some((p) => {
        if (!p.length) return false;
        const last = p[p.length - 1];
        return last.x === map.base.x && last.y === map.base.y;
      });
      if (!baseMatches) warnings.push("The base should match the final point of at least one path.");
    }

    if (map.startingLives <= 0) warnings.push("Starting lives should be at least 1.");
    if (map.startingMoney < 0) warnings.push("Starting money should be 0 or higher.");
    if (map.cols < 8 || map.rows < 6) warnings.push("Grid size is very small; consider larger values.");
    if (map.tileSize !== 30) warnings.push("Tile size other than 30 may look misaligned with the default UI.");
    if (map.cols * map.tileSize > 960 || map.rows * map.tileSize > 540) {
      warnings.push("Map dimensions exceed the 960x540 playfield; content may be clipped.");
    }

    const lengthWarnings = [];
    (map.paths || []).forEach((path, idx) => {
      const len = computePathLength(path);
      if (len > 0 && len < 6) lengthWarnings.push(`Path ${idx + 1} is very short (${len.toFixed(1)} tiles).`);
    });
    warnings.push(...lengthWarnings);

    const overlapCount = countPathOverlaps(map.paths || []);
    if (overlapCount > 0) warnings.push(`Paths overlap on ${overlapCount} tile${overlapCount === 1 ? "" : "s"}.`);

    this._setCustomMapWarnings(warnings);
  }

  _resetCustomMapForm() {
    const defaults = this._mergeCustomMapDefaults(null);
    this._customMapDraft = defaults;
    this._customMapSelectedPath = 0;
    this._populateCustomMapForm(defaults);
    this._updateCustomMapPathSelect();
    this._setCustomMapTool(this._customMapTool);
    if (this._els.customMapJson) this._els.customMapJson.value = "";
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _mergeCustomMapDefaults(map) {
    const base = map && typeof map === "object" ? map : {};
    return {
      ...DEFAULT_CUSTOM_MAP,
      ...base,
      base: { ...DEFAULT_CUSTOM_MAP.base, ...(base.base || {}) },
      paths: Array.isArray(base.paths) ? base.paths.map((p) => (Array.isArray(p) ? p.map((pt) => ({ ...pt })) : [])) : [],
      decor: Array.isArray(base.decor) ? base.decor.map((d) => ({ ...d })) : [],
    };
  }

  _populateCustomMapForm(map) {
    const data = this._mergeCustomMapDefaults(map);
    if (this._els.customMapName) this._els.customMapName.value = data.name || "";
    if (this._els.customMapCols) this._els.customMapCols.value = data.cols ?? DEFAULT_CUSTOM_MAP.cols;
    if (this._els.customMapRows) this._els.customMapRows.value = data.rows ?? DEFAULT_CUSTOM_MAP.rows;
    if (this._els.customMapTileSize) this._els.customMapTileSize.value = data.tileSize ?? DEFAULT_CUSTOM_MAP.tileSize;
    if (this._els.customMapStartMoney) this._els.customMapStartMoney.value = data.startingMoney ?? DEFAULT_CUSTOM_MAP.startingMoney;
    if (this._els.customMapStartLives) this._els.customMapStartLives.value = data.startingLives ?? DEFAULT_CUSTOM_MAP.startingLives;
    if (this._els.customMapBaseX) this._els.customMapBaseX.value = data.base?.x ?? 0;
    if (this._els.customMapBaseY) this._els.customMapBaseY.value = data.base?.y ?? 0;
    if (this._els.customMapDecorSize && !this._els.customMapDecorSize.value) this._els.customMapDecorSize.value = 0.8;
  }

  _loadCustomMap(map) {
    this._customMapEditingId = map.id;
    if (this._els.customMapSelect) this._els.customMapSelect.value = map.id;
    const data = this._mergeCustomMapDefaults(map);
    this._customMapDraft = data;
    this._customMapSelectedPath = 0;
    this._populateCustomMapForm(data);
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._setCustomMapStatus(`Editing: ${map.name}`, "info");
    this._updateCustomMapWarnings();
  }

  _readCustomMapForm() {
    const draft = this._customMapDraft ? this._mergeCustomMapDefaults(this._customMapDraft) : this._mergeCustomMapDefaults(null);
    const cols = this._readNumber(this._els.customMapCols, { integer: true, min: 8, fallback: draft.cols });
    const rows = this._readNumber(this._els.customMapRows, { integer: true, min: 6, fallback: draft.rows });
    const tileSize = this._readNumber(this._els.customMapTileSize, { integer: true, min: 20, fallback: draft.tileSize });
    const startingMoney = this._readNumber(this._els.customMapStartMoney, { integer: true, min: 0, fallback: draft.startingMoney });
    const startingLives = this._readNumber(this._els.customMapStartLives, { integer: true, min: 1, fallback: draft.startingLives });
    const name = (this._els.customMapName?.value || "").trim() || "Custom Map";
    const baseX = this._readNumber(this._els.customMapBaseX, { integer: true, min: 0, fallback: draft.base?.x ?? 0 });
    const baseY = this._readNumber(this._els.customMapBaseY, { integer: true, min: 0, fallback: draft.base?.y ?? 0 });

    const map = {
      ...draft,
      name,
      cols,
      rows,
      tileSize,
      startingMoney,
      startingLives,
      base: { x: baseX, y: baseY },
    };

    this._clampCustomMap(map);
    return map;
  }

  _updateCustomMapFromInputs() {
    if (!this._customMapDraft) this._customMapDraft = this._mergeCustomMapDefaults(null);
    this._customMapDraft = this._readCustomMapForm();
    if (this._els.customMapBaseX) this._els.customMapBaseX.value = this._customMapDraft.base?.x ?? 0;
    if (this._els.customMapBaseY) this._els.customMapBaseY.value = this._customMapDraft.base?.y ?? 0;
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _clampCustomMap(map) {
    const cols = Math.max(1, map.cols || 1);
    const rows = Math.max(1, map.rows || 1);
    map.base.x = Math.max(0, Math.min(cols - 1, map.base?.x ?? 0));
    map.base.y = Math.max(0, Math.min(rows - 1, map.base?.y ?? 0));

    if (Array.isArray(map.paths)) {
      for (const path of map.paths) {
        if (!Array.isArray(path)) continue;
        for (const pt of path) {
          if (!pt) continue;
          pt.x = Math.max(0, Math.min(cols - 1, this._coerceInt(pt.x, 0)));
          pt.y = Math.max(0, Math.min(rows - 1, this._coerceInt(pt.y, 0)));
        }
      }
    }

    if (Array.isArray(map.decor)) {
      for (const d of map.decor) {
        if (!d) continue;
        d.x = Math.max(0, Math.min(cols - 1, this._coerceInt(d.x, 0)));
        d.y = Math.max(0, Math.min(rows - 1, this._coerceInt(d.y, 0)));
        d.size = this._coerceNumber(d.size, 0.8);
      }
    }
  }

  _setCustomMapTool(tool) {
    this._customMapTool = tool;
    const buttons = [
      [this._els.customMapToolPath, MAP_TOOL.PATH],
      [this._els.customMapToolBase, MAP_TOOL.BASE],
      [this._els.customMapToolDecor, MAP_TOOL.DECOR],
      [this._els.customMapToolErase, MAP_TOOL.ERASE],
    ];
    for (const [btn, id] of buttons) {
      if (!btn) continue;
      btn.classList.toggle("active", id === tool);
    }
  }

  _syncCustomMapSnapUi() {
    if (!this._els.customMapSnap) return;
    this._els.customMapSnap.textContent = `Snap Axis: ${this._customMapSnapAxis ? "On" : "Off"}`;
    this._els.customMapSnap.classList.toggle("active", this._customMapSnapAxis);
  }

  _toggleCustomMapSnap() {
    this._customMapSnapAxis = !this._customMapSnapAxis;
    this._syncCustomMapSnapUi();
  }

  _syncCustomMapBuildableUi() {
    if (!this._els.customMapBuildable) return;
    this._els.customMapBuildable.textContent = `Buildable Overlay: ${this._customMapShowBuildable ? "On" : "Off"}`;
    this._els.customMapBuildable.classList.toggle("active", this._customMapShowBuildable);
  }

  _toggleCustomMapBuildable() {
    this._customMapShowBuildable = !this._customMapShowBuildable;
    this._syncCustomMapBuildableUi();
    this._renderCustomMapCanvas();
  }

  _applyAxisSnap(tx, ty, pathIndex, pointIndex) {
    if (!this._customMapSnapAxis) return { x: tx, y: ty };
    const path = this._customMapDraft?.paths?.[pathIndex];
    if (!path) return { x: tx, y: ty };
    const prev = path[pointIndex - 1];
    const next = path[pointIndex + 1];
    let anchor = prev || next;
    if (prev && next) {
      const dPrev = Math.abs(tx - prev.x) + Math.abs(ty - prev.y);
      const dNext = Math.abs(tx - next.x) + Math.abs(ty - next.y);
      anchor = dPrev <= dNext ? prev : next;
    }
    if (!anchor) return { x: tx, y: ty };
    if (Math.abs(tx - anchor.x) < Math.abs(ty - anchor.y)) return { x: anchor.x, y: ty };
    return { x: tx, y: anchor.y };
  }

  _autoFixCustomMap() {
    const map = this._readCustomMapForm();

    if (!map.paths || !map.paths.length) {
      const startX = map.base.x === 0 ? Math.min(map.cols - 1, map.base.x + 1) : 0;
      map.paths = [[{ x: startX, y: map.base.y }, { x: map.base.x, y: map.base.y }]];
    }

    map.paths = (map.paths || []).map((path) => {
      const cleaned = [];
      for (const pt of path) {
        const last = cleaned[cleaned.length - 1];
        if (!last || last.x !== pt.x || last.y !== pt.y) cleaned.push({ x: pt.x, y: pt.y });
      }
      return cleaned;
    });

    map.paths = map.paths.filter((p) => p.length > 0);
    for (const path of map.paths) {
      if (path.length === 1) {
        const pt = path[0];
        if (pt.x === map.base.x && pt.y === map.base.y) {
          const nx = Math.max(0, Math.min(map.cols - 1, pt.x - 1));
          if (nx !== pt.x) path.unshift({ x: nx, y: pt.y });
          else path.unshift({ x: Math.min(map.cols - 1, pt.x + 1), y: pt.y });
        } else {
          path.push({ x: map.base.x, y: map.base.y });
        }
      }
    }

    if (!map.paths.length) {
      const startX = map.base.x === 0 ? Math.min(map.cols - 1, map.base.x + 1) : 0;
      map.paths = [[{ x: startX, y: map.base.y }, { x: map.base.x, y: map.base.y }]];
    }

    const ensureBasePath = map.paths[0];
    const last = ensureBasePath[ensureBasePath.length - 1];
    if (!last || last.x !== map.base.x || last.y !== map.base.y) {
      ensureBasePath.push({ x: map.base.x, y: map.base.y });
    }

    map.startingLives = Math.max(1, map.startingLives ?? 1);
    map.startingMoney = Math.max(0, map.startingMoney ?? 0);
    map.tileSize = Math.max(20, map.tileSize ?? DEFAULT_CUSTOM_MAP.tileSize);
    map.cols = Math.max(8, map.cols ?? DEFAULT_CUSTOM_MAP.cols);
    map.rows = Math.max(6, map.rows ?? DEFAULT_CUSTOM_MAP.rows);

    this._clampCustomMap(map);
    this._customMapDraft = this._mergeCustomMapDefaults(map);
    this._customMapSelectedPath = Math.min(this._customMapSelectedPath, (this._customMapDraft.paths?.length || 1) - 1);
    this._populateCustomMapForm(this._customMapDraft);
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
    this._setCustomMapStatus("Auto-fix applied.", "info");
  }

  _updateCustomMapPathSelect() {
    if (!this._els.customMapPathSelect) return;
    const draft = this._customMapDraft || this._mergeCustomMapDefaults(null);
    const paths = draft.paths || [];
    this._els.customMapPathSelect.innerHTML = "";
    paths.forEach((_, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `Path ${idx + 1}`;
      this._els.customMapPathSelect.appendChild(opt);
    });
    if (!paths.length) {
      const opt = document.createElement("option");
      opt.value = "0";
      opt.textContent = "No paths";
      this._els.customMapPathSelect.appendChild(opt);
      this._customMapSelectedPath = 0;
    } else if (this._customMapSelectedPath >= paths.length) {
      this._customMapSelectedPath = paths.length - 1;
    }
    this._els.customMapPathSelect.value = String(this._customMapSelectedPath);
    this._updateCustomMapPathInfo();
  }

  _updateCustomMapPathInfo() {
    if (!this._els.customMapPathInfo || !this._customMapDraft) return;
    const path = this._customMapDraft.paths?.[this._customMapSelectedPath] || [];
    if (!path.length) {
      this._els.customMapPathInfo.textContent = "No points yet.";
      return;
    }
    const length = computePathLength(path);
    const warn = length < 6 ? " • Short path" : "";
    this._els.customMapPathInfo.textContent = `${path.length} points • length ${length.toFixed(1)} tiles${warn}`;
  }

  _addCustomMapPath() {
    if (!this._customMapDraft) this._customMapDraft = this._mergeCustomMapDefaults(null);
    if (!Array.isArray(this._customMapDraft.paths)) this._customMapDraft.paths = [];
    this._customMapDraft.paths.push([]);
    this._customMapSelectedPath = this._customMapDraft.paths.length - 1;
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _removeCustomMapPath() {
    if (!this._customMapDraft?.paths?.length) return;
    if (!window.confirm("Remove the selected path?")) return;
    this._customMapDraft.paths.splice(this._customMapSelectedPath, 1);
    if (this._customMapSelectedPath >= this._customMapDraft.paths.length) {
      this._customMapSelectedPath = Math.max(0, this._customMapDraft.paths.length - 1);
    }
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _undoCustomMapPoint() {
    const path = this._customMapDraft?.paths?.[this._customMapSelectedPath];
    if (!path || !path.length) return;
    path.pop();
    this._updateCustomMapPathInfo();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _clearCustomMapPath() {
    const path = this._customMapDraft?.paths?.[this._customMapSelectedPath];
    if (!path) return;
    path.length = 0;
    this._updateCustomMapPathInfo();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _handleCustomMapPointerDown(ev) {
    if (!this._els.customMapCanvas || !this._customMapDraft) return;
    const tile = this._getTileFromCustomMapCanvas(ev, false);
    if (!tile) return;
    const { tx, ty } = tile;

    const hit = this._hitTestCustomMap(tx, ty);

    if (this._customMapTool === MAP_TOOL.ERASE) {
      this._eraseCustomMapAt(tx, ty);
      this._renderCustomMapCanvas();
      this._updateCustomMapWarnings();
      return;
    }

    if (this._customMapTool === MAP_TOOL.PATH && hit?.type === "point") {
      this._startCustomMapDrag(ev, { ...hit, type: "point" });
      return;
    }
    if (this._customMapTool === MAP_TOOL.DECOR && hit?.type === "decor") {
      this._startCustomMapDrag(ev, { ...hit, type: "decor" });
      return;
    }
    if (this._customMapTool === MAP_TOOL.BASE && hit?.type === "base") {
      this._startCustomMapDrag(ev, { ...hit, type: "base" });
      return;
    }

    if (this._customMapTool === MAP_TOOL.PATH) {
      if (!Array.isArray(this._customMapDraft.paths)) this._customMapDraft.paths = [];
      if (!this._customMapDraft.paths.length) {
        this._customMapDraft.paths.push([]);
        this._customMapSelectedPath = 0;
        this._updateCustomMapPathSelect();
      }
      const path = this._customMapDraft.paths[this._customMapSelectedPath] || [];
      let next = { x: tx, y: ty };
      if (this._customMapSnapAxis) next = this._applyAxisSnap(tx, ty, this._customMapSelectedPath, path.length);

      let inserted = false;
      if (path.length >= 2) {
        const seg = findClosestSegment(path, next.x, next.y);
        if (seg && seg.dist2 <= 0.35 * 0.35) {
          const a = path[seg.index];
          const b = path[seg.index + 1];
          if (this._customMapSnapAxis) {
            if (a.x === b.x) next.x = a.x;
            if (a.y === b.y) next.y = a.y;
          }
          path.splice(seg.index + 1, 0, next);
          inserted = true;
        }
      }

      if (!inserted) {
        const last = path[path.length - 1];
        if (!last || last.x !== next.x || last.y !== next.y) path.push(next);
      }
      this._customMapDraft.paths[this._customMapSelectedPath] = path;
      this._updateCustomMapPathInfo();
    } else if (this._customMapTool === MAP_TOOL.BASE) {
      this._customMapDraft.base = { x: tx, y: ty };
      if (this._els.customMapBaseX) this._els.customMapBaseX.value = tx;
      if (this._els.customMapBaseY) this._els.customMapBaseY.value = ty;
    } else if (this._customMapTool === MAP_TOOL.DECOR) {
      const type = this._els.customMapDecorType?.value || "tree";
      const size = this._readNumber(this._els.customMapDecorSize, { fallback: 0.8 });
      if (!Array.isArray(this._customMapDraft.decor)) this._customMapDraft.decor = [];
      this._customMapDraft.decor.push({ type, x: tx, y: ty, size });
    }

    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _handleCustomMapPointerMove(ev) {
    if (!this._els.customMapCanvas || !this._els.customMapCursor) return;
    if (this._customMapDrag && this._customMapDrag.pointerId === ev.pointerId) {
      this._updateCustomMapDrag(ev);
      return;
    }
    const tile = this._getTileFromCustomMapCanvas(ev, false);
    if (!tile) {
      this._els.customMapCursor.textContent = "";
      return;
    }
    this._els.customMapCursor.textContent = `Cursor: ${tile.tx}, ${tile.ty}`;
  }

  _handleCustomMapPointerUp(ev) {
    if (!this._customMapDrag || this._customMapDrag.pointerId !== ev.pointerId) return;
    this._endCustomMapDrag(ev);
  }

  _hitTestCustomMap(tx, ty) {
    const map = this._customMapDraft;
    if (!map) return null;
    if (map.base?.x === tx && map.base?.y === ty) return { type: "base" };

    const paths = map.paths || [];
    const selectedPath = paths[this._customMapSelectedPath];
    if (selectedPath) {
      const idx = selectedPath.findIndex((p) => p.x === tx && p.y === ty);
      if (idx >= 0) return { type: "point", pathIndex: this._customMapSelectedPath, pointIndex: idx };
    }

    for (let i = 0; i < paths.length; i++) {
      if (i === this._customMapSelectedPath) continue;
      const path = paths[i];
      if (!path) continue;
      const idx = path.findIndex((p) => p.x === tx && p.y === ty);
      if (idx >= 0) return { type: "point", pathIndex: i, pointIndex: idx };
    }

    if (Array.isArray(map.decor)) {
      const idx = map.decor.findIndex((d) => d.x === tx && d.y === ty);
      if (idx >= 0) return { type: "decor", decorIndex: idx };
    }

    return null;
  }

  _eraseCustomMapAt(tx, ty) {
    const path = this._customMapDraft?.paths?.[this._customMapSelectedPath];
    if (path?.length) {
      const idx = path.findIndex((p) => p.x === tx && p.y === ty);
      if (idx >= 0) path.splice(idx, 1);
    }
    if (Array.isArray(this._customMapDraft?.decor)) {
      const idx = this._customMapDraft.decor.findIndex((d) => d.x === tx && d.y === ty);
      if (idx >= 0) this._customMapDraft.decor.splice(idx, 1);
    }
    this._updateCustomMapPathInfo();
  }

  _startCustomMapDrag(ev, hit) {
    if (!this._els.customMapCanvas) return;
    if (hit.type === "point" && hit.pathIndex !== this._customMapSelectedPath) {
      this._customMapSelectedPath = hit.pathIndex;
      if (this._els.customMapPathSelect) this._els.customMapPathSelect.value = String(hit.pathIndex);
      this._updateCustomMapPathInfo();
    }
    this._customMapDrag = { ...hit, pointerId: ev.pointerId, originalIndex: hit.pointIndex };
    this._els.customMapCanvas.setPointerCapture?.(ev.pointerId);
    this._updateCustomMapDrag(ev);
  }

  _updateCustomMapDrag(ev) {
    if (!this._customMapDrag || !this._customMapDraft) return;
    const tile = this._getTileFromCustomMapCanvas(ev, true);
    if (!tile) return;
    const cols = this._customMapDraft.cols || DEFAULT_CUSTOM_MAP.cols;
    const rows = this._customMapDraft.rows || DEFAULT_CUSTOM_MAP.rows;
    let tx = Math.max(0, Math.min(cols - 1, tile.tx));
    let ty = Math.max(0, Math.min(rows - 1, tile.ty));

    if (this._customMapDrag.type === "point") {
      const path = this._customMapDraft.paths?.[this._customMapDrag.pathIndex];
      if (!path) return;
      let next = { x: tx, y: ty };
      next = this._applyAxisSnap(next.x, next.y, this._customMapDrag.pathIndex, this._customMapDrag.pointIndex);
      path[this._customMapDrag.pointIndex] = next;
      this._updateCustomMapPathInfo();
    } else if (this._customMapDrag.type === "decor") {
      const decor = this._customMapDraft.decor?.[this._customMapDrag.decorIndex];
      if (decor) {
        decor.x = tx;
        decor.y = ty;
      }
    } else if (this._customMapDrag.type === "base") {
      this._customMapDraft.base = { x: tx, y: ty };
      if (this._els.customMapBaseX) this._els.customMapBaseX.value = tx;
      if (this._els.customMapBaseY) this._els.customMapBaseY.value = ty;
    }

    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _endCustomMapDrag(ev) {
    if (this._els.customMapCanvas) {
      this._els.customMapCanvas.releasePointerCapture?.(ev.pointerId);
    }
    if (this._customMapDrag?.type === "point") {
      this._maybeReorderDraggedPoint(this._customMapDrag);
    }
    this._customMapDrag = null;
  }

  _maybeReorderDraggedPoint(drag) {
    const path = this._customMapDraft?.paths?.[drag.pathIndex];
    if (!path || path.length < 3) return;
    const point = path[drag.pointIndex];
    if (!point) return;
    const seg = findClosestSegment(path, point.x, point.y);
    if (!seg) return;
    const adjacent = seg.index === drag.pointIndex || seg.index === drag.pointIndex - 1;
    if (adjacent) return;
    if (seg.dist2 > 0.6 * 0.6) return;

    path.splice(drag.pointIndex, 1);
    let insertIndex = seg.index + 1;
    if (insertIndex > path.length) insertIndex = path.length;
    path.splice(insertIndex, 0, point);
    this._customMapSelectedPath = drag.pathIndex;
    if (this._els.customMapPathSelect) this._els.customMapPathSelect.value = String(drag.pathIndex);
    this._updateCustomMapPathInfo();
    this._renderCustomMapCanvas();
    this._updateCustomMapWarnings();
  }

  _getTileFromCustomMapCanvas(ev, allowOutside = false) {
    const canvas = this._els.customMapCanvas;
    if (!canvas || !this._customMapDraft) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (ev.clientX - rect.left) * scaleX;
    const py = (ev.clientY - rect.top) * scaleY;
    const { scale, offsetX, offsetY } = this._customMapCanvasState;
    const mapX = (px - offsetX) / scale;
    const mapY = (py - offsetY) / scale;
    const tileSize = this._customMapDraft.tileSize || DEFAULT_CUSTOM_MAP.tileSize;
    const tx = Math.floor(mapX / tileSize);
    const ty = Math.floor(mapY / tileSize);
    if (!allowOutside) {
      if (tx < 0 || ty < 0 || tx >= this._customMapDraft.cols || ty >= this._customMapDraft.rows) return null;
    }
    return { tx, ty };
  }

  _renderCustomMapCanvas() {
    const canvas = this._els.customMapCanvas;
    if (!canvas || !this._customMapDraft) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const map = this._customMapDraft;
    const cols = map.cols || DEFAULT_CUSTOM_MAP.cols;
    const rows = map.rows || DEFAULT_CUSTOM_MAP.rows;
    const tileSize = map.tileSize || DEFAULT_CUSTOM_MAP.tileSize;
    const mapW = cols * tileSize;
    const mapH = rows * tileSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1022";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / mapW, canvas.height / mapH) * 0.92;
    const offsetX = (canvas.width - mapW * scale) / 2;
    const offsetY = (canvas.height - mapH * scale) / 2;
    this._customMapCanvasState = { scale, offsetX, offsetY, tileSize };

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(231,236,255,0.12)";
    ctx.lineWidth = 1 / scale;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize + 0.5, 0);
      ctx.lineTo(x * tileSize + 0.5, rows * tileSize);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize + 0.5);
      ctx.lineTo(cols * tileSize, y * tileSize + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (this._customMapShowBuildable) {
      const inst = new MapInstance({
        id: map.id || "custom",
        name: map.name || "Custom",
        tileSize,
        cols,
        rows,
        base: map.base,
        paths: map.paths || [],
        decor: map.decor || [],
      });
      ctx.fillStyle = "rgba(52,211,153,0.08)";
      for (let ty = 0; ty < rows; ty++) {
        for (let tx = 0; tx < cols; tx++) {
          if (inst.isBuildableTile(tx, ty)) {
            ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
          }
        }
      }
    }

    const palette = ["#6aa4ff", "#34d399", "#f59e0b", "#a78bfa", "#fb7185"];
    (map.paths || []).forEach((path, idx) => {
      if (!path?.length) return;
      ctx.strokeStyle = palette[idx % palette.length];
      ctx.lineWidth = idx === this._customMapSelectedPath ? 4 / scale : 2.5 / scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((path[0].x + 0.5) * tileSize, (path[0].y + 0.5) * tileSize);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo((path[i].x + 0.5) * tileSize, (path[i].y + 0.5) * tileSize);
      }
      ctx.stroke();

      ctx.fillStyle = palette[idx % palette.length];
      for (const pt of path) {
        ctx.beginPath();
        ctx.arc((pt.x + 0.5) * tileSize, (pt.y + 0.5) * tileSize, 3.6 / scale, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (map.decor?.length) {
      for (const d of map.decor) {
        const color =
          d.type === "tree"
            ? "rgba(52,211,153,0.85)"
            : d.type === "crystal"
              ? "rgba(125,211,252,0.9)"
              : d.type === "ruin"
                ? "rgba(167,139,250,0.75)"
                : "rgba(148,163,184,0.8)";
        const size = (d.size ?? 1) * tileSize * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc((d.x + 0.5) * tileSize, (d.y + 0.5) * tileSize, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (map.base) {
      ctx.fillStyle = "rgba(251,113,133,0.85)";
      ctx.beginPath();
      ctx.arc((map.base.x + 0.5) * tileSize, (map.base.y + 0.5) * tileSize, 6 / scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _saveCustomMap(asNew) {
    const map = this._readCustomMapForm();
    if (!map.name.trim()) {
      this._setCustomMapStatus("Name is required.", "error");
      return;
    }

    this._sanitizeCustomMap(map);
    const validPaths = (map.paths || []).filter((p) => p.length >= 2);
    if (!validPaths.length) {
      this._setCustomMapStatus("Add at least one path with 2+ points.", "error");
      return;
    }
    map.paths = validPaths;

    let id = this._customMapEditingId;
    if (asNew || !id) {
      id = this._makeCustomMapId(map.name);
      while (this._customMaps.some((m) => m.id === id)) {
        id = this._makeCustomMapId(`${map.name}-${Math.random().toString(36).slice(2, 6)}`);
      }
    }

    const entry = { ...map, id, custom: true };
    const idx = this._customMaps.findIndex((m) => m.id === id);
    if (idx >= 0) this._customMaps[idx] = entry;
    else this._customMaps.push(entry);

    this._customMapEditingId = id;
    this._customMapDraft = this._mergeCustomMapDefaults(entry);
    this._customMapSelectedPath = 0;
    this._populateCustomMapForm(this._customMapDraft);
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    this._saveCustomMaps();
    this._refreshMapDefs();
    this._buildMapSelect();
    this._renderCustomMapSelect();
    this._syncCustomMapCount();
    this._populateCustomModeSelects();
    if (this._els.customMapSelect) this._els.customMapSelect.value = id;
    if (this._els.mapSelect) this._els.mapSelect.value = id;
    this._applyMapModeLock("map");
    this._syncMapPreview();
    this._syncModeDescription();
    this._updateCustomMapWarnings();

    this._setCustomMapStatus(asNew ? "Saved as a new custom map." : "Custom map saved.", "info");
  }

  _deleteCustomMap() {
    const id = this._customMapEditingId || this._els.customMapSelect?.value;
    if (!id) {
      this._setCustomMapStatus("Select a custom map to delete.", "error");
      return;
    }
    const map = this._customMaps.find((m) => m.id === id);
    if (!map) {
      this._setCustomMapStatus("Custom map not found.", "error");
      return;
    }
    if (!window.confirm(`Delete custom map "${map.name}"?`)) return;
    this._customMaps = this._customMaps.filter((m) => m.id !== id);
    this._customMapEditingId = null;
    this._saveCustomMaps();
    this._refreshMapDefs();
    this._buildMapSelect();
    this._renderCustomMapSelect();
    this._syncCustomMapCount();
    this._populateCustomModeSelects();
    this._resetCustomMapForm();
    this._applyMapModeLock("map");
    this._syncMapPreview();
    this._syncModeDescription();
    this._setCustomMapStatus("Custom map deleted.", "info");
  }

  _loadTemplateMap() {
    const templateId = this._els.customMapTemplate?.value;
    if (!templateId) {
      this._setCustomMapStatus("Select a template to load.", "error");
      return;
    }
    const template = this._baseMapDefs.find((m) => m.id === templateId);
    if (!template) {
      this._setCustomMapStatus("Template not found.", "error");
      return;
    }
    if (!window.confirm(`Load template "${template.name}"? This will overwrite the form.`)) return;
    this._customMapEditingId = null;
    if (this._els.customMapSelect) this._els.customMapSelect.value = "";
    const data = this._mergeCustomMapDefaults(template);
    this._customMapDraft = data;
    this._customMapSelectedPath = 0;
    this._populateCustomMapForm(data);
    this._updateCustomMapPathSelect();
    this._renderCustomMapCanvas();
    if (this._els.customMapJson) this._els.customMapJson.value = "";
    this._setCustomMapStatus(`Loaded template: ${template.name}. Save to create a custom map.`, "info");
    this._updateCustomMapWarnings();
  }

  _exportCustomMapJson() {
    if (!this._els.customMapJson) return;
    const map = this._readCustomMapForm();
    const exportMap = { ...map };
    delete exportMap.id;
    delete exportMap.custom;
    this._els.customMapJson.value = JSON.stringify(exportMap, null, 2);
    this._setCustomMapStatus("Exported JSON below.", "info");
  }

  _importCustomMapJson() {
    if (!this._els.customMapJson) return;
    const raw = this._els.customMapJson.value;
    if (!raw.trim()) {
      this._setCustomMapStatus("Paste JSON to import.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const data = Array.isArray(parsed) ? parsed[0] : parsed;
      const normalized = this._normalizeCustomMap(data);
      if (!normalized) {
        this._setCustomMapStatus("JSON did not contain a valid map.", "error");
        return;
      }
      normalized.id = null;
      normalized.custom = true;
      this._customMapEditingId = null;
      if (this._els.customMapSelect) this._els.customMapSelect.value = "";
      this._customMapDraft = this._mergeCustomMapDefaults(normalized);
      this._populateCustomMapForm(this._customMapDraft);
      this._updateCustomMapPathSelect();
      this._renderCustomMapCanvas();
      this._setCustomMapStatus("Imported JSON. Save to keep this map.", "info");
      this._updateCustomMapWarnings();
    } catch (err) {
      this._setCustomMapStatus("Invalid JSON format.", "error");
    }
  }

  _copyCustomMapJson() {
    if (!this._els.customMapJson) return;
    if (!this._els.customMapJson.value.trim()) this._exportCustomMapJson();
    const text = this._els.customMapJson.value;
    if (!text.trim()) {
      this._setCustomMapStatus("Nothing to copy.", "error");
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this._setCustomMapStatus("Copied JSON to clipboard.", "info"))
        .catch(() => this._setCustomMapStatus("Clipboard blocked; JSON is in the box.", "error"));
    } else {
      this._setCustomMapStatus("Clipboard unavailable; JSON is in the box.", "error");
    }
  }

  _makeCustomMapId(name) {
    const slug = String(name || "custom_map")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const stamp = Date.now().toString(36);
    return `custom_map_${slug || "map"}_${stamp}`;
  }

  _normalizeCustomMap(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return null;

    const cols = this._coerceInt(raw.cols, DEFAULT_CUSTOM_MAP.cols, 8);
    const rows = this._coerceInt(raw.rows, DEFAULT_CUSTOM_MAP.rows, 6);
    const tileSize = this._coerceInt(raw.tileSize, DEFAULT_CUSTOM_MAP.tileSize, 20);
    const baseX = this._coerceInt(raw.base?.x, DEFAULT_CUSTOM_MAP.base.x, 0, cols - 1);
    const baseY = this._coerceInt(raw.base?.y, DEFAULT_CUSTOM_MAP.base.y, 0, rows - 1);
    const startingMoney = this._coerceInt(raw.startingMoney, DEFAULT_CUSTOM_MAP.startingMoney, 0);
    const startingLives = this._coerceInt(raw.startingLives, DEFAULT_CUSTOM_MAP.startingLives, 1);

    const map = {
      id: typeof raw.id === "string" ? raw.id : null,
      name,
      tileSize,
      cols,
      rows,
      startingMoney,
      startingLives,
      base: { x: baseX, y: baseY },
    };

    map.paths = this._normalizeMapPaths(raw.paths, cols, rows);
    map.decor = this._normalizeMapDecor(raw.decor, cols, rows);

    if (!map.paths.length) {
      map.paths = [[{ x: 0, y: baseY }, { x: baseX, y: baseY }]];
    }

    return map;
  }

  _normalizeMapPaths(paths, cols, rows) {
    if (!Array.isArray(paths)) return [];
    const out = [];
    for (const path of paths) {
      if (!Array.isArray(path)) continue;
      const list = [];
      for (const pt of path) {
        if (!pt) continue;
        const x = this._coerceInt(pt.x, null, 0, cols - 1);
        const y = this._coerceInt(pt.y, null, 0, rows - 1);
        if (x == null || y == null) continue;
        list.push({ x, y });
      }
      if (list.length >= 2) out.push(list);
    }
    return out;
  }

  _normalizeMapDecor(decor, cols, rows) {
    if (!Array.isArray(decor)) return [];
    const out = [];
    for (const d of decor) {
      if (!d || typeof d !== "object") continue;
      const x = this._coerceInt(d.x, null, 0, cols - 1);
      const y = this._coerceInt(d.y, null, 0, rows - 1);
      if (x == null || y == null) continue;
      const type = ["tree", "rock", "ruin", "crystal"].includes(d.type) ? d.type : "rock";
      const size = this._coerceNumber(d.size, 0.8);
      out.push({ type, x, y, size });
    }
    return out;
  }

  _sanitizeCustomMap(map) {
    if (!map || !Array.isArray(map.paths)) return;
    map.paths = map.paths
      .map((path) => {
        if (!Array.isArray(path)) return [];
        const cleaned = [];
        for (const pt of path) {
          if (!pt) continue;
          const last = cleaned[cleaned.length - 1];
          if (!last || last.x !== pt.x || last.y !== pt.y) cleaned.push({ x: pt.x, y: pt.y });
        }
        return cleaned;
      })
      .filter((path) => path.length > 0);
  }

  _syncModeDescription() {
    const modeId = this._els.modeSelect?.value;
    const mode = (this._data.modeDefs || []).find((m) => m.id === modeId);
    const mapId = this._els.mapSelect?.value;
    const map = (this._data.mapDefs || []).find((m) => m.id === mapId);
    if (this._els.modeDesc) {
      let desc = mode?.description || "";
      if (mode?.custom) desc = desc ? `${desc} (Custom Mode)` : "Custom Mode";
      if (mode?.requiredMap) {
        const mapName = this._mapName(mode.requiredMap);
        const mapUnlocked = this._shop ? this._shop.isMapUnlocked(mode.requiredMap) : true;
        desc = desc
          ? `${desc} (${mapUnlocked ? `Bundled with ${mapName}` : `Unlock ${mapName} to access`})`
          : mapUnlocked
            ? `Bundled with ${mapName}`
            : `Unlock ${mapName} to access`;
      }
      if (!mode?.requiredMap && mode?.recommendedMap) {
        desc = desc
          ? `${desc} (Recommended map: ${this._mapName(mode.recommendedMap)})`
          : `Recommended map: ${this._mapName(mode.recommendedMap)}`;
      }
      this._els.modeDesc.textContent = desc;
    }

    if (this._els.startBtn) {
      this._els.startBtn.classList.toggle("cataclysm", modeId === "cataclysm");
    }

    if (this._els.modeBadge) {
      if (mode?.requiredMap) {
        const mapName = this._mapName(mode.requiredMap);
        const modeName = mode?.name || "Locked";
        const mapUnlocked = this._shop ? this._shop.isMapUnlocked(mode.requiredMap) : true;
        if (!mapUnlocked) {
          this._els.modeBadge.textContent = `Bundle with ${mapName} to unlock ${modeName}`;
          this._els.modeBadge.classList.remove("hidden");
        } else {
          this._els.modeBadge.classList.add("hidden");
        }
      } else {
        this._els.modeBadge.classList.add("hidden");
      }
    }
  }

  _syncRunIntel() {
    const modeId = this._els.modeSelect?.value;
    const mode = (this._data.modeDefs || []).find((m) => m.id === modeId);
    const hasMode = Boolean(mode);
    const start = hasMode ? { ...DEFAULT_CUSTOM_START, ...(mode.start || {}) } : null;
    const difficulty = hasMode ? { ...DEFAULT_CUSTOM_DIFFICULTY, ...(mode.difficulty || {}) } : null;
    const formatSigned = (value, digits = 0) => {
      if (!Number.isFinite(value)) return "-";
      const rounded =
        digits > 0
          ? value.toFixed(digits)
          : Math.round(value) === value
            ? String(value)
            : value.toFixed(2);
      return value >= 0 ? `+${rounded}` : `${rounded}`;
    };
    const formatMult = (value) => (Number.isFinite(value) ? `x${value.toFixed(2)}` : "-");
    if (this._els.runModeName) this._els.runModeName.textContent = mode?.name || "-";

    if (this._els.runWaves) {
      this._els.runWaves.textContent = mode?.totalWaves ? String(mode.totalWaves) : "Endless";
    }
    if (this._els.runElites) {
      const eliteEvery = mode?.eliteEvery || 0;
      this._els.runElites.textContent = eliteEvery ? `Every ${eliteEvery}w` : "-";
    }
    if (this._els.runBosses) {
      const bossEvery = mode?.bossEvery || 0;
      let label = "-";
      if (mode?.totalWaves && mode?.finalBoss) label = "Final";
      if (bossEvery) label = label === "-" ? `Every ${bossEvery}w` : `${label} + ${bossEvery}w`;
      this._els.runBosses.textContent = label;
    }

    if (this._els.runStartCash) {
      this._els.runStartCash.textContent = hasMode ? formatSigned(start.moneyAdd ?? 0, 0) : "-";
    }
    if (this._els.runStartLives) {
      this._els.runStartLives.textContent = hasMode ? formatSigned(start.livesAdd ?? 0, 0) : "-";
    }
    if (this._els.runInterval) {
      this._els.runInterval.textContent = hasMode ? formatMult(difficulty.intervalMul ?? 1) : "-";
    }
    if (this._els.runHp) {
      this._els.runHp.textContent = hasMode ? formatMult(difficulty.hpMul ?? 1) : "-";
    }
    if (this._els.runElitePower) {
      this._els.runElitePower.textContent = hasMode ? formatMult(difficulty.eliteMult ?? 1) : "-";
    }
    if (this._els.runBossPower) {
      this._els.runBossPower.textContent = hasMode ? formatMult(difficulty.bossMult ?? 1) : "-";
    }

    const selectedMods = this._getSelectedModifierDefs();
    const { mult } = computeModifierCoinMultiplier(selectedMods);
    if (this._els.runCoinMult) this._els.runCoinMult.textContent = `x${mult.toFixed(2)}`;
  }

  _mapName(mapId) {
    const map = (this._data.mapDefs || []).find((m) => m.id === mapId);
    return map?.name || mapId;
  }

  _buildModifierList() {
    const list = this._els.modifierList;
    if (!list) return;
    const prevSelected = new Set(this._modifierSelected);
    list.innerHTML = "";
    this._modifierSelected.clear();

    const groups = buildModifierGroups(this._data.modifierDefs || []);
    const unlocked = new Set(this._getUnlockedModifierDefs().map((mod) => mod.id));
    const featureLocked = this._modifiersLocked();

    for (const group of groups) {
      const details = document.createElement("details");
      details.className = "dropdown modifier-group";
      details.dataset.group = group.id;

      const summary = document.createElement("summary");
      const title = document.createElement("span");
      title.className = "dropdown-title";
      title.textContent = group.label;
      const count = document.createElement("span");
      count.className = "dropdown-hint muted small";
      count.dataset.groupCount = group.id;
      count.textContent = "0 selected";
      summary.appendChild(title);
      summary.appendChild(count);
      details.appendChild(summary);

      const actions = document.createElement("div");
      actions.className = "mod-actions";
      actions.dataset.groupActions = group.id;

      const randBtn = document.createElement("button");
      randBtn.className = "ghost";
      randBtn.type = "button";
      randBtn.textContent = "Randomize";
      randBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._randomizeModifiers(group.id);
      });

      const allBtn = document.createElement("button");
      allBtn.className = "ghost";
      allBtn.type = "button";
      allBtn.textContent = "Add All";
      allBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._selectAllModifiers(group.id);
      });

      const clearBtn = document.createElement("button");
      clearBtn.className = "ghost";
      clearBtn.type = "button";
      clearBtn.textContent = "Clear";
      clearBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._clearModifiers(group.id);
      });

      actions.appendChild(randBtn);
      actions.appendChild(allBtn);
      actions.appendChild(clearBtn);

      const groupWrap = document.createElement("div");
      groupWrap.className = "modifier-group-contents";
      groupWrap.dataset.groupWrap = group.id;

      for (const subgroup of group.subgroups) {
        const subgroupDetails = document.createElement("details");
        subgroupDetails.className = "dropdown modifier-subgroup";
        subgroupDetails.dataset.group = group.id;
        subgroupDetails.dataset.subgroup = subgroup.id;
        subgroupDetails.open = true;

        const subgroupSummary = document.createElement("summary");
        const subgroupTitle = document.createElement("span");
        subgroupTitle.className = "dropdown-title";
        subgroupTitle.textContent = subgroup.label;
        const subgroupCount = document.createElement("span");
        subgroupCount.className = "dropdown-hint muted small";
        subgroupCount.dataset.subgroupCount = `${group.id}:${subgroup.id}`;
        subgroupCount.textContent = "0 selected";
        subgroupSummary.appendChild(subgroupTitle);
        subgroupSummary.appendChild(subgroupCount);
        subgroupDetails.appendChild(subgroupSummary);

        const groupList = document.createElement("div");
        groupList.className = "modifier-list";
        groupList.dataset.groupList = group.id;
        groupList.dataset.subgroupList = subgroup.id;

        for (const mod of subgroup.items) {
          const label = document.createElement("label");
          label.className = "modifier-item";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = mod.id;
          const canSelect = !featureLocked && unlocked.has(mod.id);
          checkbox.disabled = !canSelect;
          if (canSelect && prevSelected.has(mod.id)) {
            checkbox.checked = true;
            this._modifierSelected.add(mod.id);
          }
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

          const metaRow = document.createElement("div");
          metaRow.className = "modifier-meta-row";
          const { mult } = computeModifierCoinMultiplier([mod]);
          const coin = document.createElement("span");
          coin.className = `modifier-coin ${mult < 1 ? "helpful" : "challenge"}`;
          coin.textContent = `Coins x${mult.toFixed(2)}`;
          const lock = document.createElement("span");
          lock.className = "modifier-lock hidden";
          lock.dataset.modLock = mod.id;
          metaRow.appendChild(coin);
          metaRow.appendChild(lock);
          meta.appendChild(metaRow);

          label.appendChild(checkbox);
          label.appendChild(meta);
          groupList.appendChild(label);
        }

        subgroupDetails.appendChild(groupList);
        groupWrap.appendChild(subgroupDetails);
      }

      details.appendChild(actions);
      details.appendChild(groupWrap);
      list.appendChild(details);
    }

    this._syncModifierCount();

    if (!this._modifierActionsBound) {
      this._els.modifierRandomBtn?.addEventListener("click", () => this._randomizeModifiers());
      this._els.modifierAllBtn?.addEventListener("click", () => this._selectAllModifiers());
      this._els.modifierClearBtn?.addEventListener("click", () => this._clearModifiers());
      this._modifierActionsBound = true;
    }
  }

  _syncModifierCount() {
    if (!this._els.modifierCount) return;
    if (this._modifiersLocked()) {
      this._els.modifierCount.textContent = "Locked — unlock in Shop";
      this._syncRunIntel();
      return;
    }
    const count = this._modifierSelected.size;
    const { mult } = computeModifierCoinMultiplier(this._getSelectedModifierDefs());
    const base = count ? `${count} selected` : "No modifiers selected";
    this._els.modifierCount.textContent = `${base} • Coins x${mult.toFixed(2)} • click to expand`;
    this._syncRunIntel();

    if (!this._els.modifierList) return;
    for (const el of this._els.modifierList.querySelectorAll("[data-group-count]")) {
      const groupId = el.dataset.groupCount;
      const groupLists = this._els.modifierList.querySelectorAll(`[data-group-list="${groupId}"]`);
      if (!groupLists.length) continue;
      let selected = 0;
      for (const list of groupLists) {
        for (const input of list.querySelectorAll("input[type='checkbox']")) {
          if (input.checked) selected += 1;
        }
      }
      el.textContent = selected ? `${selected} selected` : "0 selected";
    }

    for (const el of this._els.modifierList.querySelectorAll("[data-subgroup-count]")) {
      const key = el.dataset.subgroupCount;
      const [groupId, subgroupId] = key.split(":");
      if (!groupId || !subgroupId) continue;
      const subgroupList = this._els.modifierList.querySelector(
        `[data-group-list="${groupId}"][data-subgroup-list="${subgroupId}"]`
      );
      if (!subgroupList) continue;
      let selected = 0;
      for (const input of subgroupList.querySelectorAll("input[type='checkbox']")) {
        if (input.checked) selected += 1;
      }
      el.textContent = selected ? `${selected} selected` : "0 selected";
    }
  }

  _getValidMapModePairs(mapDefs, modeDefs) {
    const mapIds = new Set(mapDefs.map((m) => m.id));
    const pairs = [];
    for (const map of mapDefs) {
      for (const mode of modeDefs) {
        const required = mode?.requiredMap && mapIds.has(mode.requiredMap) ? mode.requiredMap : "";
        if (required && required !== map.id) continue;
        pairs.push({ mapId: map.id, modeId: mode.id });
      }
    }
    return pairs;
  }

  _resolveMapModePair(mapId, modeId, source = "init") {
    const fallbackMaps = this._data.mapDefs || [];
    const fallbackModes = this._data.modeDefs || [];
    const unlockedMaps = this._getUnlockedMapDefs();
    const unlockedModes = this._getUnlockedModeDefs();
    const mapDefs = unlockedMaps.length ? unlockedMaps : fallbackMaps;
    const modeDefs = unlockedModes.length ? unlockedModes : fallbackModes;
    if (!mapDefs.length || !modeDefs.length) return { mapId: mapId ?? null, modeId: modeId ?? null };

    const mapById = new Map(mapDefs.map((m) => [m.id, m]));
    const modeById = new Map(modeDefs.map((m) => [m.id, m]));
    const mapIds = new Set(mapDefs.map((m) => m.id));

    const getRequiredMap = (mode) => {
      const req = mode?.requiredMap;
      return req && mapIds.has(req) ? req : "";
    };

    const currentMapId = mapById.has(mapId) ? mapId : mapDefs[0]?.id ?? null;
    const fallbackModeId =
      (this._lastFreeModeId && modeById.has(this._lastFreeModeId) && this._lastFreeModeId) || modeDefs[0]?.id || null;
    const currentModeId = modeById.has(modeId) ? modeId : fallbackModeId;
    const currentMode = modeById.get(currentModeId);

    if (source === "mode") {
      const required = getRequiredMap(currentMode);
      return { mapId: required || currentMapId, modeId: currentModeId };
    }

    if (source === "map") {
      const required = getRequiredMap(currentMode);
      if (!required || required === currentMapId) {
        return { mapId: currentMapId, modeId: currentModeId };
      }
      const lastFree = this._lastFreeModeId ? modeById.get(this._lastFreeModeId) : null;
      if (lastFree && !lastFree.requiredMap) {
        return { mapId: currentMapId, modeId: lastFree.id };
      }
      const freeMode = modeDefs.find((m) => !m.requiredMap);
      if (freeMode) return { mapId: currentMapId, modeId: freeMode.id };
      const compatible = modeDefs.find((m) => !getRequiredMap(m) || getRequiredMap(m) === currentMapId);
      if (compatible) return { mapId: currentMapId, modeId: compatible.id };
      return { mapId: currentMapId, modeId: currentModeId || modeDefs[0]?.id || null };
    }

    const required = getRequiredMap(currentMode);
    return { mapId: required || currentMapId, modeId: currentModeId };
  }

  _randomizeModifiers(groupId = null) {
    if (this._modifiersLocked()) return;
    const defs = this._getUnlockedModifierDefs();
    if (!defs.length || !this._els.modifierList) return;
    const pool = groupId ? defs.filter((d) => categorizeModifier(d) === groupId) : defs;
    if (!pool.length) return;
    const count = Math.min(pool.length, Math.max(2, Math.floor(2 + Math.random() * 4)));
    const picks = new Set();
    while (picks.size < count) {
      const mod = pool[Math.floor(Math.random() * pool.length)];
      if (mod) picks.add(mod.id);
    }

    if (!groupId) this._modifierSelected.clear();
    const scopes = groupId
      ? [...this._els.modifierList.querySelectorAll(`[data-group-list="${groupId}"]`)]
      : [this._els.modifierList];
    if (!scopes.length) return;
    for (const scope of scopes) {
      for (const label of scope.querySelectorAll("label.modifier-item")) {
        const input = label.querySelector("input");
        if (!input) continue;
        const checked = picks.has(input.value);
        if (!input.disabled) input.checked = checked;
        if (checked) this._modifierSelected.add(input.value);
        else if (groupId) this._modifierSelected.delete(input.value);
      }
    }
    this._syncModifierCount();
  }

  _selectAllModifiers(groupId = null) {
    if (this._modifiersLocked()) return;
    const defs = this._getUnlockedModifierDefs();
    if (!defs.length || !this._els.modifierList) return;
    if (!groupId) this._modifierSelected.clear();
    const scopes = groupId
      ? [...this._els.modifierList.querySelectorAll(`[data-group-list="${groupId}"]`)]
      : [this._els.modifierList];
    if (!scopes.length) return;
    for (const scope of scopes) {
      for (const input of scope.querySelectorAll("input[type='checkbox']")) {
        if (input.disabled) continue;
        input.checked = true;
        this._modifierSelected.add(input.value);
      }
    }
    this._syncModifierCount();
  }

  _clearModifiers(groupId = null) {
    if (this._modifiersLocked()) return;
    if (!this._els.modifierList) return;
    if (!groupId) this._modifierSelected.clear();
    const scopes = groupId
      ? [...this._els.modifierList.querySelectorAll(`[data-group-list="${groupId}"]`)]
      : [this._els.modifierList];
    if (!scopes.length) return;
    for (const scope of scopes) {
      for (const input of scope.querySelectorAll("input[type='checkbox']")) {
        if (input.disabled) continue;
        input.checked = false;
        this._modifierSelected.delete(input.value);
      }
    }
    this._syncModifierCount();
  }

  _syncMapPreview() {
    const canvas = this._els.mapPreview;
    if (!canvas) return;
    const mapId = this._els.mapSelect?.value;
    const mapDef = this._data.mapDefs.find((m) => m.id === mapId) ?? this._data.mapDefs[0];
    if (!mapDef) return;
    this._renderMapPreview(canvas, mapDef);
  }

  _renderMapPreview(canvas, mapDef) {
    if (!canvas || !mapDef) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const map = new MapInstance(mapDef);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (map.id === "void_crucible") {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#050714");
      g.addColorStop(1, "#0a0f25");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
      glow.addColorStop(0, "rgba(79,70,229,0.25)");
      glow.addColorStop(0.6, "rgba(14,165,233,0.12)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#0b1022";
      ctx.fillRect(0, 0, w, h);
    }

    const mapW = map.cols * map.tileSize;
    const mapH = map.rows * map.tileSize;
    const scale = Math.min(w / mapW, h / mapH) * 0.92;
    const offsetX = (w - mapW * scale) / 2;
    const offsetY = (h - mapH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.globalAlpha = 0.18;
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

    if (map.id === "void_crucible") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(56,189,248,0.85)";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 6 / scale]);
      ctx.beginPath();
      ctx.arc(map.base.x - map.tileSize * 4, map.base.y + map.tileSize * 1.5, map.tileSize * 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();
  }

  _applyMapModeLock(source = "init") {
    if (!this._els.mapSelect || !this._els.modeSelect) return;
    const modeId = this._els.modeSelect.value;
    const mapId = this._els.mapSelect.value;
    const resolved = this._resolveMapModePair(mapId, modeId, source);
    if (resolved?.mapId && this._els.mapSelect.value !== resolved.mapId) this._els.mapSelect.value = resolved.mapId;
    if (resolved?.modeId && this._els.modeSelect.value !== resolved.modeId) this._els.modeSelect.value = resolved.modeId;

    const map = (this._data.mapDefs || []).find((m) => m.id === this._els.mapSelect.value);
    const mode = (this._data.modeDefs || []).find((m) => m.id === this._els.modeSelect.value);
    if (map) this._lastFreeMapId = map.id;
    if (mode && !mode.requiredMap) this._lastFreeModeId = mode.id;
  }

  showGameOver(reason) {
    this.showGameOverWithTitle("Game Over", reason);
  }

  showGameOverWithTitle(title, reason) {
    if (this._els.gameOverTitle) this._els.gameOverTitle.textContent = title;
    this._els.gameOverReason.textContent = reason;
    if (this._els.gameOver) this._els.gameOver.classList.toggle("victory", /victory/i.test(title));
    const victory = /victory/i.test(title);
    if (!this._runRewarded && this._progression) {
      const reward = calculateCoinReward({
        mode: this._game?.modeDef,
        wavesCleared: this._game?.state?.waveNumber ?? 0,
        victory,
        modifiers: this._game?.modifiers || [],
      });
      this._lastCoinReward = reward;
      this._runRewarded = true;
      if (reward.total > 0) this._progression.addCoins(reward.total);
      this._progression.recordRun({
        coins: reward.total,
        waves: this._game?.state?.waveNumber ?? 0,
        victory,
        mapId: this._game?.map?.id || "",
        modeId: this._game?.modeDef?.id || "",
        damage: this._game?.state?.runStats?.damageDealt ?? 0,
        kills: this._game?.state?.runStats?.kills ?? 0,
        time: this._game?.state?.time ?? 0,
      });
      this._syncCoins();
    }
    this._renderGameOverCoins();
    this._els.gameOver.classList.remove("hidden");
  }

  _renderGameOverCoins() {
    const el = this._els.gameOverCoins;
    if (!el) return;
    el.innerHTML = "";
    const reward = this._lastCoinReward;
    if (!reward) return;
    const total = Math.max(0, Math.round(reward.total || 0));
    const totalEl = document.createElement("div");
    totalEl.className = "coin-total";
    totalEl.textContent = total ? `+${total} Coins` : "No Coins earned";
    el.appendChild(totalEl);
    if (total) {
      const parts = [`Progress ${reward.waveCoins}`];
      if (reward.bonus) parts.push(`Victory ${reward.bonus}`);
      const breakdown = document.createElement("div");
      breakdown.className = "muted small";
      breakdown.textContent = parts.join(" • ");
      el.appendChild(breakdown);

      if (reward.modifierMult && Math.abs(reward.modifierMult - 1) > 0.01) {
        const modLine = document.createElement("div");
        modLine.className = "muted small";
        modLine.textContent = `Modifiers x${reward.modifierMult.toFixed(2)}`;
        el.appendChild(modLine);
      }
    }
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

function formatClock(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor(total / 60) % 60;
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function setupCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, width: rect.width, height: rect.height };
}

function renderPieChart(canvas, segments = []) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, width, height } = setup;
  const total = segments.reduce((sum, seg) => sum + Math.max(0, seg.value || 0), 0);
  if (!total) {
    ctx.fillStyle = "rgba(231, 236, 255, 0.55)";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No data yet", width / 2, height / 2);
    return;
  }
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;
  const innerRadius = radius * 0.58;
  let angle = -Math.PI / 2;
  for (const seg of segments) {
    const value = Math.max(0, seg.value || 0);
    if (!value) continue;
    const slice = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = seg.color || "rgba(56, 189, 248, 0.9)";
    ctx.fill();
    angle += slice;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(12, 16, 32, 0.9)";
  ctx.fill();

  const wins = segments[0]?.value || 0;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  ctx.fillStyle = "rgba(231, 236, 255, 0.92)";
  ctx.font = "600 16px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${winRate}%`, cx, cy - 6);
  ctx.fillStyle = "rgba(231, 236, 255, 0.6)";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillText("win rate", cx, cy + 12);
}

function renderLineChart(canvas, values = [], options = {}) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, width, height } = setup;
  if (!values || values.length < 2) {
    ctx.fillStyle = "rgba(231, 236, 255, 0.55)";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Not enough runs", width / 2, height / 2);
    return;
  }
  const padding = { top: 16, right: 30, bottom: 18, left: 14 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = padding.top + (chartH / 2) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const points = values.map((val, idx) => {
    const x = padding.left + (idx / (values.length - 1)) * chartW;
    const y = padding.top + (1 - (val - min) / span) * chartH;
    return { x, y, val };
  });

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = options.color || "rgba(56, 189, 248, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = options.accent || "rgba(129, 140, 248, 0.9)";
  ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = options.color || "rgba(56, 189, 248, 0.9)";
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const formatValue = (value) => Math.round(value).toLocaleString();
  const labels = [
    { value: max, y: padding.top },
    { value: (max + min) / 2, y: padding.top + chartH / 2 },
    { value: min, y: padding.top + chartH },
  ];
  ctx.fillStyle = "rgba(231, 236, 255, 0.6)";
  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const label of labels) {
    ctx.fillText(formatValue(label.value), width - 2, label.y);
  }
}

function getPrimaryDamageType(def, statsOverride = null) {
  const role = String(def?.role || "").toLowerCase();
  const stats = statsOverride || def?.stats || {};
  const ability = stats?.ability || {};
  const abilityType = String(ability.type || "").toLowerCase();
  const onHit = stats?.onHitEffects || [];
  const abilityEffects = ability.effects || [];

  const hasEffect = (list, type) =>
    (list || []).some((fx) => String(fx?.type || "").toLowerCase() === type);

  const hasStun = hasEffect(onHit, "stun") || hasEffect(abilityEffects, "stun");
  const hasSlow = hasEffect(onHit, "slow") || hasEffect(abilityEffects, "slow");
  const hasBurn = hasEffect(onHit, "burn") || hasEffect(abilityEffects, "burn");
  const hasPoison = hasEffect(onHit, "poison") || hasEffect(abilityEffects, "poison");
  const hasBleed = hasEffect(onHit, "bleed") || hasEffect(abilityEffects, "bleed");
  const hasVuln = hasEffect(onHit, "vulnerability") || hasEffect(abilityEffects, "vulnerability");
  const hasArmorBreak = hasEffect(onHit, "armor_reduction") || hasEffect(abilityEffects, "armor_reduction");

  if (abilityType === "summon" || role === "summoner") return "SUMMONER";
  if (stats?.aura || role === "support") return "SUPPORT";
  if (hasStun || role === "stun") return "STUN";
  if (role === "slowing" || hasSlow) return "SLOW";
  if (role === "debuff" || hasVuln || hasArmorBreak) return "DEBUFF";
  if (hasBurn) return "BURN";
  if (hasPoison) return "POISON";
  if (hasBleed) return "BLEED";
  if (role === "single-target" || role === "splash" || role === "dps") return "DPS";
  if (role) return role.replace(/[^a-z0-9]+/g, " ").trim().toUpperCase();
  if ((stats?.damage ?? 0) > 0 || (ability?.damage ?? 0) > 0) return "DPS";
  return "UTILITY";
}

function getTowerSubtext(def, stats, totalDps) {
  const role = String(def?.role || "").toLowerCase();
  const isDps = role === "single-target" || role === "splash" || role === "dps";
  if (isDps) return `${formatDps(totalDps)} DPS`;

  if (role === "summoner") {
    const ability = stats?.ability;
    const summon = ability?.summon || {};
    const name = summon.name || ability?.name || "Summon";
    const summonDps = calcSummonDps(summon, stats);
    return `${name} — ${formatDps(summonDps)} DPS`;
  }

  if (role === "support" || role === "slowing" || role === "debuff") {
    return getRoleSummary(role, stats);
  }

  const ability = stats?.ability;
  if (ability) {
    const desc = describeTowerAbility(ability, stats);
    if (String(ability.type || "").toLowerCase() === "summon") {
      const summon = ability.summon || {};
      const name = summon.name || ability.name || "Summon";
      const summonDps = calcSummonDps(summon, stats);
      return `${name} — ${formatDps(summonDps)} DPS`;
    }
    if (desc) return desc;
    return ability.name || formatLabel(ability.type) || "Ability";
  }

  if (stats?.aura) {
    return getAuraSummary(stats.aura);
  }

  const fx = stats?.onHitEffects?.[0];
  if (fx?.type) return `${formatLabel(fx.type)} on hit`;
  return "Utility";
}

function calcSummonDps(summon, stats) {
  if (!summon) return 0;
  const damage = summon.damage ?? 0;
  const fireRate = summon.fireRate ?? 0;
  if (!damage || !fireRate) return 0;
  const expected = calcExpectedDamage(damage, summon.critChance ?? stats?.critChance, summon.critMult ?? stats?.critMult);
  return expected * fireRate;
}

function getAuraSummary(aura) {
  const buffs = Object.keys(aura?.buffs || {});
  if (!buffs.length) return "Aura";
  const names = buffs
    .slice(0, 2)
    .map((b) => formatLabel(b.replace(/Mul$/i, "")))
    .join(", ");
  const suffix = buffs.length > 2 ? "…" : "";
  return `Aura: ${names}${suffix}`;
}

function getRoleSummary(role, stats) {
  const effects = listEffectTags(stats);
  if (role === "support") {
    const benefit = getSupportBenefit(stats);
    if (stats?.aura && effects.length) return `Boosts nearby towers, focusing on ${benefit}, and ${effects.join(" & ")} enemies.`;
    if (stats?.aura) return `Boosts nearby towers, focusing on ${benefit}.`;
    if (effects.length) return `Supports allies; ${effects.join(" & ")} enemies.`;
    return "Supports allied towers.";
  }
  if (role === "slowing") {
    if (effects.includes("stuns") && effects.includes("slows")) return "Slows enemies and can stun.";
    if (effects.includes("slows")) return "Slows enemies to control waves.";
    if (effects.includes("stuns")) return "Stuns enemies to control waves.";
    return "Controls enemy movement.";
  }
  if (role === "debuff") {
    if (effects.includes("exposes") && effects.includes("shreds armor")) return "Exposes targets and shreds armor.";
    if (effects.includes("exposes")) return "Exposes targets for extra damage.";
    if (effects.includes("shreds armor")) return "Shreds armor for allies.";
    return "Weakens enemies for allies.";
  }
  return "Utility";
}

function listEffectTags(stats) {
  const tags = new Set();
  const add = (type) => tags.add(type);
  const scan = (list) => {
    for (const fx of list || []) {
      const t = String(fx?.type || "").toLowerCase();
      if (t === "slow") add("slows");
      else if (t === "stun") add("stuns");
      else if (t === "vulnerability") add("exposes");
      else if (t === "armor_reduction") add("shreds armor");
      else if (t === "burn") add("burns");
      else if (t === "poison") add("poisons");
      else if (t === "bleed") add("bleeds");
    }
  };
  scan(stats?.onHitEffects);
  scan(stats?.ability?.effects);
  return [...tags];
}

function getSupportBenefit(stats) {
  const buffs = stats?.aura?.buffs || {};
  if (buffs.fireRateMul && buffs.damageMul) return "tower fire rate & damage";
  if (buffs.fireRateMul) return "tower fire rate";
  if (buffs.damageMul) return "tower damage";
  if (buffs.rangeMul) return "tower range";
  if (buffs.projectileSpeedMul) return "projectile speed";
  if (buffs.stunImmune || buffs.cleanseStun) return "tower resilience";
  const keys = Object.keys(buffs);
  if (keys.length) return "nearby towers";
  return "nearby towers";
}

function buildModifierGroups(defs) {
  const groups = [
    { id: "challenge", label: "Challenge Modifiers", subgroups: new Map() },
    { id: "helpful", label: "Helpful Modifiers", subgroups: new Map() },
  ];
  const byId = new Map(groups.map((g) => [g.id, g]));

  for (const mod of defs) {
    const id = categorizeModifier(mod);
    const group = byId.get(id) || byId.get("challenge");
    const fn = getModifierFunctionGroup(mod);
    if (!group.subgroups.has(fn.id)) {
      group.subgroups.set(fn.id, { id: fn.id, label: fn.label, items: [] });
    }
    group.subgroups.get(fn.id).items.push(mod);
  }

  for (const group of groups) {
    const sorted = [...group.subgroups.values()].sort((a, b) => a.label.localeCompare(b.label));
    for (const subgroup of sorted) {
      subgroup.items.sort((a, b) => a.name.localeCompare(b.name));
    }
    group.subgroups = sorted;
  }
  return groups.filter((g) => g.subgroups.length);
}

function categorizeModifier(mod) {
  const { mult } = computeModifierCoinMultiplier([mod]);
  return mult < 1 ? "helpful" : "challenge";
}

function getModifierFunctionGroup(mod) {
  const effects = mod?.effects || {};
  const keys = ["start", "tower", "enemy", "wave"].filter((key) => {
    const block = effects[key];
    return block && Object.keys(block).length;
  });
  if (!keys.length) return { id: "misc", label: "Misc" };
  const labels = {
    start: "Start",
    tower: "Towers",
    enemy: "Enemies",
    wave: "Waves",
  };
  const id = keys.join("+");
  const label = keys.map((key) => labels[key] || key).join(" + ");
  return { id, label };
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

function getStatsWithUpgrade(tower, def, upgrade, modifiers) {
  if (!tower || !def || !upgrade) return null;
  const hadUpgrade = tower.appliedUpgrades.has(upgrade.id);
  if (!hadUpgrade) tower.appliedUpgrades.add(upgrade.id);
  let nextStats = null;
  try {
    nextStats = tower.computeStats(def, { modifiers });
  } finally {
    if (!hadUpgrade) tower.appliedUpgrades.delete(upgrade.id);
  }
  return nextStats;
}

function getUpgradeAbilityDescription(currentStats, nextStats) {
  const ability = nextStats?.ability || currentStats?.ability;
  if (!ability) return "";
  const abilityName = ability.name || currentStats?.ability?.name || "Ability";
  const abilityDesc = describeTowerAbility(ability, nextStats || currentStats);
  if (!abilityDesc) return "";
  return `Ability: ${abilityName} — ${abilityDesc}`;
}

function getUpgradeStatChanges(currentStats, nextStats) {
  if (!currentStats || !nextStats) return [];
  const lines = [];
  const hasAura = Boolean(currentStats.aura || nextStats.aura);

  if (hasAura) {
    pushStatChange(lines, "Aura radius", currentStats.aura?.radius, nextStats.aura?.radius, formatInt);
    const auraBuffs = getAuraBuffChanges(currentStats.aura?.buffs, nextStats.aura?.buffs);
    lines.push(...auraBuffs);
  } else {
    pushStatChange(lines, "Range", currentStats.range, nextStats.range, formatInt);
    pushStatChange(lines, "Damage", currentStats.damage, nextStats.damage, formatInt);
    if (currentStats.damageType !== nextStats.damageType) {
      pushTextChange(lines, "Damage Type", currentStats.damageType, nextStats.damageType);
    }
    pushStatChange(lines, "Fire", currentStats.fireRate, nextStats.fireRate, formatRate);
    pushStatChange(lines, "DPS", calcTotalDps(currentStats).total, calcTotalDps(nextStats).total, formatDps);
    pushStatChange(lines, "Splash", currentStats.splashRadius, nextStats.splashRadius, formatInt);
    pushStatChange(lines, "Projectile", currentStats.projectileSpeed, nextStats.projectileSpeed, formatInt);
    pushStatChange(lines, "Crit Chance", currentStats.critChance, nextStats.critChance, formatPercent);
    pushStatChange(lines, "Crit Mult", currentStats.critMult, nextStats.critMult, formatMultiplier);
    if ((currentStats.bonusMult ?? 1) !== (nextStats.bonusMult ?? 1)) {
      pushStatChange(lines, "Bonus Mult", currentStats.bonusMult, nextStats.bonusMult, formatMultiplier);
    }
    if (currentStats.targeting !== nextStats.targeting) {
      pushTextChange(lines, "Targeting", labelForTargeting(currentStats.targeting), labelForTargeting(nextStats.targeting));
    }
    const onHitDelta = diffEffectList(currentStats.onHitEffects, nextStats.onHitEffects);
    if (onHitDelta) lines.push(`On-hit: ${onHitDelta}`);
    lines.push(...getChainChangeLines("Chain", currentStats.chain, nextStats.chain));
  }

  lines.push(...getAbilityChangeLines(currentStats.ability, nextStats.ability));
  return lines;
}

function getAbilityChangeLines(currentAbility, nextAbility) {
  if (!currentAbility && !nextAbility) return [];
  const lines = [];
  const cur = currentAbility || {};
  const nxt = nextAbility || {};
  pushStatChange(lines, "Ability CD", cur.cooldown, nxt.cooldown, formatSeconds);
  pushStatChange(lines, "Ability Damage", cur.damage, nxt.damage, formatInt);
  pushStatChange(lines, "Ability Radius", cur.radius, nxt.radius, formatInt);
  pushStatChange(lines, "Ability Range", cur.range, nxt.range, formatInt);
  pushStatChange(lines, "Ability Count", cur.count, nxt.count, formatInt);
  pushStatChange(lines, "Ability Splash", cur.splashRadius, nxt.splashRadius, formatInt);
  pushStatChange(lines, "Ability Projectile", cur.projectileSpeed, nxt.projectileSpeed, formatInt);
  pushStatChange(lines, "Ability Lives", cur.lives, nxt.lives, formatNumber1);
  pushStatChange(lines, "Ability Bonus Mult", cur.bonusMult, nxt.bonusMult, formatMultiplier);
  if (cur.damageType !== nxt.damageType) {
    pushTextChange(lines, "Ability Damage Type", cur.damageType, nxt.damageType);
  }
  if (cur.targeting !== nxt.targeting) {
    pushTextChange(lines, "Ability Targeting", labelForTargeting(cur.targeting), labelForTargeting(nxt.targeting));
  }
  const abilityEffects = diffEffectList(cur.effects, nxt.effects);
  if (abilityEffects) lines.push(`Ability Effects: ${abilityEffects}`);
  lines.push(...getChainChangeLines("Ability Chain", cur.chain, nxt.chain));
  lines.push(...getSummonChangeLines(cur.summon, nxt.summon));
  return lines;
}

function getSummonChangeLines(currentSummon, nextSummon) {
  if (!currentSummon && !nextSummon) return [];
  const lines = [];
  const cur = currentSummon || {};
  const nxt = nextSummon || {};
  pushStatChange(lines, "Summon HP", cur.hp, nxt.hp, formatInt);
  pushStatChange(lines, "Summon Damage", cur.damage, nxt.damage, formatInt);
  pushStatChange(lines, "Summon Fire", cur.fireRate, nxt.fireRate, formatRate);
  pushStatChange(lines, "Summon Range", cur.range, nxt.range, formatInt);
  pushStatChange(lines, "Summon Life", cur.lifetime, nxt.lifetime, formatSeconds);
  pushStatChange(lines, "Summon Speed", cur.speed, nxt.speed, formatInt);
  pushStatChange(lines, "Summon Projectile", cur.projectileSpeed, nxt.projectileSpeed, formatInt);
  const onHitDelta = diffEffectList(cur.onHitEffects, nxt.onHitEffects);
  if (onHitDelta) lines.push(`Summon On-hit: ${onHitDelta}`);
  lines.push(...getChainChangeLines("Summon Chain", cur.chain, nxt.chain));
  return lines;
}

function getChainChangeLines(label, currentChain, nextChain) {
  if (!currentChain && !nextChain) return [];
  const lines = [];
  const cur = currentChain || {};
  const nxt = nextChain || {};
  const keys = new Set([...Object.keys(cur), ...Object.keys(nxt)]);
  for (const key of keys) {
    const curVal = cur[key];
    const nxtVal = nxt[key];
    if (curVal == null && nxtVal == null) continue;
    const lower = key.toLowerCase();
    let format = formatNumber2;
    if (lower.includes("range") || lower.includes("radius") || lower.includes("distance")) format = formatInt;
    if (lower.includes("jump") || lower.includes("count") || lower.includes("max")) format = formatInt;
    const line = formatChange(`${label} ${formatLabel(key)}`, curVal, nxtVal, format);
    if (line) lines.push(line);
  }
  return lines;
}

function getAuraBuffChanges(currentBuffs, nextBuffs) {
  const lines = [];
  const cur = currentBuffs || {};
  const nxt = nextBuffs || {};
  const keys = new Set([...Object.keys(cur), ...Object.keys(nxt)]);
  for (const key of keys) {
    const curVal = cur[key];
    const nxtVal = nxt[key];
    if (curVal == null && nxtVal == null) continue;
    const line = formatChange(`Aura Buff (${formatLabel(key).replace(/ Mul$/i, "")})`, curVal, nxtVal, (value) =>
      formatBuffValue(key, value)
    );
    if (line) lines.push(line);
  }
  return lines;
}

function diffEffectList(currentList, nextList) {
  const current = new Set((currentList || []).map((fx) => formatEffect(fx)).filter(Boolean));
  const next = new Set((nextList || []).map((fx) => formatEffect(fx)).filter(Boolean));
  if (!current.size && !next.size) return "";
  const added = [...next].filter((item) => !current.has(item));
  const removed = [...current].filter((item) => !next.has(item));
  const parts = [];
  if (added.length) parts.push(`+${added.join(", ")}`);
  if (removed.length) parts.push(`-${removed.join(", ")}`);
  return parts.join("; ");
}

function pushStatChange(lines, label, currentVal, nextVal, formatter) {
  const line = formatChange(label, currentVal, nextVal, formatter);
  if (line) lines.push(line);
}

function pushTextChange(lines, label, currentVal, nextVal) {
  const line = formatChange(label, currentVal, nextVal, (value) => (value == null ? "-" : String(value)));
  if (line) lines.push(line);
}

function formatChange(label, currentVal, nextVal, formatter) {
  if (currentVal == null && nextVal == null) return "";
  const currentText = formatter(currentVal);
  const nextText = formatter(nextVal);
  if (currentText === nextText) return "";
  return `${label}: ${currentText} -> ${nextText}`;
}

function formatLabel(value) {
  if (!value) return "";
  const withSpaces = String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function formatRoleLabel(value) {
  const v = String(value || "").toLowerCase();
  if (v === "dps") return "Assault";
  return formatLabel(value);
}

function formatBuffValue(key, value) {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (/mul$/i.test(key)) return `${fmt(value, 2)}x`;
    if (/chance/i.test(key)) return `${Math.round(value * 100)}%`;
    return fmt(value, 2);
  }
  return String(value);
}

function formatInt(value) {
  if (value == null) return "-";
  return `${Math.round(value)}`;
}

function formatNumber1(value) {
  if (value == null) return "-";
  return fmt(value, 1);
}

function formatNumber2(value) {
  if (value == null) return "-";
  return fmt(value, 2);
}

function formatRate(value) {
  if (value == null) return "-";
  return `${fmt(value, 2)}/s`;
}

function formatSeconds(value) {
  if (value == null) return "-";
  return `${fmt(value, 1)}s`;
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatMultiplier(value) {
  if (value == null) return "-";
  return `${fmt(value, 2)}x`;
}

function formatDps(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${fmt(value, 1)}`;
}

function calcExpectedDamage(damage, critChance, critMult) {
  if (!damage) return 0;
  const chance = critChance ?? 0;
  const mult = critMult ?? 2;
  return damage * (1 + chance * (mult - 1));
}

function calcDps(stats) {
  if (!stats) return null;
  const damage = stats.damage ?? 0;
  const fireRate = stats.fireRate ?? 0;
  if (stats.beam && damage) {
    const warmupMin = clamp(stats.beam.warmupMin ?? 0.35, 0.1, 1);
    const warmupAvg = (warmupMin + 1) / 2;
    return damage * warmupAvg;
  }
  if (!damage || !fireRate) return 0;
  const expectedDamage = calcExpectedDamage(damage, stats.critChance, stats.critMult);
  return expectedDamage * fireRate;
}

function calcAbilityDps(ability, stats) {
  if (!ability) return 0;
  const cooldown = ability.cooldown ?? 0;
  if (!cooldown) return 0;
  const type = String(ability.type || "nova").toLowerCase();
  if (type === "base_heal") return 0;

  if (type === "summon") {
    const summon = ability.summon;
    if (!summon) return 0;
    const summonDamage = summon.damage ?? 0;
    const summonFireRate = summon.fireRate ?? 0;
    if (!summonDamage || !summonFireRate) return 0;
    const summonExpected = calcExpectedDamage(summonDamage, summon.critChance, summon.critMult);
    const summonDps = summonExpected * summonFireRate;
    const count = Math.max(1, ability.count ?? 1);
    const life = summon.lifetime ?? 0;
    const uptime = life > 0 ? Math.min(life, cooldown) / cooldown : 1;
    return summonDps * count * uptime;
  }

  const count = Math.max(1, ability.count ?? 1);
  const abilityDamage = ability.damage ?? stats?.damage ?? 0;
  if (!abilityDamage) return 0;
  const expectedDamage = calcExpectedDamage(abilityDamage, ability.critChance ?? stats?.critChance, ability.critMult ?? stats?.critMult);
  return (expectedDamage * count) / cooldown;
}

function calcTotalDps(stats) {
  const base = calcDps(stats) || 0;
  const ability = calcAbilityDps(stats?.ability, stats) || 0;
  return {
    base,
    ability,
    total: base + ability,
  };
}

function describeTowerAbility(ability, stats) {
  if (!ability) return "";
  if (ability.description) return ability.description;
  const type = String(ability.type || "nova").toLowerCase();
  const damage = Math.round(ability.damage ?? stats?.damage ?? 0);
  const damageType = ability.damageType ?? stats?.damageType ?? "physical";
  const range = Math.round(ability.range ?? stats?.range ?? 0);
  const radius = Math.round(ability.radius ?? range ?? 0);
  const effects = formatAbilityEffects(ability.effects);

  if (type === "summon") {
    const count = Math.max(1, ability.count ?? 1);
    const summonName = ability.summon?.name || "ally";
    const life = ability.summon?.lifetime;
    const parts = [`Summons ${count} ${summonName}${count > 1 ? "s" : ""} on nearby paths`];
    if (life) parts.push(`lasts ${fmt(life, 1)}s`);
    return parts.join("; ");
  }
  if (type === "volley") {
    const count = Math.max(1, ability.count ?? 3);
    const splash = ability.splashRadius ? ` with ${Math.round(ability.splashRadius)} splash` : "";
    const desc = `Fires ${count} shots in ${range}px for ${damage} ${damageType}${splash}`;
    return effects ? `${desc}; applies ${effects}` : desc;
  }
  if (type === "nova") {
    const desc = `Blasts ${radius}px for ${damage} ${damageType}`;
    return effects ? `${desc}; applies ${effects}` : desc;
  }
  return effects || "Special ability effect";
}

function formatAbilityEffects(effects) {
  if (!effects?.length) return "";
  return effects
    .map((fx) => formatEffect(fx))
    .filter(Boolean)
    .join(", ");
}

function formatEffect(fx) {
  if (!fx) return "";
  const type = String(fx.type || "").toLowerCase();
  const dur = fx.duration != null ? `${fmt(fx.duration, 1)}s` : "";
  if (type === "slow") return `slow ${Math.round((fx.magnitude ?? 0) * 100)}% ${dur}`.trim();
  if (type === "burn") return `burn ${fmt(fx.magnitude ?? 0, 1)}/tick ${dur}`.trim();
  if (type === "poison") return `poison ${fmt(fx.magnitude ?? 0, 1)}/tick ${dur}`.trim();
  if (type === "bleed") return `bleed ${fmt(fx.magnitude ?? 0, 1)}/tick ${dur}`.trim();
  if (type === "stun") return `stun ${dur}`.trim();
  if (type === "armor_reduction") {
    const amount = fx.mode === "percent" ? `${Math.round((fx.magnitude ?? 0) * 100)}%` : `${fmt(fx.magnitude ?? 0, 1)}`;
    return `armor -${amount} ${dur}`.trim();
  }
  if (type === "vulnerability") return `vulnerability +${Math.round((fx.magnitude ?? 0) * 100)}% ${dur}`.trim();
  if (type === "haste") return `haste +${Math.round((fx.magnitude ?? 0) * 100)}% ${dur}`.trim();
  return type;
}
