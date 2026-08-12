import { GitHubIcon, LinkedInIcon } from "@/components/shared/icons";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 px-6">
      <div className="max-w-[1152px] mx-auto flex flex-wrap justify-between items-center gap-4">
        <span className="text-accent text-sm tracking-[0.15em] uppercase font-code">RM.dev</span>
        <span className="text-xs text-text-muted font-code">© 2026 Rahul Moka · Memphis, TN</span>
        <div className="flex gap-4">
          <a
            href="https://github.com/RahulBruh"
            aria-label="GitHub"
            className="text-text-muted flex hover:text-accent"
          >
            <GitHubIcon size={16} />
          </a>
          <a
            href="https://www.linkedin.com/in/rahul-moka-5a62a3248/"
            aria-label="LinkedIn"
            className="text-text-muted flex hover:text-accent"
          >
            <LinkedInIcon size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}
