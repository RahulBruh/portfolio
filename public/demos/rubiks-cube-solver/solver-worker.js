// Runs the C++ solver (compiled to WebAssembly) off the main thread, so
// building the tables and searching never freeze the animation.
importScripts("solver.js");

let api;
const ready = createSolverModule().then((M) => {
  api = {
    init: M.cwrap("cs_init", "number", []),
    solve: M.cwrap("cs_solve", "string", ["string", "number", "number", "number"]),
    randomState: M.cwrap("cs_random_state", "string", ["number"]),
  };
  postMessage({ type: "ready", tableMs: api.init() });
});

onmessage = async ({ data }) => {
  await ready;
  if (data.type === "solve") {
    const result = JSON.parse(api.solve(data.facelets, data.maxLength, data.target, data.timeout));
    postMessage({ type: "solved", id: data.id, result });
  } else if (data.type === "scramble") {
    // Random-state scramble: pick a uniformly random cube, solve it, and
    // hand back the inverse of the solution as the scramble.
    const facelets = api.randomState(data.seed >>> 0);
    const result = JSON.parse(api.solve(facelets, 30, 21, 300));
    postMessage({ type: "scrambled", id: data.id, facelets, result });
  }
};
