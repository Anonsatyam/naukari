import type { Metadata } from "next";
import AdmitCardsExplorer from "@/components/AdmitCardsExplorer";

export const metadata: Metadata = {
  title: "Government Exam Admit Cards",
  description: "Download links and exam dates for government recruitment admit cards.",
};

export default function AdmitCardsPage() {
  return <AdmitCardsExplorer />;
}
