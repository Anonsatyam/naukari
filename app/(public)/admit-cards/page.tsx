import type { Metadata } from "next";
import AdmitCardsExplorer from "@/components/AdmitCardsExplorer";

export const metadata: Metadata = {
  title: "Bihar Government Exam Admit Cards",
  description: "Download links and exam dates for Bihar government recruitment admit cards.",
};

export default function AdmitCardsPage() {
  return <AdmitCardsExplorer />;
}
