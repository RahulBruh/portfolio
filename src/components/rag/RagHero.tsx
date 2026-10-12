import { MAILTO_HREF } from "./config";

export default function RagHero() {
  return (
    <section className="relative pt-36 pb-24 px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full">
      <span
        className="inline-block text-accent text-xs uppercase tracking-[0.04em] font-semibold mb-6 px-4 py-1.5"
        style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
      >
        AI Engineer · For Business
      </span>
      <h1 className="font-medium text-[clamp(2.75rem,6.4vw,5rem)] leading-[1.05] tracking-[-0.015em] mb-6 text-text max-w-[20ch]">
        Knowledge management, <span className="text-[var(--rag-accent-300)]">with AI.</span>
      </h1>
      <p className="text-[17px] text-text-muted max-w-[58ch] leading-[1.55] mb-10">
        Your company already knows the answer to almost every question it gets asked. It&apos;s
        just buried in contracts, PDFs, email threads, and one person&apos;s head. I build AI
        that reads your material and answers from it — in your words, with the source attached.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={MAILTO_HREF}
          className="inline-flex items-center whitespace-nowrap bg-text text-bg px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
          style={{ borderRadius: "var(--rag-radius-full)" }}
        >
          Email me about your workflow
        </a>
        <a
          href="#how"
          className="inline-flex items-center whitespace-nowrap text-text border px-7 py-3.5 text-sm font-semibold transition-colors duration-200 hover:border-text-muted"
          style={{ borderRadius: "var(--rag-radius-full)", borderColor: "var(--color-border)" }}
        >
          How it works
        </a>
      </div>
    </section>
  );
}
