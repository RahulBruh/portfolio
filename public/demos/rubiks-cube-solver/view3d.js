// CSS-3D renderer: 26 cubies with colored stickers, drag to orbit, and
// layer turns animated with requestAnimationFrame. Each sticker element
// carries data-i (its facelet index) so the app can handle clicks on it.
import { STICKERS } from "./cube.js";

const SIZE = 64; // px per cubie; the scene scales with CSS --cube-scale
const FACE_TRANSFORM = {
  "0,0,1": "translateZ(32px)",
  "0,0,-1": "rotateY(180deg) translateZ(32px)",
  "1,0,0": "rotateY(90deg) translateZ(32px)",
  "-1,0,0": "rotateY(-90deg) translateZ(32px)",
  "0,1,0": "rotateX(90deg) translateZ(32px)",
  "0,-1,0": "rotateX(-90deg) translateZ(32px)",
};
const AXIS = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class CubeView {
  constructor(scene, { onStickerClick } = {}) {
    this.scene = scene;
    this.rotX = -28;
    this.rotY = -36;
    this.onStickerClick = onStickerClick;
    this.root = document.createElement("div");
    this.root.className = "cube";
    scene.appendChild(this.root);
    this.cubies = [];
    this.stickers = new Array(54);

    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const el = document.createElement("div");
          el.className = "cubie";
          const base = `translate3d(${x * SIZE}px, ${-y * SIZE}px, ${z * SIZE}px)`;
          el.style.transform = base;
          for (const [n, tf] of Object.entries(FACE_TRANSFORM)) {
            const face = document.createElement("div");
            face.className = "cubie-face";
            face.style.transform = tf;
            const normal = n.split(",").map(Number);
            const i = STICKERS.findIndex(
              (s) => s.pos.join() === [x, y, z].join() && s.normal.join() === normal.join(),
            );
            if (i >= 0) {
              const st = document.createElement("div");
              st.className = "sticker";
              st.dataset.i = i;
              face.appendChild(st);
              this.stickers[i] = st;
            }
            el.appendChild(face);
          }
          this.root.appendChild(el);
          this.cubies.push({ el, pos: [x, y, z], base });
        }

    this.#bindDrag();
    this.#applyView();
  }

  setState(state) {
    for (let i = 0; i < 54; i++) this.stickers[i].dataset.c = state[i];
  }

  highlight(indices) {
    const set = new Set(indices);
    this.stickers.forEach((s, i) => s.classList.toggle("hl", set.has(i)));
  }

  resetView() {
    this.rotX = -28;
    this.rotY = -36;
    this.#applyView();
  }

  /** Animates move m (0..17), then resolves. The caller updates state after. */
  animate(m, ms) {
    const faceName = "URFDLB"[(m / 3) | 0];
    const n = AXIS[faceName];
    const power = m % 3;
    // World clockwise is -90 deg about n; CSS has y flipped, which flips the sense.
    const total = power === 0 ? 90 : power === 1 ? 180 : -90;
    const layer = this.cubies.filter((c) => c.pos[0] * n[0] + c.pos[1] * n[1] + c.pos[2] * n[2] === 1);
    const axis = `${n[0]}, ${-n[1]}, ${n[2]}`;
    const dur = power === 1 ? ms * 1.4 : ms;
    return new Promise((resolve) => {
      if (dur <= 0) return resolve();
      const t0 = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const a = total * ease(t);
        for (const c of layer) c.el.style.transform = `rotate3d(${axis}, ${a}deg) ${c.base}`;
        if (t < 1) requestAnimationFrame(frame);
        else {
          for (const c of layer) c.el.style.transform = c.base;
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  #applyView() {
    this.root.style.transform = `rotateX(${this.rotX}deg) rotateY(${this.rotY}deg)`;
  }

  #bindDrag() {
    let start = null;
    this.scene.addEventListener("pointerdown", (e) => {
      start = { x: e.clientX, y: e.clientY, rx: this.rotX, ry: this.rotY, moved: false, target: e.target };
      this.scene.setPointerCapture(e.pointerId);
    });
    this.scene.addEventListener("pointermove", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
      if (!start.moved) return;
      this.rotY = start.ry + dx * 0.5;
      this.rotX = Math.max(-89, Math.min(89, start.rx - dy * 0.5));
      this.#applyView();
    });
    const end = () => {
      if (start && !start.moved && start.target.classList?.contains("sticker"))
        this.onStickerClick?.(Number(start.target.dataset.i));
      start = null;
    };
    this.scene.addEventListener("pointerup", end);
    this.scene.addEventListener("pointercancel", () => (start = null));
    this.scene.addEventListener("dblclick", () => this.resetView());
  }
}
