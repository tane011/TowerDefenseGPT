export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function norm(ax, ay) {
  const m = Math.sqrt(ax * ax + ay * ay) || 1;
  return { x: ax / m, y: ay / m, m };
}

export function fmt(num, digits = 0) {
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(digits);
}

