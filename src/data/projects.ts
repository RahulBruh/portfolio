export type Project = {
  id: string;
  title: string;
  tag: string;
  shortDesc: string;
  description: string;
  img: string;
  img2?: string;
  tech: string[];
  github?: string;
  highlights: string[];
  /** Overrides the default `/projects/[id]` link — for projects with their own dedicated route. */
  href?: string;
};

export const PROJECTS: Project[] = [
  {
    id: "rm-labs",
    title: "RM Labs",
    tag: "Interactive Demo · Sep 2026",
    shortDesc:
      "A citation-grounded document Q&A concept — drop in your files, ask in plain English, and every claim in the answer traces back to the exact passage it came from.",
    description:
      "RM Labs is a UX concept for a document Q&A assistant: drag in whatever files you already have — contracts, policies, a renewals spreadsheet — and ask questions in plain English instead of hunting through pages by hand. The interesting constraint was trust, not retrieval: every sentence in an answer carries a numbered citation, and hovering or clicking it cross-highlights the exact retrieved passage and page it came from, so nothing in the answer is left unverifiable.",
    img: "/assets/rm-labs-mark.svg",
    tech: [
      "Vanilla JavaScript",
      "CSS Grid & Custom Properties",
      "Web Animations",
      "ARIA / Accessibility",
    ],
    href: "/rm-labs",
    highlights: [
      "Built a fully scripted, dependency-free interaction sequence (Promise-chained async steps with a cancellation token) that drives a three-pane workspace — sources, conversation, and retrieved passages — through file upload, indexing, question typing, retrieval, and token-by-token answer streaming.",
      "Designed bidirectional citation linking: inline citation pills in the streamed answer and their source passage cards share hover/focus/click state, so a reader can jump from a claim straight to the sentence that grounds it and back.",
      "Implemented an accessible file-scope control (keyboard-operable checkbox list with ARIA roles) that visibly changes what the assistant is allowed to search, making the retrieval boundary a first-class, inspectable part of the UI rather than a hidden backend detail.",
      "Respected `prefers-reduced-motion` end-to-end (typing, streaming, count-up, and transition timings all collapse under a shared time-scaling helper) and kept the whole demo replayable and interruptible via a single monotonically incrementing run token.",
    ],
  },
  {
    id: "skills-support-agent",
    title: "Skills-Based Support Agent",
    tag: "Agentic AI · Oct 2026",
    shortDesc:
      "A player-support triage agent where every domain is a declarative SKILL.md file — add or change a support area without touching code.",
    description:
      "A plug-and-play player-support triage agent built with LangGraph and Claude. Each support domain (billing, account recovery, bug reports, connectivity) is a markdown SKILL.md file that defines its intake questions, business rules, escalation policy, tool allow-list and persona; the graph itself holds no domain knowledge. Requirements came first: a BRD, user stories, workflow maps and design decisions were committed before any code, and the backlog was tracked as GitHub Issues and milestones.",
    img: "/assets/skills-support-agent.svg",
    tech: [
      "LangGraph",
      "Claude API",
      "Python",
      "MCP (FastMCP)",
      "Pydantic",
      "GitHub Actions",
      "uv",
    ],
    github: "https://github.com/RahulBruh/skills-support-agent",
    highlights: [
      "Designed a domain-agnostic LangGraph pipeline (route → intake → ask → act → decide) where all business logic lives in declarative SKILL.md files; the connectivity domain was added in a single 25-line markdown file with zero Python changes.",
      "Cut tokens per task by 72% (26,468 → 7,400) and cost per task by 65% ($0.0292 → $0.0102) by rewriting skills concisely and switching to progressive disclosure, where the router sees only skill descriptions and the full skill loads after routing, while decision accuracy held at 86.8% → 92.5% across 53 labeled cases (overlapping 95% CIs, so no regression rather than a proven gain).",
      "Exposed ticket, account, purchase-history, knowledge-base and service-status lookups as five shared MCP tools, with each skill's allow-list enforced by the engine; the same server works with Claude Desktop, Claude Code or any MCP client.",
      "Wrote the planning artifacts before code: a business requirements document, user stories, workflow maps and ADRs, with work tracked through 15 GitHub issues across milestones.",
    ],
  },
  {
    id: "agent-eval-harness",
    title: "Agent Eval Harness",
    tag: "AI Evaluation · Oct 2026",
    shortDesc:
      "A benchmarking CLI that runs labeled tasks across agent configs and reports accuracy, tokens, cost and latency — with a regression gate for CI.",
    description:
      "A benchmarking harness (the `evalh` CLI) that runs the same 60 hand-labeled triage cases across a matrix of model × skill set × context-loading mode, scores each decision deterministically, and reports accuracy with Wilson 95% intervals alongside tokens, cost and latency per task. It evaluates the skills-support-agent and produced the numbers behind its 72% token reduction, including a 2×2 ablation that separates the effect of each change.",
    img: "/assets/agent-eval-harness.svg",
    tech: [
      "Python",
      "Claude API",
      "Pydantic",
      "YAML datasets",
      "GitHub Actions",
      "pytest",
      "uv",
    ],
    github: "https://github.com/RahulBruh/agent-eval-harness",
    highlights: [
      "Built a 60-case labeled dataset spanning billing, account recovery, bug reports, connectivity, out-of-scope, multi-intent, multi-turn and prompt-injection cases, with labels derived from skill rules and mock backend data (never model output) and a changelog recording every label change.",
      "Ran a 2×2 ablation on Claude Haiku 4.5 isolating the two optimizations: progressive loading alone cut tokens 61.6%, concise skill files alone 49.9%, and both together 72.0% — nearly all of it input tokens, with output flat.",
      "Used the evals to find real problems: a routing regression introduced by the token optimization (billing questions like “Do you accept PayPal?” fell through to human escalation), ambiguous business rules tightened before any model run, and a 3-case run-to-run swing at temperature 0 that motivated reporting every accuracy figure with a confidence interval.",
      "Implemented run / compare / baseline / gate / cases commands with an on-disk cache keyed by an agent code + skills + data fingerprint, results exported as JSON, Markdown and HTML reports, and a gate command that exits non-zero on regression for use as a pull-request check.",
    ],
  },
  {
    id: "stripe-self-healing-api",
    title: "Self-Maintaining Stripe API",
    tag: "Multi-Agent AI · Aug 2026",
    shortDesc:
      "A multi-agent pipeline that detects Stripe API breaking changes, fixes affected code, and opens a PR — inspired by YC's Request for Startups on self-sustaining APIs.",
    description:
      "Inspired by Y Combinator's Request for Startups theme on self-sustaining APIs — the idea that API providers shouldn't just announce breaking changes, they should apply the fixes. Built a 5-agent pipeline (Planning, Retriever, Synthesizer, Critic/Verifier, Orchestrator) that watches Stripe's API changelog, finds every affected call site in a codebase, drafts a fix, verifies it by running the codebase's real test suite in a sandbox, and opens a human-reviewed pull request.",
    img: "/assets/stripe-self-maintaining-api-logo.png",
    tech: [
      "Claude API",
      "Python",
      "ChromaDB",
      "SQLite",
      "AST",
      "Docker",
      "GitHub CLI",
      "Stripe SDK",
    ],
    github: "https://github.com/RahulBruh/stripe-self-maintaining-api",
    highlights: [
      "Architected a 5-agent pipeline (Planning, Retriever, Synthesizer, Critic/Verifier, Orchestrator) that autonomously detects Stripe API changes and generates fix PRs, integrating the Claude API for structured LLM reasoning (forced tool-use calls for classification, code synthesis, and verification), ChromaDB for semantic code retrieval, SQLite for relational state, Python AST analysis for call-site extraction behind a pluggable language-adapter interface, and Docker + GitHub CLI for sandboxed test verification and automated PR delivery.",
      "Diagnosed and resolved two failure classes that crashed the pipeline on rerun: non-idempotent re-indexing that silently duplicated call-site records (fixed by clearing state before each index pass) and a fragile LLM-reproduced-text patching strategy that broke on whitespace drift (redesigned to anchor every patch on byte-exact AST source spans via ast.get_source_segment, eliminating the failure mode instead of tolerating it).",
      "Validated end-to-end against a synthetic repo modeling a real historical Stripe deprecation (the 2020 Plans-to-Prices migration): reached 100% precision on affected-usage detection after calibrating a semantic-search distance threshold that removed a false-positive match, and verified fixes via real sandboxed pytest execution, correctly distinguishing 2 stale-test failures from actual regressions before opening a fully automated PR.",
    ],
  },
  {
    id: "sdxl-lora",
    title: "SDXL LoRA Fine-Tune",
    tag: "AI / ML · Jul 2026",
    shortDesc:
      "Cyberpunk-style LoRA adapter for Stable Diffusion XL, trained end-to-end on a 24GB GPU via RunPod.",
    description:
      "Fine-tuned Stable Diffusion XL via LoRA (Diffusers, PEFT) to specialize image generation toward a custom visual style, training a low-rank adapter on the UNet rather than the full 2.6B+ parameter model.",
    img: "/assets/sdxl-lora.png",
    img2: "/assets/sdxl-lora-2.png",
    tech: [
      "PyTorch",
      "Diffusers",
      "PEFT",
      "Accelerate",
      "bitsandbytes",
      "Hugging Face Datasets",
      "Gradio",
    ],
    github: "https://github.com/RahulBruh/sdxl-cyberpunk-lora",
    highlights: [
      "Fine-tuned Stable Diffusion XL via LoRA (Diffusers, PEFT) to specialize image generation toward a custom visual style, training a low-rank adapter on the UNet rather than the full 2.6B+ parameter model",
      "Engineered a memory-constrained training pipeline in PyTorch and Accelerate (bf16 mixed precision, gradient checkpointing, 8-bit Adam via bitsandbytes, gradient accumulation) trained on a 24GB GPU rented from RunPod",
      "Built the end-to-end pipeline from scratch: dataset curation/preprocessing with Hugging Face Datasets, checkpoint-based overfitting analysis across training runs, and a CLI plus Gradio web app for inference",
    ],
  },
  {
    id: "remote-dev",
    title: "Remote Dev & Automation System",
    tag: "Systems / C++ · Jul 2026",
    shortDesc:
      "A Raspberry Pi gateway that wakes, reaches and drives a home machine from anywhere — plus health and coursework automation.",
    description:
      "A C++ remote development system using Boost.Asio and PTY/ConPTY to expose a live terminal session on a home machine, controllable from anywhere via a Raspberry Pi acting as an always-on gateway.",
    img: "/assets/remote-dev.png",
    tech: [
      "C++",
      "Boost.Asio",
      "PTY/ConPTY",
      "Raspberry Pi",
      "Wake-on-LAN",
      "SSH",
      "HealthKit API",
      "Canvas LMS API",
      "Claude API",
    ],
    github: "https://github.com/RahulBruh/wol-trigger",
    highlights: [
      "Built a C++ remote development system using Boost.Asio and PTY/ConPTY to expose a live terminal session on a home machine, controllable from anywhere via a Raspberry Pi acting as an always-on gateway.",
      "Configured Wake-on-LAN and an iOS Shortcut to remotely power on the home PC from sleep, then connected via Termius over SSH to establish a terminal session directly from an iPhone, including launching Claude Code to work on projects remotely.",
      "Integrated the Apple Watch (HealthKit) API to continuously log heart rate and calories burned, and the Canvas LMS API to automatically verify assignment submission status and retrieve turned-in files.",
      "Integrated Claude API to programmatically compare submitted assignment files against instructor-provided directions, flagging missing or incomplete requirements before grading.",
    ],
  },
  {
    id: "civicsource",
    title: "Civic Source — Hackathon",
    tag: "Hack Memphis · Nov 2025",
    img: "/assets/civicsource.png",
    shortDesc:
      "AI procurement platform linking Memphis authorities with 20,000+ small businesses.",
    description:
      "An AI procurement platform built at Hack Memphis, designed to link Memphis authorities with 20,000+ small businesses and reduce the outsourcing of city contracts — addressing the $41 million that leaves the Memphis community annually.",
    tech: [
      "React.js",
      "Tailwind CSS",
      "PostgreSQL",
      "Claude API",
      "Flask",
      "Google Places API",
      "Yelp API",
    ],
    github: "https://github.com/nepfvak/civicsource.github.io",
    highlights: [
      "Architected a sophisticated AI procurement platform utilizing React.js, Tailwind CSS, PostgreSQL, and Claude API, designed to link Memphis authorities with 20,000+ small businesses and expanding local business contract win rate by 12%.",
      "Designed to reduce outsourcing of city contracts to support local small businesses, addressing the $41 million that leaves the Memphis community annually.",
      "Engineered the back-end interface with Flask and Google Places API, and Yelp API, ensuring an intuitive user experience, completed in 18 hours with a 4-person team under a strict 24-hour deadline.",
    ],
  },
];
