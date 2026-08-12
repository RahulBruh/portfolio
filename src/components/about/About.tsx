import Image from "next/image";
import { Mail, Code2 } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/shared/icons";
import { SKILLS } from "@/data/skills";

const SOCIAL_LINK_CLASS =
  "flex items-center gap-2 text-text-muted border border-border px-3 py-2 text-sm transition-all duration-200 hover:text-accent hover:border-accent-border-40";

export default function About() {
  return (
    <section id="about" className="py-28 px-6 max-w-[1152px] mx-auto">
      <div
        className="grid gap-16 items-start"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        <div className="flex flex-col gap-6">
          <div className="relative max-w-[24rem]">
            <div aria-hidden="true" className="absolute -inset-2 border border-accent-border-20" />
            <div className="relative w-full aspect-[3/4] bg-surface-raised">
              <Image src="/assets/rahul.png" alt="Rahul Moka portrait" fill className="object-cover" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://github.com/RahulBruh" aria-label="GitHub" className={SOCIAL_LINK_CLASS}>
              <GitHubIcon size={18} />
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/rahul-moka-5a62a3248/"
              aria-label="LinkedIn"
              className={SOCIAL_LINK_CLASS}
            >
              <LinkedInIcon size={18} />
              LinkedIn
            </a>
            <a href="mailto:rahulbabu.moka@gmail.com" aria-label="Email" className={SOCIAL_LINK_CLASS}>
              <Mail size={18} />
              Email
            </a>
            <a href="https://leetcode.com/rmoka123" aria-label="LeetCode" className={SOCIAL_LINK_CLASS}>
              <Code2 size={18} />
              LeetCode
            </a>
          </div>
        </div>
        <div>
          <p className="text-xs text-accent tracking-[0.25em] uppercase mb-4 font-code">About</p>
          <h2 className="font-display text-[44px] font-bold leading-[1.15] mb-6 text-text text-pretty">
            Full-stack builder with a thing for hard problems
          </h2>
          <p className="text-text-muted leading-[1.8] mb-4 font-light">
            I&apos;m a senior at the University of Memphis pursuing a Bachelor&apos;s in Computer
            Science (Dean&apos;s List, Aug 2023 – May 2027). I&apos;ve interned at two companies —
            building internal tooling and MCP automation at Triad Tech, and automating client
            contract workflows at West TN Consulting.
          </p>
          <p className="text-text-muted leading-[1.8] mb-10 font-light">
            I like working at every layer of the stack — from fitting an SDXL LoRA training run
            onto a single 8GB GPU to writing a C++ terminal gateway that wakes my desktop from an
            iPhone. Memphis, TN based, permanent resident.
          </p>
          <div className="flex flex-col gap-4">
            {SKILLS.map((group) => (
              <div key={group.label} className="grid gap-4 items-start" style={{ gridTemplateColumns: "88px 1fr" }}>
                <span className="text-xs text-text-muted tracking-[0.1em] uppercase pt-0.5 font-code">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="text-xs px-2.5 py-1 border border-border text-[rgba(232,234,240,0.7)] tracking-[0.02em] font-code"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
