import RagDemoFrame from "./RagDemoFrame";

export default function RagDemo() {
  return (
    <section
      id="demo"
      className="scroll-mt-20 pb-[98px] px-[clamp(20px,5vw,72px)] max-w-[1200px] mx-auto w-full"
    >
      <span className="block text-accent text-xs uppercase tracking-[0.08em] font-medium mb-4">
        See it work
      </span>
      <h2 className="font-medium text-[32px] leading-[1.15] tracking-[-0.015em] mb-3 text-text">
        A walkthrough
      </h2>
      <p className="text-text-muted leading-[1.55] mb-6 max-w-[58ch]">
        Files go in, questions come out answered — and every claim points back to the page it came
        from. Watch it run, or ask one of the sample questions yourself.
      </p>
      <RagDemoFrame />
    </section>
  );
}
