export type SkillGroup = {
  label: string;
  items: string[];
};

// Mirrors the skill tags on rahulmoka.com/jobapply, most-used first within each group.
export const SKILLS: SkillGroup[] = [
  { label: "Languages", items: ["Python", "JavaScript", "TypeScript", "C++", "SQL"] },
  {
    label: "AI / ML",
    items: [
      "Claude API",
      "LLM",
      "MCP",
      "RAG",
      "GraphRAG",
      "LangGraph",
      "Prompt Engineering",
      "OpenAI API",
      "Ollama",
      "Knowledge Graphs",
      "PyTorch",
      "Hugging Face",
      "scikit-learn",
      "NLP",
      "Diffusers",
      "PEFT",
      "Accelerate",
      "Gradio",
      "Computer Vision",
      "OCR",
      "ElevenLabs",
      "Statistics",
    ],
  },
  {
    label: "Frontend",
    items: ["React", "Next.js", "Tailwind", "React Native", "Expo", "Vite"],
  },
  {
    label: "Backend",
    items: [
      "FastAPI",
      "REST API",
      "Node.js",
      "Express",
      "Flask",
      "Django",
      "Ruby on Rails",
      "Celery",
      "Stripe",
    ],
  },
  { label: "Databases", items: ["PostgreSQL", "pgvector", "SQLite", "Redis"] },
  {
    label: "DevOps",
    items: ["Docker", "Linux", "SSH", "Raspberry Pi", "AWS", "GitHub Actions", "CI/CD"],
  },
  { label: "Testing", items: ["pytest", "Playwright", "Unit Testing"] },
  { label: "Other", items: ["Algorithms", "Agile", "OpenStreetMap"] },
];
