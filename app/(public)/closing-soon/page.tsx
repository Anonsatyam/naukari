import type { Metadata } from "next";
import ClosingSoonExplorer from "@/components/ClosingSoonExplorer";

export const metadata: Metadata = {
  title: "Closing Soon — Government Jobs",
  description: "Government job applications closing within the next 7 days.",
};

export default function ClosingSoonPage() {
  return <ClosingSoonExplorer />;
}
