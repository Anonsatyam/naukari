import { parsePipeTables } from "@/lib/pipeTables";
import Card from "@/components/Card";

// Shared building blocks for the Job / Result / Admit Card detail
// pages — a color-coded collapsible-feeling "Section" card, a numbered
// how-to StepList, and a PipeTableOrText renderer for the bot's raw
// pipe-encoded table text. Originally built for the job details page
// alone; pulled out here so Result and Admit Card detail pages render
// their own rich sections (Important Dates, How to Check Result /
// How to Download Admit Card, Important Links, FAQs, Conclusion) the
// exact same way instead of re-implementing this from scratch.

export type Accent = "blue" | "green" | "purple" | "orange" | "teal" | "amber" | "pink" | "neutral";

// Each section on a detail page gets a color-coded icon chip so a page
// carrying several sections stays visually scannable — colors pull
// from the same CSS-variable palette (globals.css) the rest of the
// site already uses (the semantic tones directly, four new --color-
// accent-* tones for the rest). Sections don't get a colored left-edge
// border on top of that — just the plain card border every other card
// on the site uses.
const ACCENTS: Record<Accent, { iconBg: string; iconText: string }> = {
  blue: {
    iconBg: "bg-[var(--color-primary-tint)]",
    iconText: "text-[var(--color-primary)]",
  },
  green: {
    iconBg: "bg-[var(--color-success-tint)]",
    iconText: "text-[var(--color-success)]",
  },
  purple: {
    iconBg: "bg-[var(--color-accent-purple-tint)]",
    iconText: "text-[var(--color-accent-purple)]",
  },
  orange: {
    iconBg: "bg-[var(--color-accent-orange-tint)]",
    iconText: "text-[var(--color-accent-orange)]",
  },
  teal: {
    iconBg: "bg-[var(--color-accent-teal-tint)]",
    iconText: "text-[var(--color-accent-teal)]",
  },
  amber: {
    iconBg: "bg-[var(--color-warning-tint)]",
    iconText: "text-[var(--color-warning)]",
  },
  pink: {
    iconBg: "bg-[var(--color-accent-pink-tint)]",
    iconText: "text-[var(--color-accent-pink)]",
  },
  neutral: {
    iconBg: "bg-[var(--color-background)]",
    iconText: "text-[var(--color-text-secondary)]",
  },
};

export function Section({
  title,
  icon,
  accent = "neutral",
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: Accent;
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <Card>
      <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-[var(--color-text-primary)]">
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconText}`}>
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function StepList({ items, fallback }: { items: string[]; fallback?: string }) {
  // Belt-and-suspenders: approveDraft validates this shape before
  // insert, but this guards any record already in the database from
  // before that fix, and any other path that might ever write here.
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        {fallback ?? "See the official notification for details."}
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {safeItems.map((step, i) => (
        <li key={step} className="flex gap-3 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[10px] font-bold text-[var(--color-primary)]">
            {i + 1}
          </span>
          <span className="text-[var(--color-text-primary)]">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Important Dates / Exam Pattern / Documents Required / the raw-text
// fallbacks all come through as the pipe-encoded, TABLE_SEP-bounded
// tables lib/pipeTables.ts's parsePipeTables understands (see
// extractHtmlNotificationFields.ts) — rendered here as one or more
// real tables, in source order, each with its own header and caption;
// falls back to plain text for anything that isn't in that shape at
// all (e.g. a hand-edited free-text value), so this never hides
// content it can't parse.
export function PipeTableOrText({ text }: { text: string }) {
  const tables = parsePipeTables(text);
  if (tables.length === 0) {
    return <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>;
  }
  return (
    <div className="space-y-4">
      {tables.map((t, i) => (
        <div key={i} className="space-y-2">
          {t.caption && <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{t.caption}</p>}
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-primary)] text-left text-white">
                    {t.header.map((cell, j) => (
                      <th key={j} className="px-3 py-2 align-top font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="whitespace-normal break-words px-3 py-2 align-top text-[var(--color-text-secondary)]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
