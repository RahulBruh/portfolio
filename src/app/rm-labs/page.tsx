import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/data/projects";

const project = PROJECTS.find((p) => p.id === "rm-labs")!;

export const metadata: Metadata = {
  title: `${project.title} — Rahul Moka`,
  description: project.shortDesc,
};

export default function RmLabsPage() {
  return (
    <div className="pt-28 pb-24 px-6 max-w-[1152px] mx-auto">
      <span className="block text-xs text-accent tracking-[0.25em] uppercase mb-3 font-code">
        {project.tag}
      </span>
      <h1 className="font-display italic font-bold text-[clamp(2.5rem,7vw,4.5rem)] text-text mb-4 leading-[1.05]">
        {project.title}
      </h1>
      <p className="text-lg text-text-muted leading-[1.8] font-light max-w-2xl mb-12">
        Ask your own documents. Get answers you can trace.
      </p>

      <div className="border border-border bg-surface p-2 md:p-3 mb-4">
        <iframe
          src="/rm-labs-demo.html"
          title="RM Labs interactive demo"
          className="w-full h-[760px] max-h-[85vh] border-0 bg-white"
          loading="lazy"
        />
      </div>
      <div className="flex justify-end mb-16">
        <a
          href="/rm-labs-demo.html"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted font-code transition-colors duration-200 hover:text-accent"
        >
          Open full-screen
          <ArrowUpRight size={13} />
        </a>
      </div>

      <div
        className="grid gap-16 items-start"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div>
          <p className="text-lg text-text-muted leading-[1.8] font-light mb-12">
            {project.description}
          </p>
          <h2 className="font-display text-2xl font-bold mb-6">Technical highlights</h2>
          <ul className="list-none m-0 mb-12 p-0 flex flex-col gap-4">
            {project.highlights.map((h, i) => (
              <li key={h} className="flex gap-4 items-start">
                <span className="text-accent text-xs mt-1.5 flex-shrink-0 font-code">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-text-muted leading-[1.8] font-light m-0">{h}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="inline-flex items-center gap-2 whitespace-nowrap bg-accent text-bg px-5 py-2.5 text-sm font-medium transition-opacity duration-200 hover:opacity-90"
          >
            <ArrowLeft size={14} />
            Back to portfolio
          </Link>
        </div>
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xs text-text-muted tracking-[0.1em] uppercase mb-3 font-code">
              Tech Stack
            </p>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1.5 border border-border text-[rgba(232,234,240,0.7)] font-code"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted tracking-[0.1em] uppercase mb-3 font-code">
              Note
            </p>
            <p className="text-sm text-text-muted leading-[1.7] font-light">
              This is a scripted, front-end walkthrough — the files, questions, and answers
              above are staged to demonstrate the interaction design. There is no live
              retrieval backend behind it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
