let _next = 1;
export function nextId(prefix = "id") {
  return `${prefix}_${_next++}`;
}

export function ensureNextId(nextValue) {
  const value = Number(nextValue);
  if (!Number.isFinite(value)) return _next;
  if (value > _next) _next = Math.floor(value);
  return _next;
}
