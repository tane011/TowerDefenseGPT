export class GameState {
  constructor({ seed }) {
    this.seed = seed;
    this.mode = "menu"; // menu | playing | gameover
    this.paused = false;
    this.time = 0; // seconds since run start (for animations)

    this.money = 150;
    this.lives = 20;
    this.waveNumber = 0; // completed waves
    this.autoNextWave = false;
    this.gameModeId = null;

    this.selectedTowerId = null;
    this.buildTowerId = null; // selected tower type to place

    this.inWave = false; // derived (wave system active)
  }
}
