import type { Project } from "@/data/projects";
import ProjectImageFrame from "@/components/shared/ProjectImageFrame";

export default function ProjectDetailHero({ project }: { project: Project }) {
  const images = [project.img, ...(project.img2 ? [project.img2] : [])];

  return (
    <div className="relative h-[55vh] min-h-[340px] p-4">
      <ProjectImageFrame images={images} alt={project.title} className="h-full" sizes="100vw" />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #080c10, rgba(8,12,16,0.4), transparent)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="max-w-[1152px] mx-auto px-6 pb-12">
          <span className="block text-xs text-accent tracking-[0.25em] uppercase mb-3 font-code">
            {project.tag}
          </span>
          <h1 className="font-display italic font-bold text-[clamp(2.5rem,7vw,4.5rem)] text-text m-0">
            {project.title}
          </h1>
        </div>
      </div>
    </div>
  );
}
