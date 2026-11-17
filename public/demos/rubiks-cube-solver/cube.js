// Sticker-level cube model for the UI. Move permutations are derived from
// 3D geometry (rotate every sticker in a layer by 90 degrees), so this file
// is independent of the C++ move tables and the two are cross-checked in
// tests/model.test.mjs.
//
// Facelet order is Kociemba's: U1..U9 R1..R9 F1..F9 D1..D9 L1..L9 B1..B9.
// World axes: +x = R, +y = U, +z = F.

export const FACES = "URFDLB";
export const SOLVED = FACES.split("").map((f) => f.repeat(9)).join("");

const NORMALS = {
  U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1],
  D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1],
};

// Position of sticker (row r, col c) on each face, as seen looking at it.
const POSITION = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
};

/** [{ face, pos:[x,y,z], normal:[x,y,z] }] for all 54 stickers. */
export const STICKERS = [];
for (const f of FACES)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      STICKERS.push({ face: f, pos: POSITION[f](r, c), normal: NORMALS[f] });

const key = (p, n) => `${p.join(",")}|${n.join(",")}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Clockwise quarter turn seen from outside the face = -90 degrees about n.
const turn = (v, n) => {
  const c = cross(n, v), d = dot(n, v);
  return [-c[0] + n[0] * d, -c[1] + n[1] * d, -c[2] + n[2] * d].map((x) => x + 0);
};

/** PERM[move][j] = index of the sticker that lands on j. */
export const PERM = [];
for (const f of FACES) {
  const n = NORMALS[f];
  const quarter = new Array(54);
  STICKERS.forEach((s, i) => {
    if (dot(s.pos, n) !== 1) { quarter[i] = i; return; }
    quarter[INDEX.get(key(turn(s.pos, n), turn(s.normal, n)))] = i;
  });
  const compose = (p, q) => q.map((x) => p[x]); // p then q
  const half = compose(quarter, quarter);
  PERM.push(quarter, half, compose(half, quarter));
}

export const moveName = (m) => FACES[(m / 3) | 0] + ["", "2", "'"][m % 3];
export const inverseMove = (m) => m - (m % 3) + (2 - (m % 3));
export const invertMoves = (ms) => ms.slice().reverse().map(inverseMove);
export const formatMoves = (ms) => ms.map(moveName).join(" ");

/** Parses "R U2 F'" (also accepts lowercase, ’ and 3 for prime). Throws on bad tokens. */
export function parseMoves(text) {
  const out = [];
  for (const raw of text.replace(/[’`]/g, "'").trim().split(/\s+/).filter(Boolean)) {
    const m = /^([URFDLB])(2'?|'|3)?$/i.exec(raw);
    if (!m) throw new Error(`Unknown move "${raw}"`);
    const power = !m[2] ? 0 : m[2].startsWith("2") ? 1 : 2;
    out.push(FACES.indexOf(m[1].toUpperCase()) * 3 + power);
  }
  return out;
}

export function applyMove(state, m) {
  const p = PERM[m];
  let out = "";
  for (let j = 0; j < 54; j++) out += state[p[j]];
  return out;
}

export const applyMoves = (state, ms) => ms.reduce(applyMove, state);
export const isSolved = (state) =>
  FACES.split("").every((_, f) => state.slice(9 * f, 9 * f + 9) === state[9 * f + 4].repeat(9));
