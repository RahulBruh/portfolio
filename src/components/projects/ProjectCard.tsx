import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import ProjectImageFrame from "@/components/shared/ProjectImageFrame";

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const images = [project.img, ...(project.img2 ? [project.img2] : [])];
  const techPreview = project.tech.slice(0, 3);
  const techMore = project.tech.length > 3 ? `+${project.tech.length - 3}` : "";

  return (
    <div className="relative bg-surface flex flex-col">
      <div className="relative h-48 p-2">
        <ProjectImageFrame images={images} alt={project.title} className="h-full" />
        <span className="absolute top-4 left-4 z-10 pointer-events-none text-xs text-accent border border-accent-border-40 px-2 py-1 bg-[rgba(8,12,16,0.8)] font-code">
          {project.tag}
        </span>
        <span className="absolute top-4 right-4 z-10 pointer-events-none text-xs text-[rgba(107,117,133,0.6)] font-code">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <Link
        href={`/projects/${project.id}`}
        className="flex-1 text-left bg-surface border-none border-t border-border p-6 cursor-pointer transition-colors duration-300 hover:bg-surface-raised block"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="font-display text-xl font-bold text-text m-0">{project.title}</h3>
          <ArrowUpRight size={18} className="text-text-muted flex-shrink-0 mt-1" />
        </div>
        <p className="text-sm text-text-muted leading-[1.7] mb-4 font-light">{project.shortDesc}</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {techPreview.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 border border-border text-text-muted font-code">
              {t}
            </span>
          ))}
          {techMore && (
            <span className="text-xs text-[rgba(107,117,133,0.5)] px-1 font-code">{techMore}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
