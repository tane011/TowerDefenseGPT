export class Input {
  constructor(canvas) {
    this._canvas = canvas;

    this.mouse = { x: 0, y: 0, inside: false };
    this._clicks = [];
    this.keysDown = new Set();
    this._keysPressed = new Set();

    const toCanvas = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
      return { x, y, inside: x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height };
    };

    canvas.addEventListener("mousemove", (ev) => {
      const p = toCanvas(ev);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.inside = p.inside;
    });

    canvas.addEventListener("mouseleave", () => {
      this.mouse.inside = false;
    });

    canvas.addEventListener("mousedown", (ev) => {
      const p = toCanvas(ev);
      const button = ev.button === 2 ? "right" : "left";
      this._clicks.push({ button, x: p.x, y: p.y });
    });

    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

    window.addEventListener("keydown", (ev) => {
      this.keysDown.add(ev.code);
      this._keysPressed.add(ev.code);
    });
    window.addEventListener("keyup", (ev) => {
      this.keysDown.delete(ev.code);
    });
  }

  consumeClicks() {
    const q = this._clicks;
    this._clicks = [];
    return q;
  }

  // True only for the first frame after press.
  consumePressed(code) {
    if (!this._keysPressed.has(code)) return false;
    this._keysPressed.delete(code);
    return true;
  }
}

