import { clamp } from "../core/math.js";
import { buildSprites } from "./sprites.js";

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

function effectGlyph(type) {
  if (type === "slow") return "S";
  if (type === "burn") return "B";
  if (type === "poison") return "P";
  if (type === "stun") return "!";
  if (type === "armor_reduction") return "A";
  if (type === "vulnerability") return "V";
  if (type === "bleed") return "D";
  if (type === "haste") return "H";
  return "?";
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
  return null;
}

export class Renderer {
  constructor({ canvas, towerDefs, enemyDefs }) {
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d", { alpha: false });
    this._towerDefs = towerDefs;
    this._enemyDefs = enemyDefs;
    this._sprites = buildSprites({ towerDefs, enemyDefs });
  }

  render({ map, world, state, ui }) {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const time = state?.time ?? 0;

    // Background
    ctx.fillStyle = "#0b1022";
    ctx.fillRect(0, 0, w, h);

    if (!map) {
      ctx.fillStyle = "rgba(231,236,255,0.8)";
      ctx.font = "16px ui-sans-serif, system-ui";
      ctx.fillText("Loading…", 18, 28);
      return;
    }

    this._drawGrid(ctx, map);
    this._drawPaths(ctx, map);
    this._drawDecor(ctx, map);
    this._drawBase(ctx, map);
    this._drawTowers(ctx, map, world, state, ui, time);
    this._drawAllies(ctx, world, time);
    this._drawProjectiles(ctx, world);
    this._drawEnemies(ctx, world, time);
    this._drawVfx(ctx, world, time);

    this._drawBossBar(ctx, world);
    this._drawHud(ctx, state, world);
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

  _drawPaths(ctx, map) {
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

    ctx.strokeStyle = "rgba(106,164,255,0.55)";
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
    ctx.restore();
  }

  _drawTowers(ctx, map, world, state, ui, time) {
    ctx.save();
    for (const t of world.towers) {
      const def = this._towerDefs[t.defId];
      const color = def?.color ?? "#e7ecff";
      const sprite = this._sprites.towers[t.defId];

      const stats = def ? t.computeStats(def, { modifiers: world.modifiers }) : null;
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
      if (stats?.aura) {
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, stats.aura.radius ?? 120, 0, Math.PI * 2);
        ctx.stroke();
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
    ctx.save();
    for (const a of world.allies) {
      if (!a.alive) continue;
      const bob = Math.sin(time * 3.4 + hash01(a.id) * 8) * 1.2;
      const size = 18;
      ctx.save();
      ctx.translate(a.x, a.y + bob);
      ctx.rotate(a.aimAngle || 0);
      ctx.fillStyle = a.color || "rgba(52,211,153,0.9)";
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, 0);
      ctx.lineTo(0, -size * 0.5);
      ctx.lineTo(size * 0.4, 0);
      ctx.lineTo(0, size * 0.5);
      ctx.closePath();
      ctx.fill();

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

      const t = a.maxHp > 0 ? a.hp / a.maxHp : 0;
      drawHealthBar(ctx, a.x - 10, a.y + bob - 14, 20, 4, t, "#34d399");
    }
    ctx.restore();
  }

  _drawEnemies(ctx, world, time) {
    ctx.save();
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const def = this._enemyDefs[e.defId];
      const color = def?.color ?? "#fbbf24";
      const sprite = this._sprites.enemies[e.defId];
      const phase = hash01(e.id);
      const bob = Math.sin(time * 4.2 + phase * 10) * 1.6;
      const tilt = Math.sin(time * 3.1 + phase * 12) * 0.08;
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

      if (e.tags?.has?.("boss")) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(251,113,133,0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.tags?.has?.("elite") && !e.tags?.has?.("boss")) {
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

      if (e.effects.length) {
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
      const t = e.maxHp > 0 ? e.hp / e.maxHp : 0;
      drawHealthBar(ctx, e.x - 16, e.y + bob - e.radius - 12, 32, 5, t);

      // Status glyphs
      if (e.effects.length) {
        ctx.globalAlpha = 0.9;
        ctx.font = "10px ui-monospace, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const shown = e.effects.slice(0, 4);
        for (let i = 0; i < shown.length; i++) {
          const g = effectGlyph(shown[i].type);
          ctx.fillStyle = "rgba(231,236,255,0.85)";
          ctx.fillText(g, e.x - 9 + i * 6, e.y + bob + e.radius + 10);
        }
      }
    }
    ctx.restore();
  }

  _drawProjectiles(ctx, world) {
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
    ctx.save();
    for (const v of world.vfx) {
      const t = 1 - v.life / v.maxLife;
      if (v.type === "explosion") {
        const r = v.radius * (0.6 + 0.8 * t);
        const alpha = Math.max(0, 0.9 - t);
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
        const r = v.radius * (0.4 + 0.8 * t);
        ctx.globalAlpha = 0.7 - t * 0.6;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.type === "zap") {
        const jitter = (Math.sin(time * 40 + t * 10) * 3) || 0;
        ctx.globalAlpha = 0.9 - t * 0.8;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(v.x1, v.y1);
        ctx.lineTo((v.x1 + v.x2) / 2 + jitter, (v.y1 + v.y2) / 2 - jitter);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();

        ctx.globalAlpha = 0.35 - t * 0.3;
        ctx.lineWidth = 6;
        ctx.stroke();
      } else if (v.type === "pulse") {
        const r = v.radius * (0.5 + 0.9 * t);
        ctx.globalAlpha = 0.5 - t * 0.45;
        ctx.strokeStyle = withAlpha(v.color, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.2 - t * 0.18;
        ctx.lineWidth = 8;
        ctx.stroke();
      } else if (v.type === "telegraph") {
        const r = v.radius * (0.6 + 0.4 * t);
        ctx.globalAlpha = 0.35 + t * 0.25;
        ctx.strokeStyle = withAlpha(v.color, 0.8);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  _drawBossBar(ctx, world) {
    const boss = world.enemies.find((e) => e.alive && e.tags?.has?.("boss"));
    if (!boss) return;

    const w = this._canvas.width;
    const pad = 14;
    const barW = Math.round(w * 0.56);
    const barH = 16;
    const x = Math.round((w - barW) / 2);
    const y = pad;

    ctx.save();
    ctx.globalAlpha = 0.95;
    roundRect(ctx, x - 2, y - 2, barW + 4, barH + 22, 10);
    ctx.fillStyle = "rgba(8,10,18,0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(231,236,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const pct = boss.maxHp > 0 ? clamp(boss.hp / boss.maxHp, 0, 1) : 0;
    roundRect(ctx, x, y + 16, barW, barH, 8);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    roundRect(ctx, x, y + 16, barW * pct, barH, 8);
    ctx.fillStyle = "rgba(251,113,133,0.85)";
    ctx.fill();

    // Shield overlay (if any)
    if (boss.shield > 0) {
      const shieldPct = clamp(boss.shield / Math.max(1, boss.maxHp * 0.25), 0, 1);
      roundRect(ctx, x, y + 16, barW * shieldPct, 5, 6);
      ctx.fillStyle = "rgba(96,165,250,0.85)";
      ctx.fill();
    }

    ctx.fillStyle = "rgba(231,236,255,0.9)";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${boss.name} — BOSS`, x + 8, y + 8);

    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(boss.hp)}/${boss.maxHp}`, x + barW - 8, y + 8);

    const pending = boss._pendingAbilities?.[0];
    if (pending && pending.total > 0) {
      const castPct = clamp(1 - pending.remaining / pending.total, 0, 1);
      const cy = y + 38;
      roundRect(ctx, x, cy, barW, 8, 6);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
      roundRect(ctx, x, cy, barW * castPct, 8, 6);
      ctx.fillStyle = "rgba(251,191,36,0.85)";
      ctx.fill();

      ctx.fillStyle = "rgba(231,236,255,0.85)";
      ctx.font = "11px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Casting: ${pending.label || "Ability"}`, x + 6, cy + 14);
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
    ctx.fillText(`Wave: ${state.waveNumber}${state.inWave ? " (active)" : ""}`, 10, 54);
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
  return color;
}
