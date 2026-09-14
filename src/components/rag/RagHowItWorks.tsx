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
      className="scroll-mt-20 py-[98px] px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full"
    >
      <span className="block text-accent text-xs uppercase tracking-[0.08em] font-medium mb-4">
        Engagement
      </span>
      <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-8 text-text">
        How it works
      </h2>
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="bg-surface p-[8.4px] border border-border flex flex-col gap-1.5"
          >
            <span className="text-text/55 text-xs tabular-nums">{step.n}</span>
            <h3 className="font-medium text-xl leading-[1.2] text-text mt-3 mb-2.5">{step.title}</h3>
            <p className="text-sm text-text-muted leading-[1.6] m-0">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
