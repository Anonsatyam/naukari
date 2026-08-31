import type { Metadata } from "next";
import EligibilityChecker from "@/components/EligibilityChecker";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Eligibility Checker — Government Jobs",
  description: "Check your eligibility for any government job with a clear, reasoned breakdown.",
};

export default async function EligibilityCheckerPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Eligibility Checker" }]} />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        Eligibility Checker
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        Select a job and enter your details. We&apos;ll show exactly which
        conditions you meet — and which you don&apos;t, with the reason why.
      </p>

      <div className="mt-6">
        <EligibilityChecker initialJobId={job} />
      </div>
    </div>
  );
}
