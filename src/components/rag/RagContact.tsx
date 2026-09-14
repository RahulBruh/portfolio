import { CONTACT_EMAIL, MAILTO_HREF } from "./config";

export default function RagContact() {
  return (
    <section className="pt-[84px] pb-[98px] px-[clamp(20px,5vw,72px)]">
      <div className="max-w-[58ch] mx-auto">
        <span className="block text-accent text-xs uppercase tracking-[0.08em] font-medium mb-4">
          Get in touch
        </span>
        <h2 className="font-medium text-[36px] leading-[1.15] tracking-[-0.015em] mb-7 text-text">
          Contact an <span className="text-[var(--rag-accent-300)]">AI expert.</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={MAILTO_HREF}
            className="inline-flex items-center whitespace-nowrap text-accent border border-accent rounded-[var(--rag-radius-md)] px-[22px] py-3 text-sm font-medium transition-colors duration-200 hover:bg-accent/12"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href="https://www.linkedin.com/in/rahul-moka-5a62a3248/"
            className="inline-flex items-center whitespace-nowrap text-accent rounded-[var(--rag-radius-md)] px-[22px] py-3 text-sm font-medium transition-colors duration-200 hover:bg-accent/10"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
}
