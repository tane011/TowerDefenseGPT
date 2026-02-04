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
    };
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

    this._els.startBtn.addEventListener("click", () => {
      const mapId = this._els.mapSelect.value;
      const modeId = this._els.modeSelect.value;
      const modifierIds = [...this._modifierSelected];
      this._els.startScreen.classList.add("hidden");
      this._els.gameOver.classList.add("hidden");
      this._game.newRun(mapId, modeId, modifierIds);
      this.refreshPaletteCosts();
    });

    this._els.restartBtn.addEventListener("click", () => {
      this._els.gameOver.classList.add("hidden");
      this._els.startScreen.classList.remove("hidden");
    });

    this._els.nextWaveBtn.addEventListener("click", () => this._game.startNextWave());
    this._els.toggleAutoBtn.addEventListener("click", () => this._game.toggleAuto());
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
    this._els.wave.textContent = `${s.wave}${waveSuffix}${s.inWave ? " (active)" : ""}`;
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
      upgradeEmpty.className = "upgrade-empty muted small";
      upgradeEmpty.textContent = "All upgrades purchased.";
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
          name.textContent = up.name;

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

    const getPathLockReason = (up) => {
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
      this._selectedUi.upgradeEmpty.style.display = activeTier == null ? "block" : "none";
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
