import { ExternalLink, Link2 } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import Card from "@/components/Card";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";
import { ImportantLink } from "@/lib/types";
import { documentViewerHref } from "@/lib/utils";

export interface OfficialLinkButton {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function ImportantLinksCard({
  title,
  sourceLinks,
  officialButtons,
  noLinkMessage,
  sourceUrl,
}: {
  title: string;
  sourceLinks: ImportantLink[];
  officialButtons: OfficialLinkButton[];
  noLinkMessage: string;
  sourceUrl: string;
}) {
  return (
    <Card>
      <p className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
        <Link2 size={17} /> {title}
      </p>
      {sourceLinks.length > 0 ? (
        sourceLinks.map((link, i) => (
          <ButtonLink
            key={`${link.label}-${i}`}
            href={documentViewerHref(link.url, link.label)}
            target="_blank"
            variant="secondary"
            className={i === 0 ? "w-full" : "mt-2 w-full"}
          >
            {link.label} <ExternalLink size={14} />
          </ButtonLink>
        ))
      ) : officialButtons.length > 0 ? (
        officialButtons.map((btn, i) => (
          <ButtonLink
            key={btn.label}
            href={btn.href}
            target="_blank"
            variant={btn.variant ?? "primary"}
            className={i === 0 ? "w-full" : "mt-2 w-full"}
          >
            {btn.leadingIcon}
            {btn.label}
            {btn.trailingIcon}
          </ButtonLink>
        ))
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">{noLinkMessage}</p>
      )}
      <div className="mt-3">
        <SourceVerified sourceUrl={sourceUrl} />
      </div>
    </Card>
  );
}

export function AtAGlanceCard({
  title,
  icon,
  rows,
  footer,
}: {
  title: string;
  icon?: React.ReactNode;
  rows: { label: string; value: string }[];
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        {icon} {title}
      </p>
      <div className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <KeyValueRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
      {footer}
    </Card>
  );
}
