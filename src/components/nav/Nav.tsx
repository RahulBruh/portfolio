"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { scrollToId } from "@/lib/scroll";

const NAV_LINKS = ["Experience", "Projects", "About", "Testimonials", "Contact"];

export default function Nav() {
  const [narrow, setNarrow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const sync = () => {
      setNarrow(mq.matches);
      setMenuOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function goSection(id: string) {
    setMenuOpen(false);
    if (pathname === "/") {
      scrollToId(id);
    } else {
      router.push(`/#${id}`);
      setTimeout(() => scrollToId(id), 60);
    }
  }

  function goHome() {
    setMenuOpen(false);
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(8,12,16,0.9)] backdrop-blur-md border-b border-border">
      <div className="max-w-[1152px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={goHome}
          className="bg-transparent border-none p-0 cursor-pointer text-accent font-code text-sm tracking-[0.15em] uppercase hover:opacity-70 transition-opacity"
        >
          RM.dev
        </button>

        {!narrow && (
          <div className="flex items-center gap-8 flex-shrink-0">
            <div className="flex items-center gap-8">
              {NAV_LINKS.map((label) => (
                <button
                  key={label}
                  onClick={() => goSection(label.toLowerCase())}
                  className="bg-transparent border-none p-0 cursor-pointer font-body text-sm tracking-[0.02em] text-text-muted whitespace-nowrap flex-shrink-0 transition-colors duration-200 hover:text-text"
                >
                  {label}
                </button>
              ))}
            </div>
            <a
              href="mailto:rahulbabu.moka@gmail.com"
              className="text-sm px-4 py-2 border border-accent text-accent tracking-[0.02em] whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-accent hover:text-bg"
            >
              Hire Me
            </a>
          </div>
        )}

        {narrow && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="bg-transparent border-none p-1 cursor-pointer text-text flex flex-shrink-0"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {narrow && menuOpen && (
        <div className="bg-surface border-t border-border px-6 pt-2 pb-6 flex flex-col gap-5">
          {NAV_LINKS.map((label) => (
            <button
              key={label}
              onClick={() => goSection(label.toLowerCase())}
              className="bg-transparent border-none p-0 text-left cursor-pointer font-body text-base text-text-muted transition-colors duration-200 hover:text-accent"
            >
              {label}
            </button>
          ))}
          <a
            href="mailto:rahulbabu.moka@gmail.com"
            className="text-sm px-4 py-2 border border-accent text-accent self-start whitespace-nowrap"
          >
            Hire Me
          </a>
        </div>
      )}
    </nav>
  );
}
