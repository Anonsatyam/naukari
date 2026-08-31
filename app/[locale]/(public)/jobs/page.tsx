import { Suspense } from "react";
import type { Metadata } from "next";
import JobsExplorer from "@/components/JobsExplorer";

export const metadata: Metadata = {
  title: "Government Jobs — Search & Filters",
  description:
    "Browse and filter government job vacancies by category, department and qualification.",
};

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsExplorer />
    </Suspense>
  );
}
