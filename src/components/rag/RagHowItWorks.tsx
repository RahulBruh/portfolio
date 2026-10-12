const STEPS = [
  {
    n: "01",
    title: "We find the bottleneck",
    body: "A short call about where time actually goes — the questions your team answers twice a week, the documents nobody can find.",
  },
  {
    n: "02",
    title: "I connect your material",
    body: "Drives, email, contracts, spreadsheets, ticket history. Nothing gets rewritten and nothing leaves your control.",
  },
  {
    n: "03",
    title: "You test it on real questions",
    body: "We run your hardest questions through it, check every source, and tune until the answers are ones you'd sign your name to.",
  },
  {
    n: "04",
    title: "It goes where your team works",
    body: "Slack, Teams, your website, or an internal page. Handover, documentation, and support if something changes.",
  },
];

export default function RagHowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full"
      style={{ paddingTop: "var(--rag-section-py)", paddingBottom: "var(--rag-section-py)" }}
    >
      <span
        className="inline-block text-accent text-xs uppercase tracking-[0.04em] font-semibold mb-5 px-4 py-1.5"
        style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
      >
        Engagement
      </span>
      <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-10 text-text">
        How it works
      </h2>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="bg-surface border p-6 flex flex-col gap-1.5"
            style={{ borderRadius: "var(--rag-radius-lg)", borderColor: "var(--color-border)" }}
          >
            <span
              className="inline-flex items-center justify-center w-8 h-8 mb-4 text-accent text-xs font-semibold tabular-nums"
              style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
            >
              {step.n}
            </span>
            <h3 className="font-medium text-lg leading-[1.2] text-text mb-2">{step.title}</h3>
            <p className="text-sm text-text-muted leading-[1.6] m-0">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
