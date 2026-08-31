import Link from "next/link";
import { ArrowUpRight, Briefcase, Clock, Users } from "lucide-react";
import { Job } from "@/lib/types";
import { formatDate, daysUntil } from "@/lib/utils";
import { getApplicationEndDate, isClosingSoon, isRecent } from "@/lib/dateHelpers";
import Badge from "./Badge";
import WhatsAppShareButton from "./WhatsAppShareButton";

export default function JobCard({ job }: { job: Job }) {
  const endDate = getApplicationEndDate(job);
  const closingSoon = isClosingSoon(job);
  const remaining = endDate ? daysUntil(endDate) : null;
  const isNew = isRecent(job.publishedAt);

  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 transition-all hover:border-[var(--color-primary)] hover:shadow-[0_4px_20px_rgba(60,68,194,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-text-secondary)]">
            {job.organization}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
            {job.title}
          </h3>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-1 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-primary)]"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} />
          {job.totalVacancies > 0 ? `${job.totalVacancies.toLocaleString("en-IN")} posts` : "Posts: as notified"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Briefcase size={14} />
          {job.qualification}
        </span>
        {endDate && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            Closes {formatDate(endDate)}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isNew && <Badge tone="success">New</Badge>}
          <Badge tone="primary">{job.category}</Badge>
          {job.tags?.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
          {closingSoon && remaining !== null && (
            <Badge tone="danger">
              {remaining === 0 ? "Closes today" : `Closing in ${remaining}d`}
            </Badge>
          )}
        </div>
        <WhatsAppShareButton path={`/jobs/${job.slug}`} text={job.title} />
      </div>
    </Link>
  );
}
