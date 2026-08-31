import type { Metadata } from "next";
import ResultsExplorer from "@/components/ResultsExplorer";

export const metadata: Metadata = {
  title: "Government Job Results",
  description: "Latest results for government recruitment exams, sourced from official notifications.",
};

export default function ResultsPage() {
  return <ResultsExplorer />;
}
