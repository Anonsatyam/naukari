import Link from "next/link";
import { CheckCircle2, FileStack } from "lucide-react";
import { getAdminStats, getPendingDrafts } from "@/lib/server/data";
import Badge from "@/components/Badge";
import Card from "@/components/Card";

export default async function AdminDashboardPage() {
  const { pendingDrafts: pendingCount, publishedJobs: publishedCount } = await getAdminStats();
  const pendingDrafts = await getPendingDrafts();

  const stats = [
    { label: "Pending Drafts", value: pendingCount, icon: FileStack, tone: "warning" as const },
    { label: "Published Jobs", value: publishedCount, icon: CheckCircle2, tone: "success" as const },
  ];

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Overview of drafts and job publishing.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} padding="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{s.label}</span>
                <Icon size={15} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card padding="p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Drafts awaiting review</p>
            <Link href="/admin/my-drafts" className="text-xs font-medium text-[var(--color-primary)]">
              View all
            </Link>
          </div>
          {pendingDrafts.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-text-secondary)]">
              No drafts waiting right now. Create a post to get started.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {pendingDrafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/admin/my-drafts/${draft.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-[var(--color-background)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{draft.jobTitle}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{draft.organization}</p>
                  </div>
                  <Badge tone={draft.confidence === "high" ? "success" : draft.confidence === "medium" ? "warning" : "danger"}>
                    {draft.confidence} confidence
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
