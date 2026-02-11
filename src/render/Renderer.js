import { clamp } from "../core/math.js";
import { buildSprites } from "./sprites.js";

const BOSS_BAR_CANVAS_HEIGHT = 128;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawHealthBar(ctx, x, y, w, h, t, color = "#34d399") {
  const pct = clamp(t, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.9;
  roundRect(ctx, x, y, w, h, 3);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  roundRect(ctx, x, y, w * pct, h, 3);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawShield(ctx, x, y, r, filled = false) {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y - r * 0.6);
  ctx.lineTo(x + r * 0.6, y - r * 0.6);
  ctx.lineTo(x + r * 0.5, y + r * 0.2);
  ctx.lineTo(x, y + r * 0.75);
  ctx.lineTo(x - r * 0.5, y + r * 0.2);
  ctx.closePath();
  if (filled) ctx.fill();
  else ctx.stroke();
}

function drawSnowflake(ctx, x, y, r) {
  const arm = r * 0.78;
  const diag = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.moveTo(x - diag, y - diag);
  ctx.lineTo(x + diag, y + diag);
  ctx.moveTo(x - diag, y + diag);
  ctx.lineTo(x + diag, y - diag);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r * 0.18), 0, Math.PI * 2);
  ctx.fill();
}

function drawFlame(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.75);
  ctx.quadraticCurveTo(x + r * 0.75, y + r * 0.15, x + r * 0.2, y - r * 0.65);
  ctx.quadraticCurveTo(x, y - r * 0.95, x - r * 0.2, y - r * 0.65);
  ctx.quadraticCurveTo(x - r * 0.75, y + r * 0.15, x, y + r * 0.75);
  ctx.closePath();
  ctx.fill();
}

function drawDrop(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.7);
  ctx.quadraticCurveTo(x + r * 0.6, y - r * 0.05, x, y + r * 0.85);
  ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.05, x, y - r * 0.7);
  ctx.closePath();
  ctx.fill();
}

function drawStun(ctx, x, y, r) {
  const arm = r * 0.78;
  const diag = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.moveTo(x - diag, y - diag);
  ctx.lineTo(x + diag, y + diag);
  ctx.moveTo(x - diag, y + diag);
  ctx.lineTo(x + diag, y - diag);
  ctx.stroke();
}

function drawTarget(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y);
  ctx.lineTo(x + r * 0.7, y);
  ctx.moveTo(x, y - r * 0.7);
  ctx.lineTo(x, y + r * 0.7);
  ctx.stroke();
}

function drawBleed(ctx, x, y, r) {
  drawDrop(ctx, x - r * 0.1, y, r * 0.9);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.2, y + r * 0.1);
  ctx.lineTo(x + r * 0.65, y + r * 0.55);
  ctx.stroke();
}

function drawHaste(ctx, x, y, r) {
  const offset = r * 0.35;
  const width = r * 0.7;
  const height = r * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - width - offset, y - height);
  ctx.lineTo(x - offset, y);
  ctx.lineTo(x - width - offset, y + height);
  ctx.moveTo(x - width + offset, y - height);
  ctx.lineTo(x + offset, y);
  ctx.lineTo(x - width + offset, y + height);
  ctx.stroke();
}

function drawPhase(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, -0.8, 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 2.2, 5.2);
  ctx.stroke();
}

function drawFortify(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    const px = x + Math.cos(ang) * r * 0.75;
    const py = y + Math.sin(ang) * r * 0.75;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function effectIconData(type) {
  if (type === "slow") return { color: "#60a5fa", draw: drawSnowflake };
  if (type === "burn") return { color: "#fb923c", draw: drawFlame };
  if (type === "poison") return { color: "#34d399", draw: (ctx, x, y, r) => {
    drawDrop(ctx, x, y, r);
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.1, Math.max(1, r * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }};
  if (type === "stun") return { color: "#facc15", draw: drawStun };
  if (type === "armor_reduction") return { color: "#94a3b8", draw: (ctx, x, y, r) => {
    drawShield(ctx, x, y, r);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y - r * 0.15);
    ctx.lineTo(x + r * 0.2, y + r * 0.1);
    ctx.lineTo(x, y + r * 0.45);
    ctx.stroke();
  }};
  if (type === "vulnerability") return { color: "#a78bfa", draw: drawTarget };
  if (type === "bleed") return { color: "#ef4444", draw: drawBleed };
  if (type === "haste") return { color: "#f59e0b", draw: drawHaste };
  if (type === "armor_boost") return { color: "#93c5fd", draw: (ctx, x, y, r) => {
    drawShield(ctx, x, y, r, true);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.35, y);
    ctx.lineTo(x + r * 0.35, y);
    ctx.moveTo(x, y - r * 0.35);
    ctx.lineTo(x, y + r * 0.35);
    ctx.stroke();
  }};
  if (type === "phase") return { color: "#818cf8", draw: drawPhase };
  if (type === "fortify") return { color: "#0ea5e9", draw: drawFortify };
  return { color: "rgba(231,236,255,0.6)", draw: (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }};
}

function drawEffectIcon(ctx, type, x, y, size) {
  const icon = effectIconData(type);
  const r = size / 2;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.shadowColor = icon.color;
  ctx.shadowBlur = Math.max(2, r * 0.65);
  ctx.fillStyle = icon.color;
  ctx.strokeStyle = "rgba(4,6,14,0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r - 1.2), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.strokeStyle = "rgba(255,255,255,0.98)";
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.lineWidth = 1.35;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  icon.draw(ctx, x, y, r * 0.78);
  ctx.restore();
}

function effectSortPriority(type) {
  if (type === "stun") return 0;
  if (type === "armor_reduction") return 1;
  if (type === "vulnerability") return 2;
  if (type === "slow") return 3;
  if (type === "burn") return 4;
  if (type === "poison") return 5;
  if (type === "bleed") return 6;
  if (type === "phase") return 7;
  if (type === "armor_boost") return 8;
  if (type === "fortify") return 9;
  if (type === "haste") return 10;
  return 20;
}

function effectAuraColor(type) {
  if (type === "slow") return "rgba(96,165,250,0.7)";
  if (type === "burn") return "rgba(251,146,60,0.7)";
  if (type === "poison") return "rgba(52,211,153,0.7)";
  if (type === "bleed") return "rgba(239,68,68,0.7)";
  if (type === "stun") return "rgba(250,204,21,0.7)";
  if (type === "armor_reduction") return "rgba(148,163,184,0.7)";
  if (type === "vulnerability") return "rgba(167,139,250,0.7)";
  if (type === "haste") return "rgba(251,191,36,0.7)";
  if (type === "armor_boost") return "rgba(148,163,184,0.75)";
  if (type === "phase") return "rgba(129,140,248,0.7)";
  if (type === "fortify") return "rgba(14,165,233,0.7)";
  return null;
}

