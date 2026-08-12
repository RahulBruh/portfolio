export type Job = {
  company: string;
  url: string;
  role: string;
  period: string;
  bullets: string[];
  tech: string[];
};

export const EXPERIENCE: Job[] = [
  {
    company: "Triad Tech",
    url: "https://triad.tech/",
    role: "Software Engineer Intern",
    period: "May – Jul 2026",
    bullets: [
      "Developed and integrated an internal project organization system using Ruby on Rails and React, managing 7 projects for 4 clients and centralizing information on the ’Cork-Board’ platform.",
      "Automated internal workflows using MCP server, leading to an estimated 30% increase in team efficiency for project management and client interactions.",
      "Engineered a Raspberry Pi 5 to send requests to an Oat Foundry Board via Split-Flap API, containerized via Docker to run on boot, and connected Claude via SSH for remote agent-based code edits.",
    ],
    tech: ["Ruby on Rails", "React", "MCP", "Docker", "Claude", "Raspberry Pi"],
  },
  {
    company: "West TN Consulting",
    url: "https://www.westtn.consulting/en",
    role: "Software Engineer Intern",
    period: "Jan 2025 – Present",
    bullets: [
      "Automated contract generation for 30+ clients via a Next.js, React, and Node.js pipeline, saving 30 minutes per contract by parsing form state into server-side templates and PDFs.",
      "Refactored and improved a complex React codebase by fixing 20 critical bugs and addressing performance issues in a challenging, unorganized project.",
    ],
    tech: ["Next.js", "React", "Node.js", "API debugging"],
  },
];
