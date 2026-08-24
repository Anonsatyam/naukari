import type { Metadata } from "next";
import ClosingSoonExplorer from "@/components/ClosingSoonExplorer";

export const metadata: Metadata = {
  title: "Closing Soon — Bihar Government Jobs",
  description: "Bihar government job applications closing within the next 7 days.",
};

export default function ClosingSoonPage() {
  return <ClosingSoonExplorer />;
}
