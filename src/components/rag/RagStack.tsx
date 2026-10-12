const STACK = [
  "Claude API",
  "GPT-4",
  "Retrieval-Augmented Generation",
  "Vector Search",
  "LangChain",
  "Slack",
  "Microsoft Teams",
  "Webhooks & Automations",
];

export default function RagStack() {
  const items = [...STACK, ...STACK];
  return (
    <section className="py-16 border-t border-b border-border overflow-hidden">
      <p className="text-center text-xs uppercase tracking-[0.08em] text-text-muted mb-8">
        Built with
      </p>
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="rag-marquee-track flex items-center gap-10 w-max">
          {items.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="whitespace-nowrap text-sm text-text-muted px-5 py-2 border"
              style={{ borderRadius: "var(--rag-radius-full)", borderColor: "var(--color-border)" }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
