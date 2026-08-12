import { ArrowUpRight, Download } from "lucide-react";
import { LinkedInIcon } from "@/components/shared/icons";

export default function Contact() {
  return (
    <section id="contact" className="py-28 px-6 bg-surface border-t border-border">
      <div className="max-w-[42rem] mx-auto">
        <p className="text-xs text-accent tracking-[0.25em] uppercase mb-4 font-code">
          Get in Touch
        </p>
        <h2 className="font-display text-[56px] font-bold leading-[0.95] mb-8 text-pretty">
          Let&apos;s build something
          <span className="text-accent italic"> together.</span>
        </h2>
        <p className="text-text-muted leading-[1.8] mb-10 font-light">
          I&apos;m actively seeking 2027 software engineering opportunities. Reach me directly —
          I respond fast.
        </p>
        <div className="flex flex-wrap gap-4 mb-8">
          <a
            href="mailto:rahulbabu.moka@gmail.com"
            className="flex items-center gap-2 whitespace-nowrap bg-accent text-bg px-6 py-3 text-sm font-medium tracking-[0.02em] transition-opacity duration-200 hover:opacity-90"
          >
            rahulbabu.moka@gmail.com
            <ArrowUpRight size={16} />
          </a>
          <a
            href="https://www.linkedin.com/in/rahul-moka-5a62a3248/"
            className="flex items-center gap-2 whitespace-nowrap border border-border text-text-muted px-6 py-3 text-sm font-medium tracking-[0.02em] transition-all duration-200 hover:text-text hover:border-accent-border-40"
          >
            <LinkedInIcon size={16} />
            LinkedIn
          </a>
          <a
            href="/assets/Rahul-Moka-Resume.pdf"
            download="Rahul-Moka-Resume.pdf"
            className="flex items-center gap-2 whitespace-nowrap border border-border text-text-muted px-6 py-3 text-sm font-medium tracking-[0.02em] transition-all duration-200 hover:text-text hover:border-accent-border-40"
          >
            <Download size={16} />
            Download résumé
          </a>
        </div>
        <p className="text-xs text-text-muted m-0 font-code">Phone: (901)-530-4222</p>
      </div>
    </section>
  );
}
