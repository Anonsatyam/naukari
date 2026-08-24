import type { Metadata } from "next";
import ResultsExplorer from "@/components/ResultsExplorer";

export const metadata: Metadata = {
  title: "Bihar Government Job Results",
  description: "Latest results for Bihar government recruitment exams, sourced from official notifications.",
};

export default function ResultsPage() {
  return <ResultsExplorer />;
}
