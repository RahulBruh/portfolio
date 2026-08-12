import { EXPERIENCE } from "@/data/experience";
import ExperienceRow from "./ExperienceRow";

export default function Experience() {
  return (
    <section
      id="experience"
      className="py-28 px-6 bg-surface border-t border-b border-border"
    >
      <div className="max-w-[1152px] mx-auto">
        <p className="text-xs text-accent tracking-[0.25em] uppercase mb-4 font-code">
          Work History
        </p>
        <h2 className="font-display text-5xl font-bold leading-[1.1] mb-16 text-text">
          Experience
        </h2>
        <div className="flex flex-col gap-px bg-border">
          {EXPERIENCE.map((job) => (
            <ExperienceRow key={job.company} job={job} />
          ))}
        </div>
      </div>
    </section>
  );
}
