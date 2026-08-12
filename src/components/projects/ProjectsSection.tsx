import { PROJECTS } from "@/data/projects";
import ProjectCard from "./ProjectCard";

export default function ProjectsSection() {
  return (
    <section id="projects" className="py-24 px-6 max-w-[1152px] mx-auto">
      <p className="text-xs text-accent tracking-[0.25em] uppercase mb-4 font-code">
        Selected Work
      </p>
      <h2 className="font-display text-5xl font-bold leading-[1.1] mb-16 text-text">Projects</h2>
      <div className="grid gap-px bg-border" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {PROJECTS.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}
      </div>
    </section>
  );
}
