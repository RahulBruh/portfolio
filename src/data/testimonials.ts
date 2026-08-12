export type Testimonial = {
  quote: string;
  name: string;
  initials: string;
  title: string;
  company: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I'm delighted to recommend Rahul, who interned with us a Triad this summer. He consistently gravitated toward the hardest problems on the team and dug into them rather than settling for easier wins, He'd be a strong addition to any team looking for someone with real intellectual curiosity and grit.",
    name: "Matt Cook",
    initials: "MC",
    title: "Reference · Triad Tech",
    company: "matt@triad.tech",
  },
  // TODO: placeholder quote pending Mic's real wording — see design handoff README "Known gaps"
  {
    quote:
      "Exceptional work ethic and technical range for someone early in their career. Rahul automated workflows that meaningfully changed how our team operates — the 30% efficiency gain was real and immediate.",
    name: "Mic Lainkeffeler",
    initials: "ML",
    title: "Reference · West TN Consulting",
    company: "miclainkeffeler@westtn.consulting",
  },
  {
    quote:
      "Rahul has the insatiable desire to learn and excel that I wish I had. He's constantly exploring new technologies to add to his toolbelt. I'm constantly impressed by watching him learn and apply a range of solutions to real-world problems like training custom AI models, building MCP servers, and full stack web development.",
    name: "Kevin Reed",
    initials: "KR",
    title: "Mentor · Sr. Engineer, EA",
    company: "August 2026",
  },
];