export class Renderer {
  constructor({ canvas, bossCanvas, towerDefs, enemyDefs }) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d", { alpha: false });
    this._bossCanvas = bossCanvas || null;
    this._bossCtx = bossCanvas ? bossCanvas.getContext("2d") : null;
    this._towerDefs = towerDefs;
    this._enemyDefs = enemyDefs;
    this._sprites = buildSprites({ towerDefs, enemyDefs });
    this._staticLayer = null;
    this._staticLayerKey = "";
  }

  render({ map, world, state, ui }) {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const time = state?.time ?? 0;
    const settings = ui?.settings || world?.settings || {};
    const phaseShift = this._getPhaseShiftState(world, time);
    const shake = this._getPhaseShiftShake(phaseShift, settings, time);

    if (!map) {
      ctx.fillStyle = "#0b1022";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(231,236,255,0.8)";
      ctx.font = "16px ui-sans-serif, system-ui";
      ctx.fillText("Loading…", 18, 28);
      return;
    }

    ctx.save();
    if (shake.x || shake.y) ctx.translate(shake.x, shake.y);
    this._drawStaticLayer(ctx, map, settings);
    const towerById = new Map(world.towers.map((t) => [t.id, t]));
    this._drawTowers(ctx, map, world, state, ui, time);
    this._drawAllies(ctx, world, time, towerById);
    this._drawProjectiles(ctx, world);
    this._drawEnemies(ctx, world, time);
    this._drawVfx(ctx, world, time);
    ctx.restore();

    if (phaseShift) this._drawPhaseShiftOverlay(ctx, w, h, phaseShift, settings, time);

    this._renderBossBar(world, settings, state, ui, map);
  }

  _getPhaseShiftState(world, time) {
    const boss = world?.enemies?.find?.(
      (e) => e.alive && e.tags?.has?.("boss") && (e._phase2Transition || e._phase2Afterglow)
    );
    if (!boss) return null;
    const shift = boss._phase2Transition || { remaining: 0, total: 1 };
    const progress = shift.total > 0 ? clamp(1 - shift.remaining / shift.total, 0, 1) : 1;
    const inTransition = Boolean(boss._phase2Transition);
    const afterglowTime = boss._phase2AfterglowTime ?? 0;
    const shakeRamp = boss._phase2Afterglow ? clamp(afterglowTime / 8, 0, 1) : progress * 0.35;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.8 + progress * 6);
    return { boss, shift, progress, pulse, inTransition, shakeRamp };
  }

  _getPhaseShiftShake(phaseShift, settings = {}, time = 0) {
    if (!phaseShift) return { x: 0, y: 0 };
    const motionMul = settings.reduceMotion ? 0.4 : 1;
    const ramp = clamp(phaseShift.shakeRamp ?? 0, 0, 1);
    const min = 0.2;
    const max = 2.1;
    const intensity = (min + (max - min) * ramp) * motionMul;
    return {
      x: Math.sin(time * 42) * intensity,
      y: Math.cos(time * 37) * intensity,
    };
  }

  _drawPhaseShiftOverlay(ctx, w, h, phaseShift, settings = {}, time = 0) {
    const motionMul = settings.reduceMotion ? 0.6 : 1;
    const ramp = clamp(phaseShift.shakeRamp ?? 0, 0, 1);
    const intensity = (0.12 + ramp * 0.3) * motionMul;
    const pulse = 0.7 + phaseShift.pulse * 0.3;
    const alpha = intensity * pulse;
    if (alpha <= 0) return;

    const boss = phaseShift.boss;
    const centerX = clamp(boss?.x ?? w * 0.5, 0, w);
    const centerY = clamp(boss?.y ?? h * 0.5, 0, h);
    const radius = Math.max(w, h) * (0.7 + phaseShift.progress * 0.5);
    const g = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, radius);
    g.addColorStop(0, `rgba(99,102,241,${0.25 * alpha})`);
    g.addColorStop(0.6, `rgba(56,189,248,${0.18 * alpha})`);
    g.addColorStop(1, `rgba(14,165,233,${0.08 * alpha})`);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.2 * alpha;
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  _drawGrid(ctx, map) {
    const ts = map.tileSize;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(231,236,255,0.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ts + 0.5, 0);
      ctx.lineTo(x * ts + 0.5, map.rows * ts);
      ctx.stroke();
    }
    for (let y = 0; y <= map.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts + 0.5);
      ctx.lineTo(map.cols * ts, y * ts + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawPaths(ctx, map, settings = {}) {
    const ts = map.tileSize;
    ctx.save();

    // Highlight path tiles.
    ctx.fillStyle = "rgba(106,164,255,0.08)";
    for (let ty = 0; ty < map.rows; ty++) {
      for (let tx = 0; tx < map.cols; tx++) {
        if (!map.isPathTile(tx, ty)) continue;
        ctx.fillRect(tx * ts, ty * ts, ts, ts);
      }
    }

    if (settings.showPathGlow !== false) {
      ctx.strokeStyle = "rgba(106,164,255,0.2)";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const poly of map.paths) {
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(106,164,255,0.6)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const poly of map.paths) {
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawDecor(ctx, map) {
    if (!map.decor?.length) return;
    ctx.save();
    for (const d of map.decor) {
      const size = (d.size ?? 1) * map.tileSize * 0.4;
      const x = d.x;
      const y = d.y;
      if (d.type === "tree") {
        const g = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, size * 0.1, x, y, size);
        g.addColorStop(0, "rgba(52,211,153,0.95)");
        g.addColorStop(1, "rgba(16,64,48,0.95)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(x + size * 0.2, y + size * 0.45, size * 0.9, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (d.type === "rock") {
        ctx.fillStyle = "rgba(100,116,139,0.85)";
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.9, size * 0.7, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === "crystal") {
        ctx.fillStyle = "rgba(125,211,252,0.85)";
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.6, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.6, y);
        ctx.closePath();
        ctx.fill();
      } else if (d.type === "ruin") {
        ctx.fillStyle = "rgba(100,116,139,0.75)";
        ctx.fillRect(x - size * 0.7, y - size * 0.6, size * 1.4, size * 1.2);
        ctx.fillStyle = "rgba(231,236,255,0.15)";
        ctx.fillRect(x - size * 0.4, y - size * 0.2, size * 0.8, size * 0.4);
      }
    }
    ctx.restore();
  }

  _drawBase(ctx, map) {
    ctx.save();
    ctx.fillStyle = "rgba(251,113,133,0.25)";
    ctx.strokeStyle = "rgba(251,113,133,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(map.base.x, map.base.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "rgba(251,113,133,0.5)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(map.base.x, map.base.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawVoidCrucibleBackdrop(ctx, map, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#050714");
    g.addColorStop(1, "#0a0f25");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const nebula = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.7);
    nebula.addColorStop(0, "rgba(79,70,229,0.28)");
    nebula.addColorStop(0.4, "rgba(14,165,233,0.18)");
    nebula.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(99,102,241,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.6, Math.min(w, h) * 0.25, 0.4, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();

    const sigilX = w * 0.48;
    const sigilY = h * 0.58;
    const size = Math.min(w, h) * 0.12;
    this._drawRiftSigil(ctx, sigilX, sigilY, size);
  }

  _drawRiftSigil(ctx, x, y, size) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(56,189,248,0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "rgba(167,139,250,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.7);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size * 0.7);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "rgba(14,165,233,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawStaticLayer(ctx, map, settings = {}) {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const grid = settings.showGrid !== false;
    const decor = settings.showDecor !== false;
    const glow = settings.showPathGlow !== false;
    const vignetteOn = settings.showVignette !== false;
    const key = `${map.id}-${w}x${h}-g${grid}-d${decor}-p${glow}-v${vignetteOn}`;
    if (!this._staticLayer || this._staticLayerKey !== key) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const sctx = c.getContext("2d", { alpha: false });
      if (map.id === "void_crucible") {
        this._drawVoidCrucibleBackdrop(sctx, map, w, h);
      } else {
        const g = sctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#0a1024");
        g.addColorStop(1, "#0c1733");
        sctx.fillStyle = g;
        sctx.fillRect(0, 0, w, h);
      }
      if (grid) this._drawGrid(sctx, map);
      this._drawPaths(sctx, map, settings);
      if (decor) this._drawDecor(sctx, map);
      this._drawBase(sctx, map);

      if (vignetteOn) {
        const vignette = sctx.createRadialGradient(
          w * 0.5,
          h * 0.4,
          Math.min(w, h) * 0.3,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.6
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.35)");
        sctx.fillStyle = vignette;
        sctx.fillRect(0, 0, w, h);
      }

      this._staticLayer = c;
      this._staticLayerKey = key;
    }
    ctx.drawImage(this._staticLayer, 0, 0);
  }

  _drawTowers(ctx, map, world, state, ui, time) {
    ctx.save();
    const tierOverlays = [];
    for (const t of world.towers) {
      ctx.save();
      const def = this._towerDefs[t.defId];
      const color = def?.color ?? "#e7ecff";
      const sprite = this._sprites.towers[t.defId];

      const stats = def ? t.computeStats(def, { modifiers: world.modifiers }) : null;
      const settings = ui?.settings || {};
      const showAuraRings = settings.showAuraRings !== false;
      const showAllRanges = settings.showAllRanges === true;
      const bob = Math.sin(time * 2.4 + hash01(t.id) * 10) * 0.7;
      const size = stats?.aura ? 34 : 34;

      if (sprite) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(sprite, t.x - size / 2, t.y - size / 2 + bob, size, size);
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Support towers have an aura ring.
      if (stats?.aura && showAuraRings) {
        const radius = stats.aura.radius ?? 120;
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = "rgba(45,212,191,0.65)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "rgba(56,189,248,0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius * 0.86, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (stats) {
        // Draw a simple turret barrel that points at the last aimed target.
        const angle = Number.isFinite(t.aimAngle) ? t.aimAngle : 0;
        const recoil = clamp(t.animRecoil ?? 0, 0, 1);
        const flash = clamp(t.animFlash ?? 0, 0, 1);
        const len = 16 - recoil * 4;
        const bw = 4;
        const ox = Math.cos(angle);
        const oy = Math.sin(angle);
        const sx = t.x - ox * recoil * 3;
        const sy = t.y - oy * recoil * 3 + bob;
        const ex = sx + ox * len;
        const ey = sy + oy * len;

        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(8,10,18,0.65)";
        ctx.lineWidth = bw + 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.strokeStyle = "rgba(231,236,255,0.85)";
        ctx.lineWidth = bw;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        if (flash > 0) {
          ctx.globalAlpha = 0.65 * flash;
          ctx.fillStyle = "rgba(251,191,36,0.9)";
          ctx.beginPath();
          ctx.arc(ex, ey, 5 + flash * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const tier = getTowerTier(t, def);
      if (tier > 0) {
        const accent = getTowerPathAccent(t, def) ?? color;
        tierOverlays.push({ x: t.x, y: t.y + bob, tier, accent });
      }

      if (showAllRanges && stats && !stats.aura) {
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (state.selectedTowerId === t.id) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
        ctx.stroke();

        if (stats && !stats.aura) {
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Draw tier overlays in a separate pass to avoid flash/recoil affecting them.
    if (tierOverlays.length) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      for (const overlay of tierOverlays) {
        ctx.globalAlpha = 1;
        drawTierPips(ctx, overlay.x, overlay.y + 14, overlay.tier, overlay.accent);
        drawTierCrown(ctx, overlay.x, overlay.y - 14, overlay.tier, overlay.accent);
        drawTierOverlay(ctx, overlay.x, overlay.y, overlay.tier, overlay.accent);
      }
      ctx.restore();
    }

    // Placement ghost.
    if (ui?.ghost) {
      const g = ui.ghost;
      const sprite = g.towerId ? this._sprites.towers[g.towerId] : null;
      const size = 34;
      ctx.globalAlpha = 0.28;
      if (sprite) {
        ctx.drawImage(sprite, g.x - size / 2, g.y - size / 2, size, size);
      } else {
        ctx.fillStyle = g.ok ? "#34d399" : "#fb7185";
        ctx.beginPath();
        ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tile validity highlight.
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = g.ok ? "#34d399" : "#fb7185";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      if (g.range) {
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = g.ok ? "#34d399" : "#fb7185";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawAllies(ctx, world, time) {
    if (!world.allies?.length) return;
    const settings = world?.settings || {};
    const motionMul = settings.reduceMotion ? 0 : 1;
    const showAllyHp = settings.showAllyHealthBars !== false;
    ctx.save();
    for (const a of world.allies) {
      if (!a.alive) continue;
      const sourceTower = a.sourceTowerId ? world.towers.find((t) => t.id === a.sourceTowerId) : null;
      const fallbackDef = a.sourceDefId ? this._towerDefs[a.sourceDefId] : null;
      const sourceDef = sourceTower ? this._towerDefs[sourceTower.defId] : fallbackDef;
      const sigilColor = sourceDef?.color ?? a.color;
      const sigilType = sourceTower?.defId ?? a.sourceDefId ?? a.defId ?? "default";
      const bob = Math.sin(time * 3.4 + hash01(a.id) * 8) * 1.2 * motionMul;
      const size = 18;
      ctx.save();
      ctx.translate(a.x, a.y + bob);
      ctx.rotate(a.aimAngle || 0);
      ctx.fillStyle = a.color || "rgba(52,211,153,0.9)";
      ctx.globalAlpha = 0.95;
      drawAllyBody(ctx, sigilType, size);

      if (sigilColor) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = withAlpha(sigilColor, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        drawAllySigil(ctx, sigilType, size * 0.5, sigilColor);
      }

      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(8,10,18,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.7, 0);
      ctx.stroke();

      if (a.animFlash > 0) {
        ctx.globalAlpha = 0.6 * a.animFlash;
        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.beginPath();
        ctx.arc(size * 0.8, 0, 4 + a.animFlash * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (showAllyHp) {
        const t = a.maxHp > 0 ? a.hp / a.maxHp : 0;
        drawHealthBar(ctx, a.x - 10, a.y + bob - 14, 20, 4, t, "#34d399");
      }
    }
    ctx.restore();
  }

  _drawEnemies(ctx, world, time) {
    const settings = world?.settings || {};
    const motionMul = settings.reduceMotion ? 0 : 1;
    const showEnemyHp = settings.showEnemyHealthBars !== false;
    const showStatusGlyphs = settings.showStatusGlyphs !== false;
    const showStatusAuras = settings.showStatusAuras !== false;
    const showBossRings = settings.showBossRings !== false;
    ctx.save();
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const def = this._enemyDefs[e.defId];
      const color = def?.color ?? "#fbbf24";
      const sprite = this._sprites.enemies[e.defId];
      const phase = hash01(e.id);
      const bob = Math.sin(time * 4.2 + phase * 10) * 1.6 * motionMul;
      const tilt = Math.sin(time * 3.1 + phase * 12) * 0.08 * motionMul;
      const size = Math.max(22, e.radius * 2 + 16);

      if (sprite) {
        ctx.save();
        ctx.translate(e.x, e.y + bob);
        ctx.rotate(tilt);
        ctx.globalAlpha = 0.96;
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e._phase2Transition) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(time * 6 + phase * 6);
        ctx.translate(e.x, e.y + bob);
        ctx.rotate(time * 1.6);
        ctx.globalAlpha = 0.45 + pulse * 0.25;
        ctx.strokeStyle = "rgba(129,140,248,0.9)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 14 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(244,114,182,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (e.defId === "void_emperor") {
        ctx.save();
        const phaseLevel = e.phase ?? 1;
        const glow = phaseLevel >= 2 ? "rgba(244,114,182,0.55)" : "rgba(99,102,241,0.5)";
        const arc = phaseLevel >= 2 ? "rgba(56,189,248,0.65)" : "rgba(14,165,233,0.6)";
        const spin = time * (phaseLevel >= 2 ? 1.4 : 0.9);
        ctx.translate(e.x, e.y + bob);
        ctx.rotate(spin);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 14 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = arc;
        for (let i = 0; i < 4; i++) {
          const ang = spin + i * (Math.PI / 2);
          const px = Math.cos(ang) * (e.radius + 10);
          const py = Math.sin(ang) * (e.radius + 10);
          ctx.beginPath();
          ctx.arc(px, py, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (phaseLevel >= 2) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 5 + phase * 4);
          const glowR = e.radius + 16 + pulse * 6;
          ctx.save();
          ctx.translate(e.x, e.y + bob);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
          g.addColorStop(0, "rgba(244,114,182,0.55)");
          g.addColorStop(0.55, "rgba(56,189,248,0.25)");
          g.addColorStop(1, "rgba(56,189,248,0)");
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, glowR, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = "rgba(56,189,248,0.85)";
          ctx.lineWidth = 2;
          const spikes = 6;
          for (let i = 0; i < spikes; i++) {
            const ang = time * 1.8 + i * ((Math.PI * 2) / spikes);
            const inner = e.radius + 10;
            const outer = inner + 8 + pulse * 6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
            ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            ctx.stroke();
          }

          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "rgba(251,113,133,0.9)";
          ctx.beginPath();
          ctx.arc(0, 0, 5 + pulse * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (e._phase2Transition) {
          const shift = e._phase2Transition;
          const progress = shift.total > 0 ? clamp(1 - shift.remaining / shift.total, 0, 1) : 1;
          const pulse = 0.5 + 0.5 * Math.sin(time * 5 + phase * 8);
          const swirlSpeed = (2.2 + progress * 1.2) * motionMul;
          ctx.save();
          ctx.translate(e.x, e.y + bob);
          ctx.rotate(time * swirlSpeed);
          ctx.globalAlpha = 0.35 + pulse * 0.35;
          ctx.strokeStyle = "rgba(56,189,248,0.85)";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 22 + progress * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.35 + progress * 0.4;
          ctx.strokeStyle = "rgba(244,114,182,0.75)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const shards = 8;
          for (let i = 0; i < shards; i++) {
            const ang = (Math.PI * 2 * i) / shards + time * 1.1;
            const inner = e.radius + 10;
            const outer = inner + 14 + 6 * Math.sin(time * 3 + i);
            ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
            ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
          }
          ctx.stroke();
          ctx.restore();

          if (shift.anchor) {
            const anchor = shift.anchor;
            const anchorRadius = shift.anchorRadius ?? Math.max(110, e.radius * 6);
            ctx.save();
            ctx.globalAlpha = 0.35 + pulse * 0.35;
            ctx.strokeStyle = "rgba(56,189,248,0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 10]);
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + bob);
            ctx.lineTo(anchor.x, anchor.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.3 + pulse * 0.25;
            ctx.strokeStyle = "rgba(129,140,248,0.75)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(anchor.x, anchor.y, anchorRadius * (0.65 + 0.08 * Math.sin(time * 4)), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (showBossRings && e.tags?.has?.("boss")) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(251,113,133,0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showBossRings && e.tags?.has?.("elite") && !e.tags?.has?.("boss")) {
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = "rgba(251,191,36,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.shield > 0) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "rgba(106,164,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showStatusAuras && e.effects.length) {
        const aura = effectAuraColor(e.effects[0]?.type);
        if (aura) {
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = aura;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y + bob, e.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Health bar
      if (showEnemyHp) {
        const t = e.maxHp > 0 ? e.hp / e.maxHp : 0;
        const barX = e.x - 16;
        const barY = e.y + bob - e.radius - 12;
        drawHealthBar(ctx, barX, barY, 32, 5, t);
        if (e.shield > 0) {
          drawShieldBadge(ctx, barX, barY - 12, e.shield);
        }
      }

      // Status icons
      if (showStatusGlyphs && e.effects.length) {
        const sorted = [...e.effects].sort((a, b) => effectSortPriority(a.type) - effectSortPriority(b.type));
        const shown = sorted.slice(0, 4);
        const size = 16;
        const gap = 3;
        const total = shown.length * size + (shown.length - 1) * gap;
        const startX = e.x - total / 2 + size / 2;
        const y = e.y + bob + e.radius + 14;
        for (let i = 0; i < shown.length; i++) {
          drawEffectIcon(ctx, shown[i].type, startX + i * (size + gap), y, size);
        }
        const remaining = sorted.length - shown.length;
        if (remaining > 0) {
          const extraX = startX + shown.length * (size + gap) + size * 0.3;
          const r = size * 0.42;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "rgba(8,10,18,0.75)";
          ctx.strokeStyle = "rgba(231,236,255,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(extraX, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "rgba(231,236,255,0.9)";
          ctx.font = "9px ui-sans-serif, system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`+${remaining}`, extraX, y + 0.5);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  _drawProjectiles(ctx, world) {
    if (world?.settings?.showProjectiles === false) return;
    ctx.save();
    ctx.globalAlpha = 0.95;
    for (const p of world.projectiles) {
      const c = projectileColor(p.damageType);
      const prevX = typeof p.prevX === "number" ? p.prevX : p.x;
      const prevY = typeof p.prevY === "number" ? p.prevY : p.y;

      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawVfx(ctx, world, time) {
    if (!world.vfx?.length) return;
    const settings = world?.settings || null;
    const scale = settings?.vfxScale ?? 1;
    const motionMul = settings?.reduceMotion ? 0.25 : 1;
    if (scale <= 0) return;
    ctx.save();
    for (const v of world.vfx) {
      const t = 1 - v.life / v.maxLife;
      if (v.type === "explosion") {
        const r = v.radius * (0.6 + 0.8 * t) * scale;
        const alpha = Math.max(0, (0.9 - t) * scale);
        const g = ctx.createRadialGradient(v.x, v.y, r * 0.1, v.x, v.y, r);
        g.addColorStop(0, withAlpha(v.color, 0.8 * alpha));
        g.addColorStop(1, withAlpha(v.color, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.4 * alpha;
        ctx.strokeStyle = withAlpha(v.color, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.type === "hit") {
        const r = v.radius * (0.4 + 0.8 * t) * scale;
        ctx.globalAlpha = (0.7 - t * 0.6) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.type === "zap") {
        const jitter = ((Math.sin(time * 40 + t * 10) * 3) || 0) * motionMul;
        ctx.globalAlpha = (0.9 - t * 0.8) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(v.x1, v.y1);
        ctx.lineTo((v.x1 + v.x2) / 2 + jitter, (v.y1 + v.y2) / 2 - jitter);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();

        ctx.globalAlpha = (0.35 - t * 0.3) * scale;
        ctx.lineWidth = 6;
        ctx.stroke();
      } else if (v.type === "pulse") {
        const r = v.radius * (0.5 + 0.9 * t) * scale;
        ctx.globalAlpha = (0.5 - t * 0.45) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = (0.2 - t * 0.18) * scale;
        ctx.lineWidth = 8;
        ctx.stroke();
      } else if (v.type === "void_aura") {
        const r = v.radius * (0.55 + 0.5 * t) * scale;
        const pulse = 0.5 + 0.5 * Math.sin(time * 4 + t * 6);
        ctx.globalAlpha = (0.55 - t * 0.5) * scale;
        ctx.strokeStyle = withAlpha(v.color ?? "rgba(129,140,248,0.9)", 0.9);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * (0.9 + pulse * 0.1), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = (0.35 - t * 0.3) * scale;
        ctx.strokeStyle = withAlpha(v.accent ?? "rgba(244,114,182,0.8)", 0.8);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = (0.45 - t * 0.4) * scale;
        ctx.fillStyle = withAlpha(v.accent ?? "rgba(244,114,182,0.8)", 0.7);
        const orbs = 6;
        for (let i = 0; i < orbs; i++) {
          const ang = time * 1.2 + (Math.PI * 2 * i) / orbs;
          const px = v.x + Math.cos(ang) * (r * 0.5);
          const py = v.y + Math.sin(ang) * (r * 0.5);
          ctx.beginPath();
          ctx.arc(px, py, 2.2 + pulse * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (v.type === "rift_spark") {
        const r = (v.radius ?? 6) * (0.6 + 0.6 * t) * scale;
        const alpha = Math.max(0, (0.75 - t * 0.7) * scale);
        const rot = (v.rotation ?? 0) + time * (v.spin ?? 2.2);
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = withAlpha(v.color ?? "rgba(129,140,248,0.9)", 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = withAlpha(v.accent ?? "rgba(244,114,182,0.9)", 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (v.type === "telegraph") {
        const teleScale = Math.max(0.7, scale);
        const r = v.radius * (0.6 + 0.4 * t) * teleScale;
        ctx.globalAlpha = (0.35 + t * 0.25) * teleScale;
        ctx.strokeStyle = withAlpha(v.color, 0.8);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (v.type === "beam") {
        const jitter = ((Math.sin(time * 50 + t * 12) * 2) || 0) * motionMul;
        const mx = (v.x1 + v.x2) / 2 + jitter;
        const my = (v.y1 + v.y2) / 2 - jitter;
        const w = Math.max(1.5, (v.width ?? 3) * scale);
        ctx.globalAlpha = (0.85 - t * 0.7) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(v.x1, v.y1);
        ctx.lineTo(mx, my);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();

        ctx.globalAlpha = (0.25 - t * 0.2) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.6);
        ctx.lineWidth = w * 2.2;
        ctx.beginPath();
        ctx.moveTo(v.x1, v.y1);
        ctx.lineTo(mx, my);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();
      } else if (v.type === "boss_death") {
        const rings = Math.max(1, v.rings ?? 3);
        const shards = Math.max(8, v.shards ?? 12);
        const r = (v.radius ?? 200) * (0.5 + 0.6 * t) * scale;
        const accent = v.accent ?? "rgba(231,236,255,0.75)";
        ctx.globalAlpha = (0.8 - t * 0.7) * scale;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 3;
        for (let i = 0; i < rings; i++) {
          const rr = r * (0.5 + i * 0.28);
          ctx.beginPath();
          ctx.arc(v.x, v.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = (0.6 - t * 0.5) * scale;
        ctx.strokeStyle = withAlpha(accent, 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < shards; i++) {
          const ang = (Math.PI * 2 * i) / shards + t * 1.2;
          const inner = r * 0.35;
          const outer = r * (0.85 + 0.2 * Math.sin(t * 6 + i));
          ctx.moveTo(v.x + Math.cos(ang) * inner, v.y + Math.sin(ang) * inner);
          ctx.lineTo(v.x + Math.cos(ang) * outer, v.y + Math.sin(ang) * outer);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _renderBossBar(world, settings = {}, state = null, ui = null, map = null) {
    if (!this._bossCanvas || !this._bossCtx) {
      if (settings.showBossBar !== false) {
        this._drawBossBar(this._ctx, world, { state, mode: ui?.modeInfo || null, map, status: ui?.status || null });
      }
      return;
    }

    const boss = world?.enemies?.find?.((e) => e.alive && e.tags?.has?.("boss"));
    const shouldShow = settings.showBossBar !== false;
    const el = this._bossCanvas;

    if (!shouldShow) {
      if (!el.classList.contains("is-hidden")) el.classList.add("is-hidden");
      this._bossCtx.clearRect(0, 0, el.width, el.height);
      return;
    }

    const layout = this._getBossBarLayout();
    const targetWidth = this._canvas.width;
    if (el.width !== targetWidth) el.width = targetWidth;
    if (el.height !== layout.height) el.height = layout.height;
    if (el.classList.contains("is-hidden")) el.classList.remove("is-hidden");

    this._bossCtx.clearRect(0, 0, el.width, el.height);
    this._drawBossBar(this._bossCtx, world, {
      boss,
      width: el.width,
      height: layout.height,
      pad: layout.pad,
      state,
      mode: ui?.modeInfo || null,
      map,
      status: ui?.status || null,
    });
  }

  _getBossBarMetrics(boss, opts = {}) {
    const rawPending = boss?._pendingAbilities?.length ? boss._pendingAbilities : [];
    const pendingList = rawPending
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const ar = Number.isFinite(a.item?.remaining) ? a.item.remaining : Number.POSITIVE_INFINITY;
        const br = Number.isFinite(b.item?.remaining) ? b.item.remaining : Number.POSITIVE_INFINITY;
        if (ar !== br) return ar - br;
        return a.idx - b.idx;
      })
      .map(({ item }) => item);
    const maxRows = opts.maxRows ?? 2;
    const rowH = opts.rowH ?? 24;
    const pendingRows = Math.min(maxRows, pendingList.length);
    const extraCount = Math.max(0, pendingList.length - pendingRows);
    return { pendingList, pendingRows, extraCount, rowH };
  }

  _getBossBarLayout(opts = {}) {
    const pad = opts.pad ?? 10;
    const height = opts.height ?? BOSS_BAR_CANVAS_HEIGHT;
    return { pad, height };
  }

  _drawBossBar(ctx, world, opts = {}) {
    const boss = opts.boss ?? world.enemies.find((e) => e.alive && e.tags?.has?.("boss"));
    const state = opts.state || null;
    const mode = opts.mode || null;
    const map = opts.map || null;
    const status = opts.status || null;
    const time = Number.isFinite(state?.time) ? state.time : 0;
    const hasBoss = Boolean(boss);

    const w = opts.width ?? this._canvas.width;
    const height = opts.height ?? BOSS_BAR_CANVAS_HEIGHT;
    const pad = opts.pad ?? 10;
    const barW = Math.round(w * 0.64);
    const barH = 12;
    const headerH = 24;
    const sectionGap = 10;
    const innerPad = 16;
    const x = Math.round((w - barW) / 2);
    const y = pad;
    const panelH = Math.max(0, height - pad * 2);
    const innerX = x + innerPad;
    const innerW = barW - innerPad * 2;
    const headerY = y + 6;
    const headerMid = headerY + headerH / 2;
    const barY = headerY + headerH + 6;
    const pendingStartY = barY + barH + sectionGap;
    const hasPhaseShift = hasBoss && Boolean(boss._phase2Transition);
    const phaseRowH = hasPhaseShift ? 14 : 0;
    const phaseRowGap = hasPhaseShift ? 4 : 0;
    const abilityStartY = pendingStartY + phaseRowH + phaseRowGap;
    const abilityAreaH = Math.max(0, y + panelH - abilityStartY - 8);
    const maxAbilityRows = abilityAreaH >= 36 ? 2 : 1;
    const rowH = maxAbilityRows ? Math.max(18, Math.floor(abilityAreaH / maxAbilityRows)) : 0;
    const { pendingList, pendingRows, extraCount } = this._getBossBarMetrics(boss, { maxRows: maxAbilityRows, rowH });
    const def = boss ? this._enemyDefs?.[boss.defId] : null;
    const baseColor = def?.color || "#6aa4ff";
    const parsed = parseHexColor(baseColor);
    let accentMain = baseColor;
    let accentBright = baseColor;
    if (parsed) {
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      accentMain = rgbToCss(hslToRgb(hsl.h, clamp(hsl.s * 0.7, 0.2, 0.6), clamp(hsl.l + 0.06, 0.34, 0.7)));
      accentBright = rgbToCss(hslToRgb(hsl.h, clamp(hsl.s * 0.85, 0.25, 0.7), clamp(hsl.l + 0.18, 0.42, 0.86)));
    }

    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, x - 4, y - 4, barW + 8, panelH, 12);
    const panelGrad = ctx.createLinearGradient(0, y - 4, 0, y - 4 + panelH);
    panelGrad.addColorStop(0, "rgba(18,22,36,0.92)");
    panelGrad.addColorStop(1, "rgba(8,11,20,0.9)");
    ctx.fillStyle = panelGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(231,236,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = withAlpha(accentMain, 0.65);
    roundRect(ctx, x - 1, y + 6, 3, panelH - 12, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (hasBoss) {
      const pct = boss.maxHp > 0 ? clamp(boss.hp / boss.maxHp, 0, 1) : 0;
      roundRect(ctx, innerX, barY, innerW, barH, 6);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fill();
      roundRect(ctx, innerX, barY, innerW * pct, barH, 6);
      const hpGrad = ctx.createLinearGradient(innerX, barY, innerX + innerW, barY);
      hpGrad.addColorStop(0, withAlpha(accentBright, 0.95));
      hpGrad.addColorStop(1, withAlpha(accentMain, 0.85));
      ctx.fillStyle = hpGrad;
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      roundRect(ctx, innerX + 2, barY + 2, Math.max(0, innerW * pct - 4), Math.max(2, barH * 0.45), 5);
      ctx.fill();
      ctx.restore();

      // Shield overlay (if any)
      if (boss.shield > 0) {
        const shieldPct = clamp(boss.shield / Math.max(1, boss.maxHp * 0.25), 0, 1);
        roundRect(ctx, innerX, barY + barH - 3, innerW * shieldPct, 3, 4);
        ctx.fillStyle = "rgba(96,165,250,0.92)";
        ctx.fill();
      }

      ctx.fillStyle = "rgba(231,236,255,0.92)";
      ctx.font = "600 12px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const phaseLabel = boss.phase && boss.phase > 1 ? ` — PHASE ${boss.phase}` : "";
      const badgeText = "BOSS";
      const badgePad = 6;
      const badgeW = Math.ceil(ctx.measureText(badgeText).width + badgePad * 2);
      const badgeH = 14;
      roundRect(ctx, innerX, headerMid - badgeH / 2, badgeW, badgeH, badgeH / 2);
      ctx.fillStyle = withAlpha(accentMain, 0.9);
      ctx.fill();
      ctx.fillStyle = "rgba(10,12,18,0.9)";
      ctx.fillText(badgeText, innerX + badgePad, headerMid);

      const hpText = `${Math.round(boss.hp)}/${boss.maxHp}`;
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(231,236,255,0.86)";
      ctx.fillText(hpText, innerX + innerW, headerMid);
      const hpWidth = ctx.measureText(hpText).width;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(231,236,255,0.95)";
      const nameMax = Math.max(40, innerW - badgeW - hpWidth - 20);
      const nameText = truncateText(ctx, `${boss.name}${phaseLabel}`, nameMax);
      ctx.fillText(nameText, innerX + badgeW + 10, headerMid);

      if (hasPhaseShift && phaseRowH > 0) {
        const shift = boss._phase2Transition;
        const shiftPct = shift?.total > 0 ? clamp(1 - shift.remaining / shift.total, 0, 1) : 1;
        const remaining = Math.max(0, shift?.remaining ?? 0);
        ctx.font = "10px ui-sans-serif, system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const shiftLabel = `Phase Shift: Rewinding (${remaining.toFixed(1)}s)`;
        ctx.fillStyle = "rgba(191,219,254,0.9)";
        ctx.fillText(truncateText(ctx, shiftLabel, innerW - 6), innerX, pendingStartY);
        const barLineY = pendingStartY + phaseRowH - 4;
        ctx.fillStyle = "rgba(231,236,255,0.12)";
        ctx.fillRect(innerX, barLineY, innerW, 2);
        ctx.fillStyle = "rgba(56,189,248,0.92)";
        ctx.fillRect(innerX, barLineY, innerW * shiftPct, 2);
        ctx.textBaseline = "middle";
      }

      if (pendingRows && rowH > 0) {
        ctx.font = "10px ui-sans-serif, system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        for (let i = 0; i < pendingRows; i++) {
          const pending = pendingList[i];
          const castPct = pending?.total > 0 ? clamp(1 - pending.remaining / pending.total, 0, 1) : 0;
          const cy = abilityStartY + i * rowH;
          const label = pending?.label || "Ability";
          const prefix = i === 0 ? "Casting" : "Queued";
          const labelText = truncateText(ctx, `${prefix}: ${label}`, innerW - 6);
          ctx.fillStyle = "rgba(231,236,255,0.78)";
          ctx.fillText(labelText, innerX, cy);
          const barLineY = cy + rowH - 5;
          ctx.fillStyle = "rgba(231,236,255,0.12)";
          ctx.fillRect(innerX, barLineY, innerW, 2);
          ctx.fillStyle = i === 0 ? "rgba(251,191,36,0.92)" : withAlpha(accentMain, 0.85);
          ctx.fillRect(innerX, barLineY, innerW * castPct, 2);
        }
        const extraY = abilityStartY + pendingRows * rowH;
        if (extraCount > 0 && extraY + 10 < y + panelH - 2) {
          ctx.fillStyle = "rgba(148,163,184,0.7)";
          ctx.fillText(`+${extraCount} queued`, innerX, extraY);
        }
        ctx.textBaseline = "middle";
      }
    } else {
      const waveNumber = Number.isFinite(status?.wave) ? status.wave : Number.isFinite(state?.waveNumber) ? state.waveNumber : 0;
      const waveGoal = status?.waveGoal ?? mode?.totalWaves ?? null;
      const waveActive = Boolean(status?.inWave ?? state?.inWave);
      const currentWave = waveNumber + (waveActive ? 1 : 0);
      const paused = Boolean(status?.paused ?? state?.paused);
      const auto = Boolean(status?.auto ?? state?.autoNextWave);
      const modifiersCount = status?.modifiersCount ?? 0;
      const mapName = map?.name || "Unknown Map";
      const modeName = mode?.name || "Run";

      ctx.font = "600 12px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(231,236,255,0.92)";
      const rightWidth = ctx.measureText(modeName).width;
      const leftMax = Math.max(60, innerW - rightWidth - 12);
      ctx.fillText(truncateText(ctx, mapName, leftMax), innerX, headerMid);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(231,236,255,0.78)";
      ctx.fillText(modeName, innerX + innerW, headerMid);

      const threat = status?.threat ?? null;
      const spawnPending = Boolean(status?.spawnPending);
      const spawnRemaining = Number.isFinite(status?.spawnRemaining) ? status.spawnRemaining : null;
      const spawnTotal = Number.isFinite(status?.spawnTotal) ? status.spawnTotal : null;
      const bossEvery = mode?.bossEvery ?? null;

      let waveProgress = 0;
      if (waveActive) {
        if (spawnTotal && spawnTotal > 0) {
          waveProgress = clamp(1 - (spawnRemaining ?? 0) / spawnTotal, 0, 1);
        } else {
          waveProgress = spawnPending ? 0 : 1;
        }
      }

      let progress = 0;
      let progressLabel = "";
      const waveProgressIndex = waveActive ? currentWave - 1 + waveProgress : currentWave;
      if (waveGoal) {
        progress = clamp(waveProgressIndex / waveGoal, 0, 1);
        progressLabel = `Run ${Math.round(progress * 100)}%`;
      } else if (bossEvery && bossEvery > 0) {
        const cycleProgress = (waveProgressIndex % bossEvery) / bossEvery;
        progress = clamp(cycleProgress, 0, 1);
        const mod = currentWave % bossEvery;
        const wavesUntilBoss = mod === 0 ? 0 : bossEvery - mod;
        progressLabel = wavesUntilBoss === 0 ? "Boss now" : `Boss in ${wavesUntilBoss}w`;
      } else {
        progress = waveProgress;
        progressLabel = waveActive ? `Wave ${Math.round(progress * 100)}%` : "";
      }

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, innerX, barY, innerW, barH, 6);
      ctx.fill();
      if (progress > 0) {
        roundRect(ctx, innerX, barY, innerW * progress, barH, 6);
        const progGrad = ctx.createLinearGradient(innerX, barY, innerX + innerW, barY);
        progGrad.addColorStop(0, withAlpha(accentBright, 0.9));
        progGrad.addColorStop(1, withAlpha(accentMain, 0.8));
        ctx.fillStyle = progGrad;
        ctx.fill();
      }
      if (progress > 0 && progress < 1) {
        const notchX = innerX + innerW * progress;
        ctx.strokeStyle = "rgba(231,236,255,0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(notchX, barY + 2);
        ctx.lineTo(notchX, barY + barH - 2);
        ctx.stroke();
      }

      const waveLabel = waveGoal ? `Wave ${currentWave} / ${waveGoal}` : `Wave ${currentWave}`;
      let statusText = paused ? "Paused" : waveActive ? "In Wave" : "Intermission";
      if (spawnPending && spawnRemaining != null) {
        const display = spawnRemaining >= 10 ? Math.ceil(spawnRemaining) : Math.max(0.1, Math.ceil(spawnRemaining * 10) / 10);
        statusText = `Spawning (${display}s)`;
      } else if (waveActive && !spawnPending) {
        statusText = "Spawns complete";
      }
      const leftLine = `${waveLabel} · ${statusText}`;
      const rightLine = `${auto ? "Auto: On" : "Auto: Off"}${progressLabel ? ` · ${progressLabel}` : ""}`;

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = "10px ui-sans-serif, system-ui";
      ctx.fillStyle = "rgba(231,236,255,0.8)";
      const rightLineWidth = ctx.measureText(rightLine).width;
      const leftLineMax = Math.max(60, innerW - rightLineWidth - 10);
      ctx.fillText(truncateText(ctx, leftLine, leftLineMax), innerX, abilityStartY);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(148,163,184,0.75)";
      ctx.fillText(rightLine, innerX + innerW, abilityStartY);
      const line2Y = abilityStartY + 16;
      if (line2Y + 10 < y + panelH - 2) {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(148,163,184,0.78)";
        const threatText = `Threat: ${threat == null ? "-" : threat}`;
        ctx.fillText(truncateText(ctx, threatText, innerW - 6), innerX, line2Y);
        ctx.textAlign = "right";
        const modsText = `Mods: ${modifiersCount}`;
        ctx.fillText(truncateText(ctx, modsText, innerW - 6), innerX + innerW, line2Y);
      }
      ctx.textBaseline = "middle";
    }
    ctx.restore();
  }

  _drawHud(ctx, state, world) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(231,236,255,0.85)";
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.fillText(`Money: ${state.money}`, 10, 18);
    ctx.fillText(`Lives: ${state.lives}`, 10, 36);
    ctx.fillText(`Wave: ${state.waveNumber}`, 10, 54);
    ctx.fillText(`Summons: ${world.allies?.length ?? 0}`, 10, 72);
    ctx.restore();
  }
}

function projectileColor(type) {
  const t = String(type || "physical").toLowerCase();
  if (t === "fire" || t === "burn") return "rgba(251,146,60,0.9)";
  if (t === "ice") return "rgba(96,165,250,0.9)";
  if (t === "poison") return "rgba(52,211,153,0.9)";
  if (t === "arcane") return "rgba(167,139,250,0.9)";
  if (t === "lightning") return "rgba(125,211,252,0.9)";
  return "rgba(231,236,255,0.9)";
}

function getTowerTier(tower, def) {
  if (!def?.upgrades?.length || !tower?.appliedUpgrades?.size) return 0;
  let tier = 0;
  for (const up of def.upgrades) {
    if (tower.appliedUpgrades.has(up.id)) tier = Math.max(tier, up.tier ?? 0);
  }
  return tier;
}

function getTowerPathAccent(tower, def) {
  if (!def?.upgrades?.length || !tower?.appliedUpgrades?.size) return null;
  const tier1 = def.upgrades.filter((u) => (u.tier ?? 1) === 1);
  if (!tier1.length) return null;
  const chosen = tier1.find((u) => tower.appliedUpgrades.has(u.id));
  if (!chosen) return null;
  const idx = Math.max(0, tier1.indexOf(chosen));
  const palette = getTowerPathPalette(def, tier1.length);
  return palette[idx % palette.length] ?? def?.color ?? "#60a5fa";
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

function drawTierPips(ctx, x, y, tier, color) {
  const count = Math.min(5, tier);
  const radius = 12;
  const start = Math.PI * 0.85;
  const end = Math.PI * 0.15;
  ctx.save();
  ctx.fillStyle = withAlpha(color, 0.9);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ang = start + (end - start) * t;
    const px = x + Math.cos(ang) * radius;
    const py = y + Math.sin(ang) * radius;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTierCrown(ctx, x, y, tier, color) {
  if (tier <= 0) return;
  const t = Math.min(5, tier);
  const baseW = 8 + t * 0.6;
  const baseH = 3 + t * 0.25;
  const spikeH = 4 + t * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = withAlpha(color, 0.9);
  ctx.strokeStyle = "rgba(8,10,18,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - baseW * 0.5, y + baseH * 0.5);
  ctx.lineTo(x - baseW * 0.35, y - spikeH * 0.4);
  ctx.lineTo(x - baseW * 0.05, y + baseH * 0.1);
  ctx.lineTo(x, y - spikeH);
  ctx.lineTo(x + baseW * 0.05, y + baseH * 0.1);
  ctx.lineTo(x + baseW * 0.35, y - spikeH * 0.4);
  ctx.lineTo(x + baseW * 0.5, y + baseH * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (tier >= 3) {
    ctx.fillStyle = "rgba(251,191,36,0.9)";
    ctx.beginPath();
    ctx.arc(x, y - spikeH * 0.3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 2) {
    ctx.fillStyle = "rgba(231,236,255,0.85)";
    ctx.beginPath();
    ctx.arc(x, y - spikeH * 0.15, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTierOverlay(ctx, x, y, tier, color) {
  const c = withAlpha(color, 0.7);
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  if (tier >= 1) {
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (tier >= 2) {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 5);
    ctx.lineTo(x - 3, y - 10);
    ctx.lineTo(x + 3, y - 10);
    ctx.lineTo(x + 8, y - 5);
    ctx.lineTo(x + 8, y + 5);
    ctx.lineTo(x + 3, y + 10);
    ctx.lineTo(x - 3, y + 10);
    ctx.lineTo(x - 8, y + 5);
    ctx.closePath();
    ctx.stroke();
  }
  if (tier >= 3) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = withAlpha(color, 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y - 13);
    ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x + 13, y);
    ctx.lineTo(x + 5, y + 5);
    ctx.lineTo(x, y + 13);
    ctx.lineTo(x - 5, y + 5);
    ctx.lineTo(x - 13, y);
    ctx.lineTo(x - 5, y - 5);
    ctx.closePath();
    ctx.fill();
  }
  if (tier >= 4) {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = withAlpha(color, 0.85);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawShieldBadge(ctx, x, y, shield) {
  const value = Math.max(0, Math.round(shield));
  const label = value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${value}`;
  ctx.save();
  ctx.font = "9px ui-monospace, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const padX = 4;
  const icon = 7;
  const gap = 2;
  const textW = ctx.measureText(label).width;
  const w = padX * 2 + icon + gap + textW;
  const h = 10;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = "rgba(15,23,42,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96,165,250,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const cx = x + padX + icon * 0.5;
  const cy = y + h * 0.5;
  ctx.fillStyle = "rgba(96,165,250,0.9)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.5);
  ctx.lineTo(cx + 3, cy - 1);
  ctx.lineTo(cx + 2, cy + 3.5);
  ctx.lineTo(cx, cy + 4.8);
  ctx.lineTo(cx - 2, cy + 3.5);
  ctx.lineTo(cx - 3, cy - 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(231,236,255,0.92)";
  ctx.fillText(label, x + padX + icon + gap, cy + 0.2);
  ctx.restore();
}

function truncateText(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function hash01(s) {
  // Deterministic hash -> [0,1). Good enough for animation phase offsets.
  const str = String(s || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function withAlpha(color, a) {
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\(([^)]+)\)/, (m, inner) => {
      const parts = inner.split(",").map((p) => p.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    });
  }
  if (color.startsWith("rgb")) {
    return color.replace(/rgb\(([^)]+)\)/, (m, inner) => `rgba(${inner}, ${a})`);
  }
  return color;
}

function drawAllySigil(ctx, type, size, color) {
  ctx.save();
  ctx.strokeStyle = withAlpha(color, 0.9);
  ctx.fillStyle = withAlpha(color, 0.75);
  ctx.lineWidth = 2;
  if (type === "summoner") {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(size * 0.2, 0);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(-size * 0.2, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (type === "dronebay") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, -size * 0.22);
    ctx.lineTo(size * 0.06, -size * 0.04);
    ctx.lineTo(-size * 0.04, -size * 0.04);
    ctx.lineTo(size * 0.12, size * 0.22);
    ctx.stroke();
  } else if (type === "marshal") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, -size * 0.05);
    ctx.lineTo(0, size * 0.18);
    ctx.lineTo(size * 0.18, -size * 0.05);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAllyBody(ctx, type, size) {
  const t = String(type || "");
  ctx.beginPath();
  if (t === "summoner") {
    ctx.moveTo(-size * 0.4, 0);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.5);
  } else if (t === "dronebay") {
    ctx.moveTo(-size * 0.45, -size * 0.1);
    ctx.lineTo(size * 0.2, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(size * 0.2, size * 0.5);
    ctx.lineTo(-size * 0.45, size * 0.1);
  } else if (t === "marshal") {
    ctx.moveTo(-size * 0.35, -size * 0.4);
    ctx.lineTo(size * 0.35, -size * 0.4);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.45, 0);
  } else if (t === "beacon" || t === "banner") {
    ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-size * 0.4, -size * 0.2);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(size * 0.4, -size * 0.2);
    ctx.lineTo(size * 0.2, size * 0.4);
    ctx.lineTo(-size * 0.2, size * 0.4);
  }
  ctx.closePath();
  ctx.fill();
}
