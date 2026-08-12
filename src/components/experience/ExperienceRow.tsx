import { ArrowUpRight } from "lucide-react";
import type { Job } from "@/data/experience";

export default function ExperienceRow({ job }: { job: Job }) {
  return (
    <div className="bg-surface p-10 transition-colors duration-200 hover:bg-surface-raised">
      <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
        <div>
          <h3 className="font-display text-2xl font-bold text-text mb-1 flex items-center gap-2">
            {job.company}
            <a
              href={job.url}
              target="_blank"
              rel="noopener"
              aria-label="Visit company site"
              className="flex text-text-muted transition-colors duration-200 hover:text-accent"
            >
              <ArrowUpRight size={16} />
            </a>
          </h3>
          <p className="text-sm text-text-muted m-0 font-code">{job.role}</p>
        </div>
        <span className="text-xs text-accent border border-accent-border-30 px-3 py-1.5 font-code whitespace-nowrap">
          {job.period}
        </span>
      </div>
      <ul className="list-none m-0 mb-6 p-0 flex flex-col gap-3">
        {job.bullets.map((b) => (
          <li key={b} className="flex gap-4 items-start">
            <span className="text-accent mt-1 flex-shrink-0 text-xs font-code">→</span>
            <p className="text-text-muted leading-[1.7] font-light text-sm m-0">{b}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {job.tech.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 border border-border text-text-muted font-code">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
