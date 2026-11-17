import {
  FACES, SOLVED, STICKERS, applyMove, formatMoves, inverseMove, invertMoves, isSolved, moveName, parseMoves,
} from "./cube.js";
import { CubeView } from "./view3d.js";

const $ = (id) => document.getElementById(id);
const CENTERS = new Set([4, 13, 22, 31, 40, 49]);
const COLOR_NAMES = { U: "White", R: "Red", F: "Green", D: "Yellow", L: "Orange", B: "Blue" };

// ?embed hides the page chrome and reports the content height to the parent
// page, so an iframe can size itself without scrollbars.
if (new URLSearchParams(location.search).has("embed")) {
  document.body.classList.add("embed");
  if (window.parent !== window)
    new ResizeObserver(() =>
      window.parent.postMessage(
        { type: "rubiks-demo-height", height: document.body.getBoundingClientRect().height },
        location.origin,
      ),
    ).observe(document.body);
}

let state = SOLVED;
let solution = null; // { moves, index, result }
let chain = Promise.resolve();
let pending = 0;
let playing = false;
let engineReady = false;
let paintColor = "U";
let requestId = 0;

// ---------- solver worker ----------
const worker = new Worker(new URL("./solver-worker.js", import.meta.url));
const waiting = new Map();
worker.onmessage = ({ data }) => {
  if (data.type === "ready") {
    engineReady = true;
    $("engine").dataset.state = "ready";
    $("engine").textContent = `C++ engine ready · tables ${Math.round(data.tableMs)} ms`;
    setStatus("Ready. Scramble the cube or turn it yourself, then press Solve.");
    refresh();
    return;
  }
  waiting.get(data.id)?.(data);
  waiting.delete(data.id);
};
worker.onerror = () => {
  $("engine").dataset.state = "error";
  $("engine").textContent = "Solver failed to load";
  setStatus("The WebAssembly solver couldn't be loaded in this browser.", true);
};
const ask = (msg) =>
  new Promise((resolve) => {
    const id = ++requestId;
    waiting.set(id, resolve);
    worker.postMessage({ ...msg, id });
  });

// ---------- views ----------
const view = new CubeView($("scene"), { onStickerClick: (i) => paint(i) });

const net = $("net");
const tiles = new Array(54);
for (const f of FACES) {
  const face = document.createElement("div");
  face.className = "face";
  face.style.gridArea = f;
  for (let k = 0; k < 9; k++) {
    const i = FACES.indexOf(f) * 9 + k;
    const t = document.createElement("button");
    t.className = "tile" + (k === 4 ? " center" : "");
    t.type = "button";
    t.tabIndex = -1;
    t.setAttribute("aria-label", `${f}${k + 1}`);
    t.addEventListener("click", () => paint(i));
    tiles[i] = t;
    face.appendChild(t);
  }
  net.appendChild(face);
}

function render() {
  view.setState(state);
  for (let i = 0; i < 54; i++) tiles[i].dataset.c = state[i];
  $("facelets").textContent = state;
  const next = solution && solution.index < solution.moves.length ? solution.moves[solution.index] : null;
  const hl = next === null ? [] : STICKERS.map((s, i) => (s.face === FACES[(next / 3) | 0] ? i : -1)).filter((i) => i >= 0);
  view.highlight(hl);
  tiles.forEach((t, i) => t.classList.toggle("hl", hl.includes(i)));
  renderSolution();
}

function renderSolution() {
  const box = $("moves");
  box.innerHTML = "";
  if (!solution) {
    box.innerHTML = '<span class="empty">Scramble the cube, then press Solve.</span>';
    $("badges").innerHTML = "";
    $("stats").innerHTML = "";
  } else if (!solution.moves.length) {
    box.innerHTML = '<span class="empty">Already solved: nothing to do.</span>';
  } else {
    solution.moves.forEach((m, k) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (k < solution.index ? " done" : k === solution.index ? " current" : "");
      chip.textContent = moveName(m);
      chip.title = `Jump to move ${k + 1}`;
      chip.addEventListener("click", () => jumpTo(k));
      box.appendChild(chip);
    });
  }
  refresh();
}

