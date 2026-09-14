"use client";

import { useEffect, useState } from "react";

const DEFAULT_HEIGHT = 980;
const MIN_HEIGHT = 700;
const MAX_HEIGHT = 2000;

/**
 * The demo page reports its own height via postMessage — measured as
 * `document.body.getBoundingClientRect().height`, so it can shrink below the
 * iframe's current height instead of leaving dead space.
 */
export default function RagDemoFrame() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.type === "rm-labs-demo-height" && typeof data.height === "number") {
        setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(data.height))));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="rounded-[var(--rag-radius-md)] overflow-hidden bg-surface [box-shadow:var(--rag-shadow-md)]">
      <iframe
        src="/rm-labs-demo.html"
        title="RM Labs demo"
        loading="lazy"
        className="block w-full border-0"
        style={{ height }}
      />
    </div>
  );
}
