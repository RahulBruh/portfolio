import { MAILTO_HREF } from "./config";

export default function RagHero() {
  return (
    <section className="pt-28 pb-[84px] px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full">
      <span className="block text-accent text-xs uppercase tracking-[0.08em] font-medium mb-4">
        AI Engineer · For Business
      </span>
      <h1 className="font-medium text-[clamp(2.75rem,6.4vw,5rem)] leading-[1.05] tracking-[-0.015em] mb-6 text-text max-w-[20ch]">
        Knowledge Management, <span className="text-[var(--rag-accent-300)]">with AI.</span>
      </h1>
      <p className="text-[17px] text-text-muted max-w-[58ch] leading-[1.55] mb-8">
        Your company already knows the answer to almost every question it gets asked. It&apos;s
        just buried in contracts, PDFs, email threads, and one person&apos;s head. I build AI
        that reads your material and answers from it — in your words, with the source attached.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={MAILTO_HREF}
          className="inline-flex items-center whitespace-nowrap text-accent border border-accent rounded-[var(--rag-radius-md)] px-[22px] py-3 text-sm font-medium transition-colors duration-200 hover:bg-accent/12"
        >
          Email me about your workflow
        </a>
        <a
          href="#how"
          className="inline-flex items-center whitespace-nowrap text-accent rounded-[var(--rag-radius-md)] px-[22px] py-3 text-sm font-medium transition-colors duration-200 hover:bg-accent/10"
        >
          How it works
        </a>
      </div>
    </section>
  );
}
