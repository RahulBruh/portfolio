export type Service = {
  tag: string;
  title: string;
  body: string;
  example: string;
  source: string;
};

export const SERVICES: Service[] = [
  {
    tag: "Knowledge Management, with AI",
    title: "Everything your company knows, in a custom AI",
    body: "Policies, procedures, past projects, the reasoning behind decisions. Instead of a folder tree nobody searches, your team asks a question in plain language and gets the answer with the document attached. It's built on your material, speaking in your terms, with your product names and your rules — and when your files don't have the answer, it tells you nothing was found instead of inventing one.",
    example: "“What's our refund policy for annual contracts cancelled mid-term?”",
    source: "Answered from: Client_Agreement_Template_v4.pdf · § 7.2",
  },
  {
    tag: "AI in your workflows",
    title: "Sits inside the work, and learns from it",
    body: "The assistant lives where the work already happens — Slack, Teams, your intake form, your helpdesk, your project tool. And because it sits there, it keeps up with the business: every quote sent, ticket closed, contract signed, and decision written down becomes material it can answer from tomorrow. Your documentation stops going stale, because the day-to-day work is the documentation. No new tab to remember.",
    example:
      "A quote goes out Monday. By Tuesday the system can tell anyone what was priced, on what terms, and why.",
    source: "Connected to the tools you already run — no new process to maintain",
  },
  {
    tag: "Document & contract search",
    title: "Find the clause, not the file",
    body: "Contracts, invoices, proposals and scanned PDFs become searchable by meaning. Ask which agreements auto-renew in Q1 and get the list with the exact language quoted.",
    example: "“Which vendor agreements auto-renew before March?”",
    source: "4 matches across 312 documents · each with the clause quoted",
  },
  {
    tag: "Automations & integrations",
    title: "The steps after the answer",
    body: "Once the system can read your material it can also act on it: draft the reply, fill the form, file the document, flag the exception for a human. You decide what it's allowed to do on its own.",
    example:
      "New contract lands in the shared drive — key dates extracted, calendar reminder created, owner notified.",
    source: "Human approval required on anything that leaves the company",
  },
  {
    tag: "AI strategy audit",
    title: "A straight answer on what's worth doing",
    body: "A short engagement that maps where AI would genuinely save time in your operation, what it would cost, and which ideas to drop. You get a written plan you can act on with me or without me.",
    example:
      "Ranked list of opportunities, effort against payback, and the three not worth building.",
    source: "Deliverable: written report + walkthrough call",
  },
];
