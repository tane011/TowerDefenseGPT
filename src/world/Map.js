import { clamp, dist } from "../core/math.js";

function key(tx, ty) {
  return `${tx},${ty}`;
}

function rasterizePolylineToTiles(points, tileSize) {
  // Sampling-based rasterization (cheap and robust for our coarse grid).
  const tiles = new Set();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = dist(a.x, a.y, b.x, b.y);
    const step = Math.max(2, Math.floor(segLen / (tileSize / 4)));
    for (let s = 0; s <= step; s++) {
      const t = step === 0 ? 0 : s / step;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      tiles.add(key(tx, ty));
    }
  }
  return tiles;
}

export class MapInstance {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.tileSize = def.tileSize;
    this.cols = def.cols;
    this.rows = def.rows;
    this.paths = def.paths.map((path) =>
      path.map((p) => ({
        x: (p.x + 0.5) * def.tileSize,
        y: (p.y + 0.5) * def.tileSize,
      }))
    );

    this.base = {
      x: (def.base.x + 0.5) * def.tileSize,
      y: (def.base.y + 0.5) * def.tileSize,
    };

    this.spawnPoints = this.paths.map((p) => p[0]);

    this.decor = (def.decor || []).map((d) => ({
      type: d.type,
      x: (d.x + 0.5) * def.tileSize,
      y: (d.y + 0.5) * def.tileSize,
      size: d.size ?? 1,
      color: d.color ?? null,
    }));

    this._pathTiles = new Set();
    for (const poly of this.paths) {
      const tiles = rasterizePolylineToTiles(poly, this.tileSize);
      for (const t of tiles) this._pathTiles.add(t);
    }
    this._pathTiles.add(key(def.base.x, def.base.y));
  }

  inBoundsTile(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows;
  }

  worldToTile(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return { tx, ty };
  }

  tileToWorldCenter(tx, ty) {
    return {
      x: (tx + 0.5) * this.tileSize,
      y: (ty + 0.5) * this.tileSize,
    };
  }

  clampToWorld(x, y) {
    return {
      x: clamp(x, 0, this.cols * this.tileSize),
      y: clamp(y, 0, this.rows * this.tileSize),
    };
  }

  isPathTile(tx, ty) {
    return this._pathTiles.has(key(tx, ty));
  }

  isBuildableTile(tx, ty) {
    if (!this.inBoundsTile(tx, ty)) return false;
    return !this.isPathTile(tx, ty);
  }
}
