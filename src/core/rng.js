// Small deterministic RNG so wave generation can be reproducible for a given seed.
// (mulberry32, public domain)
export function makeRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, minInclusive, maxInclusive) {
  const t = rng();
  return Math.floor(t * (maxInclusive - minInclusive + 1)) + minInclusive;
}

export function pickWeighted(rng, items) {
  // items: [{ item, w }]
  let total = 0;
  for (const it of items) total += Math.max(0, it.w);
  if (total <= 0) return items[0]?.item;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, it.w);
    if (r <= 0) return it.item;
  }
  return items[items.length - 1]?.item;
}