function refresh() {
  const idle = pending === 0;
  const has = solution && solution.moves.length > 0;
  $("solve").disabled = !engineReady || !idle;
  $("scramble").disabled = !engineReady || !idle;
  $("first").disabled = !has || !idle || solution.index === 0;
  $("prev").disabled = !has || !idle || solution.index === 0;
  $("next").disabled = !has || !idle || solution.index >= solution.moves.length;
  $("last").disabled = !has || !idle || solution.index >= solution.moves.length;
  $("play").disabled = !has || (solution.index >= solution.moves.length && !playing);
  $("play").textContent = playing ? "❚❚" : "▶";
}

function setStatus(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}

const speed = () => Number($("speed").value);

// Queue animated moves so rapid key presses play in order.
function animateMoves(moves, ms = speed(), after) {
  pending++;
  refresh();
  chain = chain.then(async () => {
    for (const m of moves) {
      await view.animate(m, ms);
      state = applyMove(state, m);
      after?.(m);
      render();
    }
    pending--;
    refresh();
  });
  return chain;
}

function clearSolution() {
  playing = false;
  solution = null;
}

// ---------- actions ----------
function userMoves(moves) {
  clearSolution();
  animateMoves(moves, Math.min(speed(), 180));
}

async function solve() {
  if (state.includes("X")) {
    const n = [...state].filter((c) => c === "X").length;
    return setStatus(`${n} sticker${n > 1 ? "s are" : " is"} still gray. Paint them first.`, true);
  }
  clearSolution();
  setStatus("Searching…");
  pending++;
  refresh();
  const started = state;
  const { result } = await ask({
    type: "solve", facelets: state, maxLength: 30,
    target: Number($("target").value), timeout: Number($("timeout").value),
  });
  pending--;
  if (state !== started) return refresh();
  if (!result.ok) {
    setStatus(result.error, true);
    return render();
  }
  solution = { moves: result.solution ? parseMoves(result.solution) : [], index: 0, result };
  showStats(result);
  setStatus(
    result.length === 0
      ? "The cube is already solved."
      : `Found a ${result.length}-move solution in ${fmtMs(result.ms)}. Press play or step through it.`,
  );
  render();
}

function showStats(r) {
  const badges = [];
  if (r.optimal) badges.push("optimal");
  if (r.timedOut) badges.push("time budget hit");
  $("badges").innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join("");
  const cell = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  $("stats").innerHTML =
    cell("Moves", r.length) +
    cell("Search", fmtMs(r.ms)) +
    cell("Nodes", Intl.NumberFormat("en", { notation: "compact" }).format(r.nodes)) +
    (r.optimal
      ? cell("Method", "exact IDA*") + cell("Result", "optimal") + cell("Searched", "all ≤ " + r.length)
      : cell("Phase 1", r.phase1) + cell("Phase 2", r.length - r.phase1) + cell("Improved", `${r.improvements}×`));
}

