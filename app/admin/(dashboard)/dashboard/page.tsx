import Link from "next/link";
import { CheckCircle2, Clock, FileStack } from "lucide-react";
import { getAdminStats, getPendingDrafts, getBotLog, getLastBotRunSummary } from "@/lib/server/data";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import TriggerBotButton from "@/components/admin/TriggerBotButton";
import LocalDateTime from "@/components/LocalDateTime";

export default async function AdminDashboardPage() {
  const { pendingDrafts: pendingCount, publishedJobs: publishedCount } = await getAdminStats();
  const pendingDrafts = await getPendingDrafts();
  const botLog = await getBotLog(6);
  const lastRun = await getLastBotRunSummary();

  const stats = [
    { label: "Pending Drafts", value: pendingCount, icon: FileStack, tone: "warning" as const },
    { label: "Published Jobs", value: publishedCount, icon: CheckCircle2, tone: "success" as const },
  ];

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Overview of bot activity and job publishing.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
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

      <Card padding="p-4" className="mt-3 sm:max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Clock size={15} className="text-[var(--color-text-muted)]" />
            Last Bot Run
          </div>
          <TriggerBotButton />
        </div>
        {!lastRun ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            No completed run yet — this fills in once the bot script finishes a full pass
            (locally or via the scheduled GitHub Action).
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              <LocalDateTime iso={lastRun.ranAt} />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-lg font-bold text-[var(--color-success)]">{lastRun.newCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">New</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-text-secondary)]">{lastRun.duplicateCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Duplicate</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-warning)]">{lastRun.expiredCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Expired</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-danger)]">{lastRun.errorCount}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Errors</p>
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card padding="p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Drafts awaiting review</p>
            <Link href="/admin/drafts" className="text-xs font-medium text-[var(--color-primary)]">
              View all
            </Link>
          </div>
          {pendingDrafts.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-text-secondary)]">
              No drafts waiting right now. Run the bot to check for new notifications.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {pendingDrafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/admin/drafts/${draft.id}`}
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

        <Card padding="p-0">
          <div className="border-b border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Bot monitoring log</p>
          </div>
          {botLog.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-text-secondary)]">
              No bot activity yet — this fills in once the bot script runs
              (locally or via the scheduled GitHub Action).
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)] text-sm">
              {botLog.map((entry) => (
                <LogRow
                  key={entry.id}
                  status={entry.status === "error" ? "warning" : entry.status}
                  text={entry.message}
                  timeIso={entry.timestamp}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function LogRow({
  status,
  text,
  timeIso,
}: {
  status: "success" | "warning";
  text: string;
  timeIso: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span
        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
          status === "success" ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"
        }`}
      />
      <div className="min-w-0">
        <p className="text-[var(--color-text-primary)]">{text}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          <LocalDateTime iso={timeIso} />
        </p>
      </div>
    </div>
  );
}
