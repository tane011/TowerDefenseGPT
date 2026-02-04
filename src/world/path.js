import { dist } from "../core/math.js";

export function buildPathInfo(points) {
  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const l = dist(a.x, a.y, b.x, b.y);
    segLens.push(l);
    totalLen += l;
  }
  return { points, segLens, totalLen: Math.max(1e-6, totalLen) };
}

export function samplePath(info, segIndex, segT) {
  const a = info.points[segIndex];
  const b = info.points[segIndex + 1];
  return {
    x: a.x + (b.x - a.x) * segT,
    y: a.y + (b.y - a.y) * segT,
  };
}

export function advanceAlongPath(info, segIndex, segT, distance) {
  // Returns { segIndex, segT, done }
  let i = segIndex;
  let t = segT;
  let remaining = distance;

  while (remaining > 0 && i < info.segLens.length) {
    const segLen = info.segLens[i] || 1e-6;
    const distToEnd = (1 - t) * segLen;
    if (remaining < distToEnd) {
      t += remaining / segLen;
      remaining = 0;
      return { segIndex: i, segT: t, done: false };
    }
    remaining -= distToEnd;
    i += 1;
    t = 0;
  }

  return { segIndex: info.segLens.length - 1, segT: 1, done: true };
}

export function pathProgress01(info, segIndex, segT) {
  let distSoFar = 0;
  for (let i = 0; i < segIndex; i++) distSoFar += info.segLens[i] || 0;
  distSoFar += (info.segLens[segIndex] || 0) * segT;
  return distSoFar / info.totalLen;
}

export function findClosestPathPoint(info, x, y) {
  let best = null;
  for (let i = 0; i < info.points.length - 1; i++) {
    const a = info.points[i];
    const b = info.points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-6;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const dpx = x - px;
    const dpy = y - py;
    const d2 = dpx * dpx + dpy * dpy;
    if (!best || d2 < best.dist2) {
      best = { segIndex: i, segT: t, dist2: d2 };
    }
  }
  return best;
}
