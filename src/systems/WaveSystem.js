export class WaveSystem {
  constructor({ createWave, spawnEnemy, awardMoney, log, getMode, onVictory, state, world }) {
    this._createWave = createWave;
    this._spawnEnemy = spawnEnemy;
    this._awardMoney = awardMoney;
    this._log = log;
    this._getMode = getMode;
    this._onVictory = onVictory;
    this._state = state;
    this._world = world;

    this.active = false;
    this._time = 0;
    this._events = [];
    this._waveMeta = null;
    this._spawnTimeTotal = 0;
    this._autoDelay = 0;
  }

  reset() {
    this.active = false;
    this._time = 0;
    this._events = [];
    this._waveMeta = null;
    this._spawnTimeTotal = 0;
    this._autoDelay = 0;
  }

  get waveMeta() {
    return this._waveMeta;
  }

  hasPendingSpawns() {
    return this._events.length > 0;
  }

  spawnTimeRemaining() {
    if (!this._events.length) return 0;
    const last = this._events[this._events.length - 1];
    return Math.max(0, (last?.t ?? 0) - this._time);
  }

  spawnTimeTotal() {
    return Math.max(0, this._spawnTimeTotal || 0);
  }

  canStartNextWave() {
    const mode = this._getMode?.();
    if (mode?.totalWaves && this._state.waveNumber >= mode.totalWaves) return false;
    return !this.active && this._state.mode === "playing";
  }

  startNextWave() {
    if (!this.canStartNextWave()) return false;
    const waveNum = this._state.waveNumber + 1;
    const wave = this._createWave(waveNum);
    this.active = true;
    this._time = 0;
    this._events = [...wave.events].sort((a, b) => a.t - b.t);
    this._spawnTimeTotal = this._events.length ? this._events[this._events.length - 1].t ?? 0 : 0;
    this._waveMeta = wave.meta;
    this._log(`Wave ${waveNum} started: ${wave.meta.label}`);
    if (this._state.settings?.pauseOnBossWave && wave.meta?.hasBoss) {
      this._state.paused = true;
      this._log?.("Paused: boss wave starting.");
    }
    return true;
  }

  skipWave() {
    if (!this.active || this._state.mode !== "playing") return false;
    if (this._waveMeta?.hasBoss) {
      this._log?.("Boss waves cannot be skipped.");
      return false;
    }
    if (this._events.length > 0) {
      this._log?.("Wait until all enemies have spawned before skipping.");
      return false;
    }
    const waveNum = this._state.waveNumber + 1;
    this.active = false;
    this._state.waveNumber = waveNum;

    const bonus = this._waveMeta?.rewardBonus ?? 0;
    if (bonus > 0) this._awardMoney(bonus);
    this._log(`Wave ${waveNum} skipped (+${bonus}g). Enemies remain.`);
    this._autoDelay = 0;

    if (this.canStartNextWave()) this.startNextWave();
    return true;
  }

  update(dt) {
    if (this._state.mode !== "playing") return;

    if (!this.active && this._state.autoNextWave) {
      this._autoDelay -= dt;
      if (this._autoDelay <= 0) this.startNextWave();
    }

    if (!this.active) return;

    this._time += dt;
    while (this._events.length && this._events[0].t <= this._time) {
      const ev = this._events.shift();
      this._spawnEnemy(ev.enemyId, ev.pathIndex ?? 0, ev.opts || {});
    }

    const waveDone = this._events.length === 0 && this._world.enemies.length === 0;
    if (waveDone) {
      const waveNum = this._state.waveNumber + 1;
      this.active = false;
      this._state.waveNumber = waveNum;

      const bonus = this._waveMeta?.rewardBonus ?? 0;
      if (bonus > 0) this._awardMoney(bonus);
      this._log(`Wave ${waveNum} cleared (+${bonus}g).`);
      this._autoDelay = 0.75;
      if (this._state.settings?.pauseOnWaveEnd) {
        this._state.paused = true;
        this._log?.("Paused: wave cleared.");
      }

      const mode = this._getMode?.();
      if (mode?.totalWaves && waveNum >= mode.totalWaves) {
        if (!this._state.pendingVictory) this._onVictory?.(mode);
      }
    }
  }
}
