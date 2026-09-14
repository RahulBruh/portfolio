import type { Metadata } from "next";
import RagHero from "@/components/rag/RagHero";
import RagDemo from "@/components/rag/RagDemo";
import RagServices from "@/components/rag/RagServices";
import RagHowItWorks from "@/components/rag/RagHowItWorks";
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
      <RagDemo />
      <RagServices />
      <RagHowItWorks />
      <RagContact />
    </main>
  );
}
