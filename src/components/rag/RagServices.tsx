"use client";

import { useState } from "react";
import { ALLOW_MULTIPLE_OPEN, DEFAULT_OPEN } from "./config";
import { SERVICES } from "./services";

/** Phosphor's bold caret-down, matching the design's icon exactly. */
function CaretDownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

export default function RagServices() {
  const [open, setOpen] = useState<number[]>(
    DEFAULT_OPEN > 0 ? [DEFAULT_OPEN - 1] : []
  );

  function toggle(n: number) {
    setOpen((cur) => {
      const isOpen = cur.includes(n);
      if (ALLOW_MULTIPLE_OPEN) {
        return isOpen ? cur.filter((x) => x !== n) : [...cur, n];
      }
      return isOpen ? [] : [n];
    });
  }

  return (
    <section
      id="services"
      className="py-[98px] px-[clamp(20px,5vw,72px)] bg-surface border-t border-b border-border"
    >
      <div className="max-w-[1200px] mx-auto">
        <span className="block text-accent text-xs uppercase tracking-[0.08em] font-medium mb-4">
          What we build
        </span>
        <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-8 text-text">
          Services
        </h2>

        <div className="flex flex-col gap-2.5">
          {SERVICES.map((s, n) => {
            const active = open.includes(n);
            const panelId = `service-panel-${n}`;
            return (
              <div
                key={s.tag}
                data-rag-motion
                className="overflow-hidden"
                style={{
                  borderRadius: "var(--rag-radius-lg)",
                  border: `1px solid ${active ? "var(--rag-accent-700)" : "var(--color-border)"}`,
                  background: active
                    ? "var(--color-surface)"
                    : "color-mix(in srgb, var(--color-surface) 55%, transparent)",
                  transition: "border-color 200ms, background 200ms",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(n)}
                  aria-expanded={active}
                  aria-controls={panelId}
                  className="w-full bg-transparent border-none py-5 px-[22px] cursor-pointer text-left flex items-center justify-between gap-5 text-inherit"
                >
                  <span className="flex flex-col gap-1.5 min-w-0 items-start">
                    <span
                      className="inline-flex items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] rounded-[6px]"
                      style={{
                        background: "var(--rag-accent-800)",
                        color: "var(--rag-accent-100)",
                      }}
                    >
                      {s.tag}
                    </span>
                    <span className="font-medium text-[22px] leading-[1.2] text-text">
                      {s.title}
                    </span>
                  </span>
                  <span
                    data-rag-motion
                    aria-hidden="true"
                    className="flex flex-shrink-0"
                    style={{
                      color: active ? "var(--color-accent)" : "var(--rag-neutral-500)",
                      transform: active ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 300ms ease, color 200ms",
                    }}
                  >
                    <CaretDownIcon size={18} />
                  </span>
                </button>

                <div
                  id={panelId}
                  data-rag-motion
                  className="grid"
                  style={{
                    gridTemplateRows: active ? "1fr" : "0fr",
                    opacity: active ? 1 : 0,
                    transition: "grid-template-rows 350ms ease, opacity 250ms ease",
                  }}
                >
                  <div className="overflow-hidden" inert={!active}>
                    <div
                      className="pt-0 px-[22px] pb-[22px] grid gap-6 items-start"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
                    >
                      <p className="text-text-muted leading-[1.6] m-0">{s.body}</p>
                      <div
                        className="rounded-[var(--rag-radius-md)] p-5"
                        style={{ background: "var(--rag-neutral-900)" }}
                      >
                        <p className="text-text/55 text-[11px] tracking-[0.08em] uppercase mb-3">
                          Looks like this
                        </p>
                        <p className="text-text leading-[1.6] mb-3.5 text-[15px]">{s.example}</p>
                        <p className="text-text/55 text-xs leading-[1.5] m-0">{s.source}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
