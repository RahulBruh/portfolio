import type { Metadata } from "next";
import RagHero from "@/components/rag/RagHero";
import RagPillars from "@/components/rag/RagPillars";
import RagArchitecture from "@/components/rag/RagArchitecture";
import RagDemo from "@/components/rag/RagDemo";
import RagServices from "@/components/rag/RagServices";
import RagHowItWorks from "@/components/rag/RagHowItWorks";
import RagStack from "@/components/rag/RagStack";
import RagContact from "@/components/rag/RagContact";

export const metadata: Metadata = {
  title: "Knowledge Management, with AI — Rahul Moka",
  description:
    "Your company already knows the answer to almost every question it gets asked — it's just buried in contracts, PDFs, and email threads. I build AI that reads your material and answers from it, with the source attached.",
};

export default function RagPage() {
  return (
    <main className="rag flex flex-col bg-bg text-text">
      <RagHero />
      <RagPillars />
      <RagArchitecture />
      <RagDemo />
      <RagServices />
      <RagHowItWorks />
      <RagStack />
      <RagContact />
    </main>
  );
}
