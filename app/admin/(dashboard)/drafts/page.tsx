import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { botDrafts } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";

export default function AdminDraftsPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Bot Drafts" }]} />

      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Bot Drafts</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Notifications detected by the bot, waiting for your review before they go live.
      </p>

      <Card padding="p-0" className="mt-5 overflow-hidden">
        <div className="hidden grid-cols-[1fr_140px_140px_100px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:grid">
          <span>Job</span>
          <span>Detected</span>
          <span>Confidence</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {botDrafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/admin/drafts/${draft.id}`}
              className="grid grid-cols-1 gap-2 px-4 py-4 hover:bg-[var(--color-background)] md:grid-cols-[1fr_140px_140px_100px] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {draft.jobTitle}
                  <ArrowUpRight size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">{draft.organization}</p>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] md:text-sm">
                {formatDate(draft.detectedAt)}
              </span>
              <span>
                <Badge tone={draft.confidence === "high" ? "success" : draft.confidence === "medium" ? "warning" : "danger"}>
                  {draft.confidence}
                </Badge>
              </span>
              <span>
                <Badge tone="neutral">{draft.status}</Badge>
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
