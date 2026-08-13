import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PROJECTS } from "@/data/projects";
import ProjectDetailHero from "@/components/project-detail/ProjectDetailHero";
import OtherProjectsSidebar from "@/components/project-detail/OtherProjectsSidebar";
import SdxlLoraDemo from "@/components/project-detail/SdxlLoraDemo";
import { GitHubIcon } from "@/components/shared/icons";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const project = PROJECTS.find((p) => p.id === slug);
  if (!project) return {};
  return {
    title: `${project.title} — Rahul Moka`,
    description: project.shortDesc,
  };
}

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const project = PROJECTS.find((p) => p.id === slug);
  if (!project) notFound();

  const otherProjects = PROJECTS.filter((p) => p.id !== project.id);

  return (
    <div>
      <ProjectDetailHero project={project} />
      {project.id === "sdxl-lora" && (
        <div className="max-w-[1152px] mx-auto px-6 pt-16">
          <SdxlLoraDemo />
        </div>
      )}
      <div
        className="max-w-[1152px] mx-auto px-6 py-16 grid gap-16 items-start"
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
          <div className="flex gap-4 flex-wrap">
            <a
              href={project.github}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 whitespace-nowrap border border-border text-text-muted px-5 py-2.5 text-sm transition-all duration-200 hover:text-accent hover:border-accent-border-40"
            >
              <GitHubIcon size={15} />
              View Code
            </a>
            <Link
              href="/"
              className="flex items-center gap-2 whitespace-nowrap bg-accent text-bg px-5 py-2.5 text-sm font-medium transition-opacity duration-200 hover:opacity-90"
            >
              <ArrowLeft size={14} />
              Back to portfolio
            </Link>
          </div>
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
          <OtherProjectsSidebar projects={otherProjects} />
        </div>
      </div>
    </div>
  );
}
