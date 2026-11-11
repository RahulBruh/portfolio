"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Play, Shuffle, Square } from "lucide-react";

/*
 * Interactive grid visualizer for the A* Route Search project.
 * The grid lives in refs and cells are painted by toggling classes directly,
 * so an animation frame never re-renders the ~900 cells through React.
 */

const ROWS = 21;
const COLS = 43;
const TRAFFIC_COST = 5;

type Algo = "bfs" | "dfs" | "dijkstra" | "astar";
type Brush = "wall" | "traffic";
type Result = { visited: number[]; path: number[]; cost: number };
type RunStat = { algo: Algo; visited: number; length: number; cost: number; found: boolean };

const ALGOS: { id: Algo; name: string; blurb: string }[] = [
  { id: "astar", name: "A*", blurb: "Dijkstra plus a Manhattan-distance heuristic, so it heads toward the goal. Optimal and weighted." },
  { id: "dijkstra", name: "Dijkstra", blurb: "Expands in order of total cost so far. Optimal and weighted, but searches in every direction." },
  { id: "bfs", name: "BFS", blurb: "Expands level by level. Fewest steps, but ignores traffic cost." },
  { id: "dfs", name: "DFS", blurb: "Dives down one branch until it dead-ends. Finds a path, usually a terrible one." },
];

const SPEEDS = { slow: { delay: 40, perFrame: 1 }, normal: { delay: 0, perFrame: 2 }, fast: { delay: 0, perFrame: 8 } };
type Speed = keyof typeof SPEEDS;

const idx = (r: number, c: number) => r * COLS + c;
const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;

class MinHeap {
  private a: [number, number, number][] = []; // [priority, tiebreak, node]
  get size() { return this.a.length; }
  push(item: [number, number, number]) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
  private less(x: [number, number, number], y: [number, number, number]) {
    return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  }
}

function search(algo: Algo, walls: Uint8Array, traffic: Uint8Array, start: number, end: number): Result {
  const n = ROWS * COLS;
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const visited: number[] = [];
  const cost = (i: number) => (traffic[i] ? TRAFFIC_COST : 1);
  const neighbors = (i: number) => {
    const r = rowOf(i), c = colOf(i);
    const out: number[] = [];
    if (r > 0) out.push(i - COLS);
    if (c < COLS - 1) out.push(i + 1);
    if (r < ROWS - 1) out.push(i + COLS);
    if (c > 0) out.push(i - 1);
    return out.filter((j) => !walls[j]);
  };
  let found = false;

  if (algo === "bfs") {
    const seen = new Uint8Array(n);
    const queue = [start];
    seen[start] = 1;
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h];
      visited.push(u);
      if (u === end) { found = true; break; }
      for (const v of neighbors(u)) if (!seen[v]) { seen[v] = 1; parent[v] = u; queue.push(v); }
    }
  } else if (algo === "dfs") {
    const stack = [start];
    while (stack.length) {
      const u = stack.pop()!;
      if (closed[u]) continue;
      closed[u] = 1;
      visited.push(u);
      if (u === end) { found = true; break; }
      // reverse so the walk prefers up, right, down, left in that order
      for (const v of neighbors(u).reverse()) if (!closed[v]) { parent[v] = u; stack.push(v); }
    }
  } else {
    const er = rowOf(end), ec = colOf(end);
    const h = algo === "astar"
      ? (i: number) => Math.abs(rowOf(i) - er) + Math.abs(colOf(i) - ec)
      : () => 0;
    const g = new Float64Array(n).fill(Infinity);
    g[start] = 0;
    const open = new MinHeap();
    open.push([h(start), h(start), start]);
    while (open.size) {
      const [, , u] = open.pop();
      if (closed[u]) continue;
      closed[u] = 1;
      visited.push(u);
      if (u === end) { found = true; break; }
      for (const v of neighbors(u)) {
        if (closed[v]) continue;
        const ng = g[u] + cost(v);
        if (ng < g[v]) { g[v] = ng; parent[v] = u; open.push([ng + h(v), h(v), v]); }
      }
    }
  }

  const path: number[] = [];
  let total = 0;
  if (found) {
    for (let cur = end; cur !== -1; cur = parent[cur]) {
      path.push(cur);
      if (cur !== start) total += cost(cur);
    }
    path.reverse();
  }
  return { visited, path, cost: total };
}

