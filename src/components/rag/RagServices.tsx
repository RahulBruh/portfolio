import { SERVICES } from "./services";

export default function RagServices() {
  return (
    <section
      id="services"
      className="px-[clamp(20px,5vw,72px)] border-t border-b border-border"
      style={{ paddingTop: "var(--rag-section-py)", paddingBottom: "var(--rag-section-py)" }}
    >
      <div className="max-w-[1200px] mx-auto">
        <span
          className="inline-block text-accent text-xs uppercase tracking-[0.04em] font-semibold mb-5 px-4 py-1.5"
          style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
        >
          What we build
        </span>
        <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-10 text-text">
          Services
        </h2>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {SERVICES.map((s) => (
            <div
              key={s.tag}
              className="flex flex-col bg-surface border p-7"
              style={{ borderRadius: "var(--rag-radius-lg)", borderColor: "var(--color-border)" }}
            >
              <span
                className="inline-flex self-start items-center text-[11px] tracking-[0.02em] px-2.5 py-[3px] mb-4"
                style={{
                  borderRadius: "6px",
                  background: "var(--rag-accent-800)",
                  color: "var(--rag-accent-100)",
                }}
              >
                {s.tag}
              </span>
              <h3 className="font-medium text-xl leading-[1.2] text-text mb-3">{s.title}</h3>
              <p className="text-sm text-text-muted leading-[1.6] mb-5">{s.body}</p>
              <div
                className="mt-auto p-4"
                style={{ borderRadius: "var(--rag-radius-md)", background: "var(--rag-neutral-900)" }}
              >
                <p className="text-text/55 text-[11px] tracking-[0.08em] uppercase mb-2">
                  Looks like this
                </p>
                <p className="text-text leading-[1.6] mb-2.5 text-[14px]">{s.example}</p>
                <p className="text-text/55 text-xs leading-[1.5] m-0">{s.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
