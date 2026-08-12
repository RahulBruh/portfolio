import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

export default function OtherProjectsSidebar({ projects }: { projects: Project[] }) {
  return (
    <div className="border-t border-border pt-8">
      <p className="text-xs text-text-muted tracking-[0.1em] uppercase mb-3 font-code">
        Other Projects
      </p>
      <div className="flex flex-col">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="w-full text-left flex items-center justify-between gap-2 py-3 border-b border-border transition-colors duration-200 hover:border-accent-border-30"
          >
            <div>
              <div className="text-sm font-medium text-text font-display">{p.title}</div>
              <div className="text-xs text-text-muted font-code">{p.tag}</div>
            </div>
            <ArrowUpRight size={14} className="text-text-muted flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
