export type SkillGroup = {
  label: string;
  items: string[];
};

export const SKILLS: SkillGroup[] = [
  { label: "Languages", items: ["C++", "Ruby", "Java", "Python", "JavaScript", "HTML", "CSS"] },
  {
    label: "Web",
    items: [
      "AWS",
      "RESTful APIs",
      "Responsive Design",
      "UI Development",
      "Front-End",
      "Back-End",
      "Single Page Apps",
      "Serverless",
    ],
  },
  {
    label: "Libraries",
    items: [
      "PyTorch",
      "React.js",
      "Node.js",
      "Django",
      "Flask",
      "Ruby on Rails",
      "Pandas",
      "NumPy",
      "Pygame",
      "Celery",
    ],
  },
  { label: "Tools", items: ["Git", "VS Code", "Cursor", "GitHub Copilot"] },
];
