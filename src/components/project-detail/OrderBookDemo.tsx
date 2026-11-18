"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

const SRC = "/demos/cpp-order-book/index.html";
const DEFAULT_HEIGHT = 1250;
const MIN_HEIGHT = 700;
const MAX_HEIGHT = 2600;

/**
 * Live demo for the C++ Limit Order Book. The app is the repo's web/ build
 * (the engine headers compiled to WebAssembly), served from /public and
 * embedded with ?embed, which hides its header and reports its height via
 * postMessage so the iframe never needs a scrollbar.
 */
export default function OrderBookDemo() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.type === "orderbook-demo-height" && typeof data.height === "number") {
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
        <h2 className="font-display text-2xl font-bold">Trade against the matching engine</h2>
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
        The C++ order book below runs in your browser, compiled to WebAssembly. Send limit, IOC or
        market orders and watch them match by price, then time. Click any resting order to modify or
        cancel it, or run simulated order flow. At the bottom, benchmark the std::map book against
        the tick-array book on the same seeded stream the repo&apos;s benchmark uses.
      </p>
      <iframe
        src={`${SRC}?embed`}
        title="C++ Limit Order Book demo"
        loading="lazy"
        className="block w-full border-0"
        style={{ height }}
      />
    </div>
  );
}
