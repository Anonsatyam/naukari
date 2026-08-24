"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ExternalLink, CheckCircle2, XCircle, FileText } from "lucide-react";
import { botDrafts } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField } from "@/components/FormField";

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const draft = botDrafts.find((d) => d.id === id);
  if (!draft) notFound();

  const [title, setTitle] = useState(draft.extractedFields.title ?? "");
  const [organization, setOrganization] = useState(draft.extractedFields.organization ?? "");
  const [vacancies, setVacancies] = useState(draft.extractedFields.totalVacancies ?? 0);
  const [qualification, setQualification] = useState(draft.extractedFields.qualification ?? "");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  if (decision) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        {decision === "approved" ? (
          <CheckCircle2 size={32} className="mx-auto text-[var(--color-success)]" />
        ) : (
          <XCircle size={32} className="mx-auto text-[var(--color-danger)]" />
        )}
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">
          Draft {decision === "approved" ? "approved and published" : "rejected"}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {decision === "approved"
            ? "This job is now live on the public site."
            : "This draft has been discarded and will not be published."}
        </p>
        <Button className="mt-5" onClick={() => router.push("/admin/drafts")}>
          Back to Drafts
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Bot Drafts", href: "/admin/drafts" },
          { label: draft.jobTitle },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Review Draft</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Detected {formatDate(draft.detectedAt)} · Extraction confidence:{" "}
            <Badge tone={draft.confidence === "high" ? "success" : draft.confidence === "medium" ? "warning" : "danger"}>
              {draft.confidence}
            </Badge>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Editable fields */}
        <Card className="space-y-4">
          <TextField label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="Organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Total Vacancies"
              type="number"
              value={vacancies}
              onChange={(e) => setVacancies(Number(e.target.value) || 0)}
            />
            <TextField
              label="Qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-[var(--color-background)] p-3 text-xs text-[var(--color-text-secondary)]">
            More fields (dates, fees, selection process, syllabus) are editable here
            in the same pattern — kept minimal in this mock for review speed.
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row">
            <Button onClick={() => setDecision("approved")} className="flex-1">
              <CheckCircle2 size={15} /> Approve &amp; Publish
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDecision("rejected")}
              className="flex-1 border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:border-[var(--color-danger)]"
            >
              <XCircle size={15} /> Reject
            </Button>
          </div>
        </Card>

        {/* Source */}
        <Card className="h-fit space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <FileText size={15} /> Source Notification
          </p>
          <p className="break-all text-xs text-[var(--color-text-secondary)]">{draft.sourceUrl}</p>
          <a
            href={draft.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]"
          >
            Open source PDF <ExternalLink size={13} />
          </a>
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Raw extracted data
            </p>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {JSON.stringify(draft.extractedFields, null, 2)}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
