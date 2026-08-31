import { parsePipeBlocks, TOTAL_ROW_LABEL } from "@/lib/pipeTables";
import Card from "@/components/Card";


export type Accent = "blue" | "green" | "purple" | "orange" | "teal" | "amber" | "pink" | "neutral";

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

export function PipeTableOrText({ text }: { text: string }) {
  const blocks = parsePipeBlocks(text);
  if (blocks.length === 0) {
    return <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>;
  }
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        const t = block.table;
        return (
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
                    {t.body.map((row, r) => {
                      const isTotalRow = r === t.body.length - 1 && TOTAL_ROW_LABEL.test(row[0] ?? "");
                      return (
                        <tr key={r} className={isTotalRow ? "bg-[var(--color-background)] font-semibold" : undefined}>
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className={`whitespace-normal break-words px-3 py-2 align-top ${
                                isTotalRow ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
