"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

const SRC = "/demos/rubiks-cube-solver/index.html";
const DEFAULT_HEIGHT = 900;
const MIN_HEIGHT = 600;
const MAX_HEIGHT = 2400;

/**
 * Live demo for the Rubik's Cube Solver project. The app is the repo's own
 * web/ build (the C++ solver compiled to WebAssembly), served from /public
 * and embedded with ?embed, which hides its header and makes it report its
 * height via postMessage so the iframe never needs a scrollbar.
 */
export default function RubiksDemo() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.type === "rubiks-demo-height" && typeof data.height === "number") {
        setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(data.height))));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="border border-border bg-surface p-6 md:p-8">
      <p className="text-xs text-accent tracking-[0.25em] uppercase mb-3 font-code">Live Demo</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <h2 className="font-display text-2xl font-bold">Solve any scramble</h2>
        <a
          href={SRC}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 text-xs text-text-muted font-code hover:text-accent"
        >
          Open full screen <ExternalLink size={13} />
        </a>
      </div>
      <p className="text-text-muted leading-[1.8] font-light mb-6 max-w-3xl">
        The C++ solver below runs in your browser, compiled to WebAssembly and running in a Web
        Worker. Scramble the cube, or turn it yourself with the buttons or the U R F D L B keys
        (Shift turns counter-clockwise). Then press Solve and step through the answer. You can also
        paint in the colors of a real cube and solve that.
      </p>
      <iframe
        src={`${SRC}?embed`}
        title="Rubik's Cube Solver demo"
        loading="lazy"
        className="block w-full border-0"
        style={{ height }}
      />
    </div>
  );
}
