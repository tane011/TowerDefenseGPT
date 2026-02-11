export class VfxSystem {
  update(dt, world) {
    if (!world.vfx) return;
    const next = [];
    for (const v of world.vfx) {
      if (Number.isFinite(v.vx)) v.x += v.vx * dt;
      if (Number.isFinite(v.vy)) v.y += v.vy * dt;
      if (Number.isFinite(v.rotSpeed)) v.rotation = (v.rotation ?? 0) + v.rotSpeed * dt;
      v.life -= dt;
      if (v.life > 0) next.push(v);
    }
    world.vfx = next;
  }
}
