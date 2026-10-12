import { FileCheck2, Workflow, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: FileCheck2,
    title: "Grounded in your documents",
    body: "Every answer carries a citation back to the exact passage it came from. When your files don't have the answer, it says so instead of inventing one.",
  },
  {
    icon: Workflow,
    title: "Lives in your workflow",
    body: "Slack, Teams, your helpdesk, your intake form — the assistant sits where the work already happens, so nothing new has to be checked or maintained.",
  },
  {
    icon: ShieldCheck,
    title: "Humans approve the actions",
    body: "It can draft, file, and flag on its own, but anything that leaves the company or changes a record waits on a person to sign off first.",
  },
];

export default function RagPillars() {
  return (
    <section className="px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full pb-24">
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="bg-surface border p-7"
            style={{ borderRadius: "var(--rag-radius-lg)", borderColor: "var(--color-border)" }}
          >
            <div
              className="inline-flex items-center justify-center w-11 h-11 mb-5 text-accent"
              style={{ borderRadius: "var(--rag-radius-md)", background: "var(--rag-accent-soft)" }}
            >
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <h3 className="font-medium text-lg leading-[1.2] text-text mb-2.5">{title}</h3>
            <p className="text-sm text-text-muted leading-[1.6] m-0">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
