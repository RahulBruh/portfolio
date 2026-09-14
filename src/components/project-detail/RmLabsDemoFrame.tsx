"use client";

import { useEffect, useState } from "react";

const DEFAULT_HEIGHT = 480;
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 820;

export default function RmLabsDemoFrame() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data && data.type === "rm-labs-demo-height" && typeof data.height === "number") {
        setHeight(Math.min(Math.max(data.height, MIN_HEIGHT), MAX_HEIGHT));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="border border-border bg-surface p-2 md:p-3 mb-4">
      <iframe
        src="/rm-labs-demo.html"
        title="RM Labs interactive demo"
        className="w-full border-0 bg-white block transition-[height] duration-200"
        style={{ height, maxHeight: "85vh" }}
        loading="lazy"
      />
    </div>
  );
}
