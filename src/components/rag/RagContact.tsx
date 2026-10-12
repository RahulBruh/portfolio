import { CONTACT_EMAIL, MAILTO_HREF } from "./config";

export default function RagContact() {
  return (
    <section
      className="px-[clamp(20px,5vw,72px)]"
      style={{ paddingTop: "var(--rag-section-py)", paddingBottom: "var(--rag-section-py)" }}
    >
      <div className="max-w-[58ch] mx-auto text-center flex flex-col items-center">
        <span
          className="inline-block text-accent text-xs uppercase tracking-[0.04em] font-semibold mb-5 px-4 py-1.5"
          style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
        >
          Get in touch
        </span>
        <h2 className="font-medium text-[36px] leading-[1.15] tracking-[-0.015em] mb-7 text-text">
          Contact an <span className="text-[var(--rag-accent-300)]">AI expert.</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={MAILTO_HREF}
            className="inline-flex items-center whitespace-nowrap bg-text text-bg px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
            style={{ borderRadius: "var(--rag-radius-full)" }}
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href="https://www.linkedin.com/in/rahul-moka-5a62a3248/"
            className="inline-flex items-center whitespace-nowrap text-text border px-7 py-3.5 text-sm font-semibold transition-colors duration-200 hover:border-text-muted"
            style={{ borderRadius: "var(--rag-radius-full)", borderColor: "var(--color-border)" }}
          >
            LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
}
