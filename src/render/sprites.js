function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
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
  return { r: 231, g: 236, b: 255 };
}

function rgbToCss({ r, g, b }, a = 1) {
  return `rgba(${r},${g},${b},${a})`;
}

function withAlpha(color, a) {
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${a})`);
  }
  if (color.startsWith("rgb")) {
    return color.replace(/rgb\(([^,]+),([^,]+),([^,]+)\)/, `rgba($1,$2,$3,${a})`);
  }
  return color;
}

function mix(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function drawSoftShadow(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx, cy + r * 0.6, r * 0.2, cx, cy + r * 0.6, r * 1.3);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.75, r * 1.05, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(ctx, cx, cy, r, base) {
  const dark = mix(base, { r: 10, g: 12, b: 24 }, 0.35);
  const light = mix(base, { r: 255, g: 255, b: 255 }, 0.18);

  drawSoftShadow(ctx, cx, cy, r);

  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r * 1.2);
  g.addColorStop(0, rgbToCss(light, 1));
  g.addColorStop(1, rgbToCss(dark, 1));
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(2, r * 0.12);
  drawHex(ctx, cx, cy, r, 0.9);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  drawHex(ctx, cx + r * 0.05, cy - r * 0.05, r * 0.6, 0.85);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawTowerBase(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(8,10,18,0.6)";
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.55, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.55, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCore(ctx, cx, cy, r, color) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  g.addColorStop(0, withAlpha(color, 0.95));
  g.addColorStop(1, withAlpha(color, 0.05));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHex(ctx, cx, cy, r, skew = 1) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 3 * i + Math.PI / 6;
    const rr = r * (i % 2 === 0 ? 1 : 0.92) * skew;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawEyes(ctx, cx, cy, r, mood = "neutral") {
  const eyeY = cy - r * 0.15;
  const eyeDx = r * 0.35;
  const eyeR = Math.max(2, r * 0.12);

  ctx.fillStyle = "rgba(8,10,18,0.9)";
  ctx.beginPath();
  ctx.arc(cx - eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(cx + eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(231,236,255,0.85)";
  ctx.beginPath();
  ctx.arc(cx - eyeDx + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + eyeDx + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  if (mood === "angry") {
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - eyeDx - eyeR, eyeY - eyeR * 1.2);
    ctx.lineTo(cx - eyeDx + eyeR, eyeY - eyeR * 0.6);
    ctx.moveTo(cx + eyeDx - eyeR, eyeY - eyeR * 0.6);
    ctx.lineTo(cx + eyeDx + eyeR, eyeY - eyeR * 1.2);
    ctx.stroke();
  }
}

function drawRune(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.05, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.15, cy + r * 0.05);
  ctx.lineTo(cx + r * 0.15, cy + r * 0.05);
  ctx.stroke();
  ctx.restore();
}

function pathRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function towerSprite(defId, color) {
  const size = 64;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  const base = hexToRgb(color);
  const cx = size / 2;
  const cy = size / 2;
  const r = 22;

  drawBody(ctx, cx, cy, r, base);
  drawTowerBase(ctx, cx, cy, r, rgbToCss(mix(base, { r: 231, g: 236, b: 255 }, 0.35), 0.8));
  drawCore(ctx, cx, cy - r * 0.1, r * 0.25, rgbToCss(mix(base, { r: 255, g: 255, b: 255 }, 0.25), 0.9));

  // Emblems per tower type (simple but distinct).
  ctx.save();
  ctx.globalAlpha = 0.95;
  if (defId === "archer") {
    ctx.strokeStyle = "rgba(231,236,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 1, cy + 2, 12, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 7);
    ctx.lineTo(cx - 6, cy + 10);
    ctx.stroke();
  } else if (defId === "cannon") {
    ctx.fillStyle = "rgba(8,10,18,0.65)";
    ctx.fillRect(cx - 4, cy - 12, 18, 10);
    ctx.fillStyle = "rgba(231,236,255,0.75)";
    ctx.fillRect(cx + 10, cy - 10, 8, 6);
  } else if (defId === "frost") {
    ctx.fillStyle = "rgba(231,236,255,0.7)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx, cy + 16);
    ctx.lineTo(cx - 10, cy);
    ctx.closePath();
    ctx.fill();
    drawRune(ctx, cx, cy + 2, r, "rgba(96,165,250,0.9)");
  } else if (defId === "alchemist") {
    ctx.fillStyle = "rgba(8,10,18,0.55)";
    pathRoundRect(ctx, cx - 8, cy - 12, 16, 18, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(52,211,153,0.75)";
    pathRoundRect(ctx, cx - 6, cy - 6, 12, 10, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(231,236,255,0.75)";
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy + 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (defId === "banner") {
    ctx.fillStyle = "rgba(231,236,255,0.75)";
    ctx.fillRect(cx - 8, cy - 12, 3, 24);
    ctx.fillStyle = "rgba(167,139,250,0.85)";
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 12);
    ctx.lineTo(cx + 12, cy - 7);
    ctx.lineTo(cx - 5, cy - 2);
    ctx.closePath();
    ctx.fill();
  } else if (defId === "sniper") {
    ctx.strokeStyle = "rgba(231,236,255,0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy - 6);
    ctx.moveTo(cx, cy + 6);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();
  } else if (defId === "tesla") {
    ctx.strokeStyle = "rgba(125,211,252,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 14);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.lineTo(cx + 8, cy + 14);
    ctx.stroke();
  } else if (defId === "minigunner") {
    ctx.fillStyle = "rgba(8,10,18,0.65)";
    for (let i = 0; i < 4; i++) {
      const ang = (Math.PI / 2) * i;
      const bx = cx + Math.cos(ang) * 8;
      const by = cy + Math.sin(ang) * 8;
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(231,236,255,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (defId === "mortar") {
    ctx.fillStyle = "rgba(8,10,18,0.55)";
    pathRoundRect(ctx, cx - 10, cy - 6, 20, 12, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(231,236,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 6);
    ctx.lineTo(cx + 14, cy - 14);
    ctx.stroke();
  } else if (defId === "flame") {
    ctx.fillStyle = "rgba(251,146,60,0.85)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 8, cy + 2);
    ctx.lineTo(cx, cy + 14);
    ctx.lineTo(cx - 8, cy + 2);
    ctx.closePath();
    ctx.fill();
  } else if (defId === "hex") {
    drawRune(ctx, cx, cy + 2, r, "rgba(167,139,250,0.95)");
    ctx.fillStyle = "rgba(8,10,18,0.65)";
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (defId === "overseer") {
    ctx.strokeStyle = "rgba(34,211,238,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.stroke();
  } else if (defId === "chronomancer") {
    ctx.strokeStyle = "rgba(147,197,253,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 3, cy + 6);
    ctx.stroke();
  } else if (defId === "stormcaller") {
    ctx.strokeStyle = "rgba(125,211,252,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 10);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.lineTo(cx + 10, cy + 12);
    ctx.stroke();
  } else if (defId === "geomancer") {
    ctx.strokeStyle = "rgba(251,113,133,0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 6);
    ctx.lineTo(cx - 2, cy - 8);
    ctx.lineTo(cx + 8, cy + 6);
    ctx.stroke();
  } else if (defId === "railgun") {
    ctx.strokeStyle = "rgba(231,236,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 4);
    ctx.lineTo(cx + 12, cy - 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(8,10,18,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 8);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.stroke();
  } else if (defId === "obliterator") {
    ctx.strokeStyle = "rgba(231,236,255,0.92)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(8,10,18,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 10);
    ctx.lineTo(cx, cy - 2);
    ctx.lineTo(cx + 12, cy - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 10);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx + 12, cy + 10);
    ctx.stroke();
  } else if (defId === "sunbreaker") {
    ctx.strokeStyle = "rgba(251,191,36,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(251,191,36,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      ctx.moveTo(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4);
      ctx.lineTo(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 14);
    }
    ctx.stroke();
  } else if (defId === "beamer") {
    ctx.strokeStyle = "rgba(167,139,250,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(231,236,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(167,139,250,0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (defId === "rocketpod") {
    ctx.fillStyle = "rgba(8,10,18,0.6)";
    pathRoundRect(ctx, cx - 10, cy - 8, 20, 6, 3);
    ctx.fill();
    pathRoundRect(ctx, cx - 10, cy, 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(231,236,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 5, 2, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy + 3, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (defId === "beacon") {
    ctx.strokeStyle = "rgba(34,211,238,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (defId === "citadel") {
    ctx.strokeStyle = "rgba(167,139,250,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 8);
    ctx.lineTo(cx + 10, cy - 8);
    ctx.lineTo(cx + 6, cy + 10);
    ctx.lineTo(cx - 6, cy + 10);
    ctx.closePath();
    ctx.stroke();
  } else if (defId === "summoner") {
    ctx.strokeStyle = "rgba(52,211,153,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(231,236,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.closePath();
    ctx.stroke();
  } else if (defId === "dronebay") {
    ctx.strokeStyle = "rgba(125,211,252,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 4);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.moveTo(cx - 6, cy + 6);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.stroke();
  } else if (defId === "marshal") {
    ctx.strokeStyle = "rgba(163,230,53,0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 8, cy - 8);
    ctx.lineTo(cx + 6, cy + 8);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.stroke();
  } else {
    drawRune(ctx, cx, cy, r, "rgba(231,236,255,0.75)");
  }
  ctx.restore();

  return c;
}

function enemySprite(defId, color) {
  const size = 64;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  const base = hexToRgb(color);
  const cx = size / 2;
  const cy = size / 2;
  const r =
    defId === "golem" || defId === "colossus" || defId === "overlord" || defId === "harbinger" ? 26 : 22;

  drawBody(ctx, cx, cy, r, base);
  drawCore(ctx, cx, cy + r * 0.1, r * 0.28, rgbToCss(mix(base, { r: 255, g: 255, b: 255 }, 0.2), 0.7));

  if (defId === "tank") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(8,10,18,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  if (defId === "ward") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(231,236,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, -0.6, 0.6);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "neutral");
    return c;
  }

  if (defId === "runner") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(8,10,18,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.lineTo(cx - 2, cy + 18);
    ctx.moveTo(cx + 10, cy + 12);
    ctx.lineTo(cx + 2, cy + 18);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "neutral");
    return c;
  }

  if (defId === "splitter") {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "rgba(8,10,18,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 6);
    ctx.lineTo(cx, cy + r - 6);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "neutral");
    return c;
  }

  if (defId === "swarm") {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(8,10,18,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy, 8, 6, 0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 10, cy, 8, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  if (defId === "skirmisher") {
    drawEyes(ctx, cx, cy, r, "neutral");
    ctx.strokeStyle = "rgba(8,10,18,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, r * 0.55, 0, Math.PI);
    ctx.stroke();
    return c;
  }

  if (defId === "brute") {
    drawEyes(ctx, cx, cy, r, "angry");
    ctx.strokeStyle = "rgba(8,10,18,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, r * 0.7, 0.3, Math.PI - 0.3);
    ctx.stroke();
    return c;
  }

  if (defId === "shellback") {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "rgba(8,10,18,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.85, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy + 2, r, "neutral");
    return c;
  }

  if (defId === "mystic") {
    drawEyes(ctx, cx, cy - 1, r, "neutral");
    drawRune(ctx, cx, cy + 6, r, "rgba(139,92,246,0.9)");
    return c;
  }

  if (defId === "leech") {
    drawEyes(ctx, cx, cy, r, "neutral");
    ctx.strokeStyle = "rgba(8,10,18,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 8);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.stroke();
    return c;
  }

  if (defId === "specter") {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "rgba(231,236,255,0.4)";
    ctx.beginPath();
    ctx.arc(cx, cy + 10, r * 0.9, Math.PI, 0);
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "neutral");
    return c;
  }

  if (defId === "glacier") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(8,10,18,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 8);
    ctx.lineTo(cx + 12, cy + 8);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy - 1, r, "neutral");
    return c;
  }

  if (defId === "phase") {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "rgba(192,132,252,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "neutral");
    return c;
  }

  if (defId === "bombardier") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(8,10,18,0.55)";
    ctx.beginPath();
    ctx.arc(cx + 8, cy - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  if (defId === "dreadwing") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(8,10,18,0.45)";
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx - 4, cy - 8);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.moveTo(cx + 18, cy);
    ctx.lineTo(cx + 4, cy - 8);
    ctx.lineTo(cx + 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  if (defId === "carapace") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(8,10,18,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 2);
    ctx.lineTo(cx - 6, cy - 10);
    ctx.lineTo(cx + 2, cy - 8);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.lineTo(cx + 6, cy + 10);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy + 2, r, "neutral");
    return c;
  }

  if (defId === "siphon") {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(8,10,18,0.45)";
    ctx.beginPath();
    ctx.arc(cx, cy + 6, r * 0.6, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy + 2, r, "neutral");
    return c;
  }

  if (defId === "bulwark") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(8,10,18,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 12, cy - 4);
    ctx.lineTo(cx + 8, cy + 12);
    ctx.lineTo(cx - 8, cy + 12);
    ctx.lineTo(cx - 12, cy - 4);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy - 1, r, "angry");
    return c;
  }

  if (defId === "wyrm") {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(8,10,18,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + 6, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + 8, cy - 2, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  if (defId === "golem") {
    // Rock plates + glowing core.
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(8,10,18,0.35)";
    pathRoundRect(ctx, cx - 18, cy - 10, 14, 14, 4);
    ctx.fill();
    pathRoundRect(ctx, cx + 4, cy - 12, 14, 16, 4);
    ctx.fill();
    pathRoundRect(ctx, cx - 6, cy + 4, 14, 14, 4);
    ctx.fill();
    ctx.restore();

    const core = ctx.createRadialGradient(cx, cy + 6, 2, cx, cy + 6, 16);
    core.addColorStop(0, "rgba(251,113,133,0.95)");
    core.addColorStop(1, "rgba(251,113,133,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 16, 0, Math.PI * 2);
    ctx.fill();

    drawEyes(ctx, cx, cy - 4, r, "angry");
    return c;
  }

  if (defId === "hydra") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(8,10,18,0.45)";
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 8, 5, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEyes(ctx, cx, cy + 2, r, "angry");
    return c;
  }

  if (defId === "colossus") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(8,10,18,0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(cx - 12, cy - 8, 24, 16);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy - 1, r, "angry");
    return c;
  }

  if (defId === "lich") {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(167,139,250,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 4, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy - 2, r, "neutral");
    return c;
  }

  if (defId === "overlord") {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(251,113,133,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 8);
    ctx.lineTo(cx - 4, cy - 16);
    ctx.lineTo(cx + 2, cy - 8);
    ctx.lineTo(cx + 8, cy - 16);
    ctx.lineTo(cx + 14, cy - 8);
    ctx.stroke();
    ctx.restore();
    drawEyes(ctx, cx, cy, r, "angry");
    return c;
  }

  drawEyes(ctx, cx, cy, r, "neutral");
  return c;
}

export function buildSprites({ towerDefs, enemyDefs }) {
  const towers = {};
  const enemies = {};
  for (const [id, def] of Object.entries(towerDefs)) towers[id] = towerSprite(id, def.color || "#e7ecff");
  for (const [id, def] of Object.entries(enemyDefs)) enemies[id] = enemySprite(id, def.color || "#fbbf24");
  return { towers, enemies };
}
