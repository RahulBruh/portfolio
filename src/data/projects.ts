export type Project = {
  id: string;
  title: string;
  tag: string;
  shortDesc: string;
  description: string;
  img: string;
  img2?: string;
  tech: string[];
  github: string;
  highlights: string[];
};

export const PROJECTS: Project[] = [
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