const fmtMs = (ms) => (ms < 1 ? "<1 ms" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

async function scramble() {
  clearSolution();
  setStatus("Generating a random-state scramble…");
  pending++;
  refresh();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { facelets, result } = await ask({ type: "scramble", seed });
  pending--;
  const moves = invertMoves(parseMoves(result.solution));
  state = SOLVED;
  render();
  setStatus(`Scramble (${moves.length} moves): ${formatMoves(moves)}`);
  await animateMoves(moves, 70);
  if (state !== facelets) console.warn("scramble did not reproduce the random state");
}

function step(dir) {
  if (!solution || pending) return;
  if (dir > 0 && solution.index < solution.moves.length) {
    const m = solution.moves[solution.index];
    return animateMoves([m], speed(), () => solution && solution.index++);
  }
  if (dir < 0 && solution.index > 0) {
    const m = inverseMove(solution.moves[solution.index - 1]);
    return animateMoves([m], speed(), () => solution && solution.index--);
  }
}

function jumpTo(k) {
  if (!solution || pending) return;
  playing = false;
  while (solution.index < k) state = applyMove(state, solution.moves[solution.index++]);
  while (solution.index > k) state = applyMove(state, inverseMove(solution.moves[--solution.index]));
  render();
}

async function togglePlay() {
  if (!solution) return;
  if (playing) {
    playing = false;
    return refresh();
  }
  if (solution.index >= solution.moves.length) jumpTo(0);
  playing = true;
  refresh();
  while (playing && solution && solution.index < solution.moves.length) {
    await step(1);
    await chain;
  }
  playing = false;
  if (solution && isSolved(state)) setStatus(`Solved in ${solution.moves.length} moves.`);
  refresh();
}

function paint(i) {
  if (!document.body.classList.contains("painting") || CENTERS.has(i) || pending) return;
  clearSolution();
  state = state.slice(0, i) + paintColor + state.slice(i + 1);
  render();
}

// ---------- wiring ----------
$("solve").onclick = solve;
$("scramble").onclick = scramble;
$("reset").onclick = () => {
  if (pending) return;
  clearSolution();
  state = SOLVED;
  setStatus("Reset to solved.");
  render();
};
$("first").onclick = () => jumpTo(0);
$("last").onclick = () => solution && jumpTo(solution.moves.length);
$("prev").onclick = () => step(-1);
$("next").onclick = () => step(1);
$("play").onclick = togglePlay;

const pad = $("turnpad");
for (const f of FACES)
  for (const p of [0, 2, 1]) {
    const m = FACES.indexOf(f) * 3 + p;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = moveName(m);
    b.style.setProperty("--face", `var(--c-${f})`);
    b.onclick = () => userMoves([m]);
    pad.appendChild(b);
  }
// Lay the pad out as columns per face: reorder into rows of quarter / prime / half.
pad.style.gridAutoFlow = "column";
pad.style.gridTemplateRows = "repeat(3, auto)";

$("alg").onsubmit = (e) => {
  e.preventDefault();
  try {
    const moves = parseMoves($("alg-input").value);
    if (!moves.length) return;
    userMoves(moves);
    setStatus(`Applied ${moves.length} move${moves.length > 1 ? "s" : ""}.`);
  } catch (err) {
    setStatus(err.message, true);
  }
};

const palette = $("palette");
for (const f of FACES) {
  const s = document.createElement("button");
  s.className = "swatch";
  s.type = "button";
  s.dataset.c = f;
  s.title = COLOR_NAMES[f];
  s.setAttribute("role", "radio");
  s.setAttribute("aria-checked", String(f === paintColor));
  s.onclick = () => {
    paintColor = f;
    palette.querySelectorAll(".swatch").forEach((x) => x.setAttribute("aria-checked", String(x === s)));
    if (!$("paint-mode").checked) $("paint-mode").click();
  };
  palette.appendChild(s);
}
$("paint-mode").onchange = (e) => document.body.classList.toggle("painting", e.target.checked);
$("blank").onclick = () => {
  if (pending) return;
  clearSolution();
  state = [...state].map((c, i) => (CENTERS.has(i) ? c : "X")).join("");
  if (!$("paint-mode").checked) $("paint-mode").click();
  setStatus("All stickers cleared. Paint each one to match your cube (keep white on top, green in front).");
  render();
};
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(state);
    setStatus("Facelet string copied.");
  } catch {
    setStatus(state);
  }
};

document.addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const f = FACES.indexOf(e.key.toUpperCase());
  if (f >= 0) {
    userMoves([f * 3 + (e.shiftKey ? 2 : 0)]);
  } else if (e.key === " ") {
    togglePlay();
  } else if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
  else if (e.key === "Home") jumpTo(0);
  else if (e.key === "End" && solution) jumpTo(solution.moves.length);
  else return;
  e.preventDefault();
});

render();
