import {
  FileText,
  MessagesSquare,
  Database,
  Search,
  LayoutDashboard,
  BadgeCheck,
  Zap,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";

type Box = { icon: typeof FileText; title: string; body: string };

const SOURCES: Box[] = [
  { icon: FileText, title: "Documents & files", body: "Contracts, policies, PDFs" },
  { icon: MessagesSquare, title: "Your tools", body: "Slack, Teams, helpdesk, email" },
  { icon: Database, title: "Structured data", body: "Spreadsheets, tickets, CRM" },
];

const OUTPUTS: Box[] = [
  { icon: BadgeCheck, title: "Grounded answers", body: "Every claim cites its source" },
  { icon: Zap, title: "Automations", body: "Drafts, files, flags — human-approved" },
];

function ArchBox({ icon: Icon, title, body }: Box) {
  return (
    <div
      className="bg-surface border p-5 flex items-start gap-3.5"
      style={{ borderRadius: "var(--rag-radius-md)", borderColor: "var(--color-border)" }}
    >
      <div
        className="inline-flex flex-shrink-0 items-center justify-center w-9 h-9 text-accent"
        style={{ borderRadius: "var(--rag-radius-sm)", background: "var(--rag-accent-soft)" }}
      >
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-medium text-[15px] leading-[1.2] text-text mb-1">{title}</p>
        <p className="text-[13px] text-text-muted leading-[1.5] m-0">{body}</p>
      </div>
    </div>
  );
}

function FlowArrow({ bidirectional = false }: { bidirectional?: boolean }) {
  const Icon = bidirectional ? ArrowUpDown : ArrowUp;
  return (
    <div className="flex justify-center py-2 text-text-muted/60" aria-hidden="true">
      <Icon size={16} strokeWidth={1.5} />
    </div>
  );
}

export default function RagArchitecture() {
  return (
    <section
      id="architecture"
      className="scroll-mt-20 px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full"
      style={{ paddingBottom: "var(--rag-section-py)" }}
    >
      <span
        className="inline-block text-accent text-xs uppercase tracking-[0.04em] font-semibold mb-5 px-4 py-1.5"
        style={{ borderRadius: "var(--rag-radius-full)", background: "var(--rag-accent-soft)" }}
      >
        Architecture
      </span>
      <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-3 text-text">
        How it&apos;s built
      </h2>
      <p className="text-text-muted leading-[1.55] mb-10 max-w-[58ch]">
        Your material gets pulled into one private, searchable index. Everything above it — the
        interface, the answers, the actions — reads and writes through that single source of
        truth.
      </p>

      <div className="max-w-[720px] mx-auto">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {OUTPUTS.map((o) => (
            <ArchBox key={o.title} {...o} />
          ))}
        </div>

        <FlowArrow bidirectional />

        <ArchBox icon={LayoutDashboard} title="App layer" body="Chat, Slack bot, or an internal page" />

        <FlowArrow bidirectional />

        <ArchBox icon={Search} title="Private index" body="Your documents, embedded and searchable by meaning" />

        <FlowArrow />

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {SOURCES.map((s) => (
            <ArchBox key={s.title} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
