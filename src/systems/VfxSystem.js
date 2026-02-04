export class VfxSystem {
  update(dt, world) {
    if (!world.vfx) return;
    const next = [];
    for (const v of world.vfx) {
      v.life -= dt;
      if (v.life > 0) next.push(v);
    }
    world.vfx = next;
  }
}

