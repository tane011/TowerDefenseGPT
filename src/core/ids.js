let _next = 1;
export function nextId(prefix = "id") {
  return `${prefix}_${_next++}`;
}

