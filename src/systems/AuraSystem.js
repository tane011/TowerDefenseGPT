import { dist2 } from "../core/math.js";

export class AuraSystem {
  constructor({ towerDefs }) {
    this._towerDefs = towerDefs;
  }

  update(world) {
    for (const t of world.towers) t.resetBuffs();

    for (const src of world.towers) {
      const def = this._towerDefs[src.defId];
      if (!def) continue;
      const stats = src.computeStats(def, { modifiers: world.modifiers }); // buffs are identity right after reset
      const aura = stats.aura;
      if (!aura) continue;

      const r2 = (aura.radius ?? 120) ** 2;
      for (const dst of world.towers) {
        if (dst === src) continue;
        if (dist2(src.x, src.y, dst.x, dst.y) > r2) continue;
        dst.applyBuff(aura.buffs || {});
      }
    }
  }
}
