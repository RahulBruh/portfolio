"use client";

import { ArrowUpRight, Mail, Download } from "lucide-react";
import { scrollToId } from "@/lib/scroll";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 max-w-[1152px] mx-auto">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative">
        <p className="text-accent text-sm tracking-[0.3em] uppercase mb-6 font-code">
          Software Engineer · University of Memphis
        </p>
        <h1 className="font-display italic font-black text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[-0.02em] mb-8 text-text">
          Rahul
          <br />
          <span className="text-accent not-italic">Moka</span>
        </h1>
        <p className="text-lg text-text-muted max-w-[36rem] leading-[1.7] mb-12 font-light">
          CS student at the University of Memphis building full-stack systems, ML training
          pipelines, and developer tools. Two software engineering internships, currently at West
          TN Consulting — graduating May 2027 and seeking 2027 opportunities.
        </p>
        <div className="flex flex-wrap gap-4 mb-20">
          <button
            onClick={() => scrollToId("projects")}
            className="flex items-center gap-2 whitespace-nowrap bg-accent text-bg border-none px-6 py-3 font-body text-sm font-medium tracking-[0.02em] cursor-pointer transition-opacity duration-200 hover:opacity-90"
          >
            View Projects
            <ArrowUpRight size={16} />
          </button>
          <a
            href="mailto:rahulbabu.moka@gmail.com"
            className="flex items-center gap-2 whitespace-nowrap border border-border text-text px-6 py-3 text-sm font-medium tracking-[0.02em] transition-colors duration-200 hover:border-accent-border-50"
          >
            Get in Touch
            <Mail size={14} />
          </a>
          <a
            href="/assets/Rahul-Moka-Resume.pdf"
            download="Rahul-Moka-Resume.pdf"
            className="flex items-center gap-2 whitespace-nowrap border border-border text-text-muted px-6 py-3 text-sm font-medium tracking-[0.02em] transition-all duration-200 hover:border-accent-border-50 hover:text-text"
          >
            Résumé
            <Download size={14} />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-6 border-t border-border pt-10 max-w-[22rem]">
          <div>
            <div className="text-2xl font-bold text-accent mb-1 font-display">2</div>
            <div className="text-xs text-text-muted tracking-[0.05em] uppercase font-code">
              SWE internships
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent mb-1 font-display">Dean&apos;s List</div>
            <div className="text-xs text-text-muted tracking-[0.05em] uppercase font-code">
              Academic standing
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
