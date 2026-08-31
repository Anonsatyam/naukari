import type { Metadata } from "next";
import { Mail, ShieldCheck, Target } from "lucide-react";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "About Us",
  description: "About Sarkari Naukri — an independent, structured government jobs information platform.",
};

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        About Sarkari Naukri
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Sarkari Naukri is an independent information platform built to
        make government job information clear, structured and easy
        to act on — without ads-driven clutter or ambiguous listings.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={<Target size={18} />}
          title="Our Mission"
          body="Give every job seeker a clean, mobile-first way to find, understand and check eligibility for government jobs — with zero login required."
        />
        <InfoCard
          icon={<ShieldCheck size={18} />}
          title="How We Verify"
          body="Every listing is drafted from an official recruitment notification and reviewed by a human editor before publishing. The source link is always shown."
        />
      </div>

      <Card padding="p-6" className="mt-10">
        <div id="disclaimer" className="scroll-mt-24">
          <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">Disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            This website is an independent, privately run platform and is not
            affiliated with, endorsed by, or an official website of the
            Government of Bihar or any government department. Job information
            is compiled from publicly available official notifications for
            informational purposes only. Applicants must always verify details
            on the official notification and apply only through the official
            application link provided on each listing before taking any
            action or making any payment.
          </p>
        </div>
      </Card>

      <Card padding="p-6" className="mt-6">
        <div id="contact" className="scroll-mt-24">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
            <Mail size={18} /> Contact
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Spotted an error in a listing, or a notification we missed? Reach
            us at{" "}
            <a href="mailto:hello@sarkarinaukri.example" className="font-medium text-[var(--color-primary)]">
              hello@sarkarinaukri.example
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card padding="p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
    </Card>
  );
}
