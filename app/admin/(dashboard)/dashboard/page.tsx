import Link from "next/link";
import { Bot, CheckCircle2, Clock3, FileStack } from "lucide-react";
import { jobs, botDrafts } from "@/lib/mock-data";
import Badge from "@/components/Badge";
import Card from "@/components/Card";

export default function AdminDashboardPage() {
  const pendingDrafts = botDrafts.filter((d) => d.status === "pending");
  const publishedJobs = jobs.filter((j) => j.status === "published");

  const stats = [
    {
      label: "Pending Drafts",
      value: pendingDrafts.length,
      icon: FileStack,
      tone: "warning" as const,
    },
    {
      label: "Published Jobs",
      value: publishedJobs.length,
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Bot Runs Today",
      value: 6,
      icon: Bot,
      tone: "primary" as const,
    },
    {
      label: "Avg. Review Time",
      value: "18 min",
      icon: Clock3,
      tone: "neutral" as const,
    },
  ];

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Overview of bot activity and job publishing.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card padding="p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Drafts awaiting review</p>
            <Link href="/admin/drafts" className="text-xs font-medium text-[var(--color-primary)]">
              View all
            </Link>
          </div>
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
        </Card>

        <Card padding="p-0">
          <div className="border-b border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Bot monitoring log</p>
          </div>
          <div className="divide-y divide-[var(--color-border)] text-sm">
            <LogRow status="success" text="Checked csbc.bih.nic.in — no new notifications" time="10 min ago" />
            <LogRow status="success" text="Draft created: Bihar Cooperative Bank Manager" time="1 hr ago" />
            <LogRow status="warning" text="Low-confidence extraction: Agriculture Field Assistant" time="6 hr ago" />
            <LogRow status="success" text="Checked bpsc.bih.nic.in — no new notifications" time="8 hr ago" />
            <LogRow status="success" text="Draft created: Bihar Forest Guard Recruitment" time="14 hr ago" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function LogRow({
  status,
  text,
  time,
}: {
  status: "success" | "warning";
  text: string;
  time: string;
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
        <p className="text-xs text-[var(--color-text-muted)]">{time}</p>
      </div>
    </div>
  );
}