export default function PathfindingDemo() {
  const [algo, setAlgo] = useState<Algo>("astar");
  const [brush, setBrush] = useState<Brush>("wall");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Draw walls or traffic, drag the endpoints, then press Visualize.");
  const [stats, setStats] = useState<RunStat[]>([]);

  const cells = useRef<(HTMLDivElement | null)[]>([]);
  const walls = useRef(new Uint8Array(ROWS * COLS));
  const traffic = useRef(new Uint8Array(ROWS * COLS));
  const start = useRef(idx(10, 8));
  const end = useRef(idx(10, 34));
  const drag = useRef<null | "start" | "end" | "paint" | "erase">(null);
  const runToken = useRef(0);
  const brushRef = useRef(brush);
  useEffect(() => { brushRef.current = brush; }, [brush]);

  const paintCell = useCallback((i: number) => {
    const el = cells.current[i];
    if (!el) return;
    let state = "empty";
    if (i === start.current) state = "start";
    else if (i === end.current) state = "end";
    else if (walls.current[i]) state = "wall";
    else if (traffic.current[i]) state = "traffic";
    el.dataset.state = state;
  }, []);

  const clearSearch = useCallback(() => {
    for (const el of cells.current) if (el) el.dataset.search = "";
  }, []);

  const repaintAll = useCallback(() => {
    for (let i = 0; i < ROWS * COLS; i++) paintCell(i);
  }, [paintCell]);

  useEffect(() => {
    repaintAll();
    const token = runToken;
    const stopDrag = () => { drag.current = null; };
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointerup", stopDrag);
      token.current++; // cancel any animation still running on unmount
    };
  }, [repaintAll]);

  const applyBrush = (i: number, mode: "paint" | "erase") => {
    if (i === start.current || i === end.current) return;
    if (mode === "erase") { walls.current[i] = 0; traffic.current[i] = 0; }
    else if (brushRef.current === "wall") { walls.current[i] = 1; traffic.current[i] = 0; }
    else { traffic.current[i] = 1; walls.current[i] = 0; }
    paintCell(i);
  };

  const cellFromEvent = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const i = el?.dataset.idx;
    return i === undefined ? null : Number(i);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (running) return;
    const i = cellFromEvent(e);
    if (i === null) return;
    e.preventDefault();
    clearSearch();
    if (i === start.current) drag.current = "start";
    else if (i === end.current) drag.current = "end";
    else {
      const filled = brushRef.current === "wall" ? walls.current[i] : traffic.current[i];
      drag.current = filled ? "erase" : "paint";
      applyBrush(i, drag.current);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || running) return;
    const i = cellFromEvent(e);
    if (i === null) return;
    if (drag.current === "start" || drag.current === "end") {
      const other = drag.current === "start" ? end.current : start.current;
      if (i === other || walls.current[i]) return;
      const ref = drag.current === "start" ? start : end;
      const prev = ref.current;
      ref.current = i;
      paintCell(prev);
      paintCell(i);
    } else {
      applyBrush(i, drag.current);
    }
  };

  const stop = () => {
    runToken.current++;
    setRunning(false);
    setStatus("Stopped.");
  };

  const visualize = () => {
    clearSearch();
    const token = ++runToken.current;
    const chosen = algo;
    const name = ALGOS.find((a) => a.id === chosen)!.name;
    const res = search(chosen, walls.current, traffic.current, start.current, end.current);
    const { delay, perFrame } = SPEEDS[speed];
    const s = start.current, t = end.current;
    const frames: { i: number; kind: "visited" | "path" }[] = [
      ...res.visited.filter((i) => i !== s && i !== t).map((i) => ({ i, kind: "visited" as const })),
      ...res.path.filter((i) => i !== s && i !== t).map((i) => ({ i, kind: "path" as const })),
    ];
    setRunning(true);
    setStatus(`Running ${name}...`);
    let k = 0;

    const finish = () => {
      setRunning(false);
      const found = res.path.length > 0;
      setStatus(found
        ? `${name} explored ${res.visited.length} cells and found a path of ${res.path.length - 1} steps (cost ${res.cost}).`
        : `${name} explored ${res.visited.length} cells. No path exists.`);
      setStats((prev) => [
        { algo: chosen, visited: res.visited.length, length: Math.max(res.path.length - 1, 0), cost: res.cost, found },
        ...prev.filter((p) => p.algo !== chosen),
      ]);
    };

    const step = () => {
      if (token !== runToken.current) return;
      for (let n = 0; n < perFrame && k < frames.length; n++, k++) {
        const { i, kind } = frames[k];
        const el = cells.current[i];
        if (el) el.dataset.search = kind;
      }
      if (k >= frames.length) return finish();
      if (delay) setTimeout(step, delay);
      else requestAnimationFrame(step);
    };
    step();
  };

  const clearBoard = () => {
    runToken.current++;
    walls.current.fill(0);
    traffic.current.fill(0);
    clearSearch();
    repaintAll();
    setRunning(false);
    setStats([]);
    setStatus("Board cleared.");
  };

  const randomize = () => {
    runToken.current++;
    clearSearch();
    for (let i = 0; i < ROWS * COLS; i++) {
      if (i === start.current || i === end.current) { walls.current[i] = 0; traffic.current[i] = 0; continue; }
      const roll = Math.random();
      walls.current[i] = roll < 0.24 ? 1 : 0;
      traffic.current[i] = roll >= 0.24 && roll < 0.4 ? 1 : 0;
    }
    repaintAll();
    setRunning(false);
    setStats([]);
    setStatus("New random map. Run a few algorithms on it and compare.");
  };

  const selected = ALGOS.find((a) => a.id === algo)!;

  return (
    <div className="border border-border bg-surface p-6 md:p-8">
      <style>{`
        .pf-cell { background: var(--color-frame); transition: background-color 120ms ease; touch-action: none; }
        .pf-cell[data-state="traffic"] { background: #3b2f12; }
        .pf-cell[data-search="visited"] { background: rgba(0, 212, 255, 0.28); }
        .pf-cell[data-state="traffic"][data-search="visited"] { background: rgba(196, 150, 40, 0.55); }
        .pf-cell[data-search="path"] { background: #facc15; }
        .pf-cell[data-state="wall"] { background: #2a3442; }
        .pf-cell[data-state="start"] { background: #22c55e; cursor: grab; }
        .pf-cell[data-state="end"] { background: #ef4444; cursor: grab; }
      `}</style>

      <p className="text-xs text-accent tracking-[0.25em] uppercase mb-3 font-code">Live Demo</p>
      <h2 className="font-display text-2xl font-bold mb-3">Watch the search</h2>
      <p className="text-text-muted leading-[1.8] font-light mb-6 max-w-3xl">
        The same four algorithms from the Nashville router, running on a grid. Click and drag to draw
        walls or traffic (cost {TRAFFIC_COST}, like a slow road), drag the green and red endpoints, then
        pick an algorithm and press Visualize. Run several on the same map to compare them.
      </p>

      <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Algorithm">
        {ALGOS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={algo === a.id}
            disabled={running}
            onClick={() => setAlgo(a.id)}
            className={`text-sm px-4 py-2 border font-code transition-colors duration-200 disabled:opacity-50 ${
              algo === a.id
                ? "border-accent text-accent bg-[rgba(0,212,255,0.08)]"
                : "border-border text-text-muted hover:text-accent hover:border-accent-border-40"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-text-muted font-light mb-5 min-h-[1.5rem]">{selected.blurb}</p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {running ? (
          <button type="button" onClick={stop} className="flex items-center gap-2 bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90">
            <Square size={14} /> Stop
          </button>
        ) : (
          <button type="button" onClick={visualize} className="flex items-center gap-2 bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90">
            <Play size={14} /> Visualize {selected.name}
          </button>
        )}
        <button type="button" onClick={randomize} className="flex items-center gap-2 border border-border text-text-muted px-4 py-2.5 text-sm hover:text-accent hover:border-accent-border-40">
          <Shuffle size={14} /> Random map
        </button>
        <button type="button" onClick={clearBoard} className="flex items-center gap-2 border border-border text-text-muted px-4 py-2.5 text-sm hover:text-accent hover:border-accent-border-40">
          <Eraser size={14} /> Clear
        </button>
        <label className="flex items-center gap-2 text-xs text-text-muted font-code">
          Brush
          <select value={brush} onChange={(e) => setBrush(e.target.value as Brush)} className="bg-frame border border-border text-text px-2 py-2 text-xs">
            <option value="wall">Wall</option>
            <option value="traffic">Traffic</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted font-code">
          Speed
          <select value={speed} onChange={(e) => setSpeed(e.target.value as Speed)} className="bg-frame border border-border text-text px-2 py-2 text-xs">
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </label>
      </div>

      <div
        className="grid gap-px bg-border border border-border select-none"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => (
          <div key={i} data-idx={i} ref={(el) => { cells.current[i] = el; }} className="pf-cell aspect-square" />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-text-muted font-code">
        {[
          ["#22c55e", "Start"], ["#ef4444", "End"], ["#2a3442", "Wall"], ["#3b2f12", `Traffic (cost ${TRAFFIC_COST})`],
          ["rgba(0,212,255,0.28)", "Explored"], ["#facc15", "Path"],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <p className="text-sm text-text mt-5 font-code" aria-live="polite">{status}</p>

      {stats.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm font-code border-collapse">
            <thead>
              <tr className="text-left text-xs text-text-muted uppercase tracking-[0.1em]">
                <th className="py-2 pr-4 font-normal">Algorithm</th>
                <th className="py-2 pr-4 font-normal">Cells explored</th>
                <th className="py-2 pr-4 font-normal">Path steps</th>
                <th className="py-2 font-normal">Path cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.algo} className="border-t border-border">
                  <td className="py-2 pr-4 text-accent">{ALGOS.find((a) => a.id === s.algo)!.name}</td>
                  <td className="py-2 pr-4">{s.visited}</td>
                  <td className="py-2 pr-4">{s.found ? s.length : "—"}</td>
                  <td className="py-2">{s.found ? s.cost : "no path"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
