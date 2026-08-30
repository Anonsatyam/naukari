"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, CheckCircle2, XCircle, FileText, Plus, Trash2 } from "lucide-react";
import { BotDraft } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { deepDecodeEntities } from "@/lib/entities";
import { parsePipeTables, TABLE_SEP, deriveAgeRange, deriveSalaryRange } from "@/lib/pipeTables";
import { Button } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField } from "@/components/FormField";

interface AgeLimitRowDraft {
  grade: string;
  minAge: string;
  maxAge: string;
}

interface AgeRelaxationRowDraft {
  category: string;
  relaxation: string;
}

interface LinkRowDraft {
  label: string;
  url: string;
}

interface FaqDraft {
  question: string;
  answer: string;
}

interface SectionDraft {
  heading: string;
  content: string;
}

// Sources on this site write each FAQ as one paragraph combining both
// question and answer — "Q1. <question>? Ans: <answer>." — rather than
// alternating separate blocks, so it's captured as one entry per <p> by
// the bot's plain-block fallback (extractPlainBlocks). That shape is
// reliably splittable on the "Ans:"/"उत्तर:" marker, unlike a generic
// FAQ layout where question/answer pairing can't be inferred safely —
// this is intentionally narrow rather than a general-purpose FAQ parser.
const FAQ_LINE = /^\s*(?:q\d*[.):]?\s*)?(.*?)\s*(?:ans(?:wer)?|उत्तर)\s*[:.]?\s*(.+)$/i;

function parseFaqLines(lines: string[]): FaqDraft[] {
  return lines.map((line) => {
    const match = line.match(FAQ_LINE);
    return match ? { question: match[1].trim(), answer: match[2].trim() } : { question: line.trim(), answer: "" };
  });
}

// Splits a bot-extracted "cell | cell || row || row" pipe table (see
// tableToPairs() in extractHtmlNotificationFields.ts) into one readable
// line per row — used to seed the Eligibility Details textarea with a
// starting draft from whatever the eligibility table/list actually
// contained, same idea as parseSelectionSteps() in lib/server/data.ts.
// Splits on TABLE_SEP first so a section spanning more than one source
// table (or table + trailing bullet list) still yields one line per
// row/bullet across all of them, in order.
function pipeRowsToLines(text: string): string[] {
  return text.split(TABLE_SEP).flatMap((chunk) => {
    const rows = chunk.split(" || ").map((row) => row.trim()).filter(Boolean);
    if (!chunk.includes(" | ")) {
      // Not a table — likely already plain sentences/bullets (e.g. a
      // <ul> eligibility list); each row IS the line, verbatim.
      return rows;
    }
    // A real table's first row is its column header (labels, not a
    // criterion of its own) — skipping it here avoids seeding the
    // textarea with a bogus "Parameter: Details"-style bullet made out
    // of the header cells themselves, keeping only the actual data
    // rows as one "label: value" line each.
    return rows
      .slice(1)
      .map((row) =>
        row
          .split(" | ")
          .map((c) => c.trim())
          .filter(Boolean)
          .join(": ")
      )
      .filter(Boolean);
  });
}

// The bot's guessed apply/notification/website links (guessLink() in
// extractHtmlNotificationFields.ts) plus a second, independent keyword
// pass over importantLinks — same two-keyword-list approach
// approveDraft's own findLinkByKeywords uses server-side (duplicated
// here rather than imported, since that lives in a server-only module
// this "use client" page can't import). Used only to PRE-FILL the
// Official Apply/Notification/Link fields below with the best guess
// available, so an admin sees exactly what would otherwise be silently
// chosen and can correct it before publishing — a wrong-URL bug from
// this exact gap (a guess made only at publish time, never shown or
// editable beforehand) has bitten this site before.
const APPLY_LINK_KEYWORDS = ["apply", "online", "registration", "आवेदन", "रजिस्ट्रेशन"];
const NOTIFICATION_LINK_KEYWORDS = ["notification", "notice", "advertisement", "pdf", "नोटिफिकेशन", "अधिसूचना"];

function findLinkByKeywords(links: unknown, keywords: string[]): string | undefined {
  if (!Array.isArray(links)) return undefined;
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const label = (link as { label?: unknown }).label;
    const url = (link as { url?: unknown }).url;
    if (typeof label !== "string" || typeof url !== "string") continue;
    if (keywords.some((kw) => label.toLowerCase().includes(kw))) return url;
  }
  return undefined;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

const TYPE_LABELS: Record<BotDraft["draftType"], string> = {
  job: "Job",
  result: "Result",
  admit_card: "Admit Card",
};

// Matches exactly what the bot's PDF extraction targets — see
// scripts/bot/extractStructuredFields.ts
const JOB_DATE_FIELDS: { key: string; label: string }[] = [
  { key: "dateApplicationStart", label: "Application Start" },
  { key: "dateApplicationEnd", label: "Application End" },
  { key: "dateCorrectionDate", label: "Correction Date" },
  { key: "dateExamDate", label: "Exam Date" },
  { key: "dateAdmitCardRelease", label: "Admit Card Release" },
  { key: "dateResultDate", label: "Result Date" },
];

function PipeTable({ text }: { text?: string }) {
  if (!text) return null;
  const tables = parsePipeTables(text);
  if (tables.length === 0) return null;
  return (
    <div className="space-y-3">
      {tables.map((t, i) => (
        <div key={i} className="space-y-1.5">
          {t.caption && <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{t.caption}</p>}
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
                <tbody className="divide-y divide-[var(--color-border)]">
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

// A raw pipe-encoded table/list, editable as plain text, with a live
// rendered preview underneath so the admin can see exactly what will
// appear on the public page before publishing — rather than the old
// read-only "Additional Notification Details" panel, which showed the
// same content but gave no way to fix a bad row or a mis-split cell.
function RawTableField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <TextAreaField label={label} value={value} onChange={(e) => onChange(e.target.value)} hint={hint} rows={4} />
      {value.trim() && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Preview
          </p>
          <PipeTable text={value} />
        </div>
      )}
    </div>
  );
}

// One generic add/remove list editor for every "N-field object" list on
// this page — FAQs, grade-wise age limits, age relaxation, important
// links, and additional/generic sections all fit this same shape
// (2-3 plain-text fields per row), so this one component replaces what
// used to be several near-identical bespoke blocks.
function RowsEditor<T extends Record<string, string>>({
  rows,
  setRows,
  fields,
  addLabel,
  newRow,
}: {
  rows: T[];
  setRows: (updater: (prev: T[]) => T[]) => void;
  fields: { key: keyof T & string; label: string; multiline?: boolean }[];
  addLabel: string;
  newRow: T;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {fields.map((f) => {
                const Field = f.multiline ? TextAreaField : TextField;
                return (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={row[f.key] ?? ""}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [f.key]: e.target.value } : r)))
                    }
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
              aria-label="Remove row"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, newRow])}>
        <Plus size={14} /> {addLabel}
      </Button>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
  );
}

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [draft, setDraft] = useState<BotDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // One generic field bag for every plain scalar input — text, number,
  // date, and the raw pipe-encoded table/list fields (which are still
  // just strings) all live here; only the fields that need their own
  // add/remove row UI or a newline-per-item textarea get dedicated
  // state below.
  const [fields, setFields] = useState<Record<string, string>>({});
  const setField = (key: string) => (value: string) => setFields((prev) => ({ ...prev, [key]: value }));

  const [ageAsOnDate, setAgeAsOnDate] = useState("");
  const [ageLimitByGrade, setAgeLimitByGrade] = useState<AgeLimitRowDraft[]>([]);
  const [ageRelaxationBreakdown, setAgeRelaxationBreakdown] = useState<AgeRelaxationRowDraft[]>([]);
  const [importantLinksRows, setImportantLinksRows] = useState<LinkRowDraft[]>([]);
  const [eligibilityDetails, setEligibilityDetails] = useState("");
  const [examPatternNotes, setExamPatternNotes] = useState("");
  const [howToLines, setHowToLines] = useState("");
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [additionalSections, setAdditionalSections] = useState<SectionDraft[]>([]);
  const [conclusion, setConclusion] = useState("");

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/drafts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: { draft: BotDraft }) => {
        // Decode once, here, before the draft ever touches component
        // state — drafts extracted before the bot's entity-decoding fix
        // shipped still have raw codes (&#8220; etc) baked into their
        // stored extractedFields. Cleaning at this single entry point
        // means every field below (and the payload sent on approve) is
        // clean without needing to remember to decode at each read site.
        const cleanedDraft: BotDraft = {
          ...data.draft,
          extractedFields: deepDecodeEntities(data.draft.extractedFields) as BotDraft["extractedFields"],
        };
        setDraft(cleanedDraft);
        const ex = cleanedDraft.extractedFields as Record<string, unknown>;
        const type = data.draft.draftType;
        const today = new Date().toISOString().slice(0, 10);

        const fee = (ex.applicationFee ?? {}) as { general?: number; reserved?: number; note?: string };

        // Fields shared by all three draft types — the same raw
        // pipe-table buckets the extractor produces regardless of
        // draft type (see extractHtmlNotificationFields.ts's
        // HEADING_FIELD_MAP), so every one of these is pre-filled and
        // editable for Job, Result, and Admit Card alike.
        const common: Record<string, string> = {
          title: String(ex.title ?? data.draft.jobTitle),
          organization: String(ex.organization ?? data.draft.organization),
          category: String(ex.category ?? ""),
          feeGeneral: fee.general !== undefined ? String(fee.general) : "",
          feeReserved: fee.reserved !== undefined ? String(fee.reserved) : "",
          feeNote: typeof fee.note === "string" ? fee.note : "",
          importantDatesText: typeof ex.importantDatesText === "string" ? ex.importantDatesText : "",
          applicationFeeText: typeof ex.applicationFeeText === "string" ? ex.applicationFeeText : "",
          ageLimit: typeof ex.ageLimit === "string" ? ex.ageLimit : "",
          postDetails: typeof ex.postDetails === "string" ? ex.postDetails : "",
          eligibility: typeof ex.eligibility === "string" ? ex.eligibility : "",
          selectionProcess: typeof ex.selectionProcess === "string" ? ex.selectionProcess : "",
          documentsRequired: typeof ex.documentsRequired === "string" ? ex.documentsRequired : "",
          examPattern: typeof ex.examPattern === "string" ? ex.examPattern : "",
        };

        let typeSpecific: Record<string, string> = {};
        if (type === "result") {
          typeSpecific = {
            resultDate: String(ex.resultDate ?? today),
            summary: typeof ex.summary === "string" ? ex.summary : "",
            officialLink: firstNonEmptyString(ex.officialLink, ex.notificationPdfLink, ex.applyOnlineLink, ex.officialWebsiteLink),
          };
        } else if (type === "admit_card") {
          typeSpecific = {
            examDate: String(ex.examDate ?? today),
            releaseDate: String(ex.releaseDate ?? today),
            officialLink: firstNonEmptyString(ex.officialLink, ex.notificationPdfLink, ex.applyOnlineLink, ex.officialWebsiteLink),
          };
        } else {
          const importantDates = Array.isArray(ex.importantDates)
            ? (ex.importantDates as { label: string; date: string }[])
            : [];
          const dateFields: Record<string, string> = {};
          for (const { key, label } of JOB_DATE_FIELDS) {
            const found = importantDates.find((d) => d.label === label);
            if (found) dateFields[key] = found.date;
          }

          // Neither of these has its own extracted field or form — the
          // bot never derives one number from a whole Age Limit table
          // or a Pay Scale sentence on its own — so pre-fill from the
          // same best-effort derivation the approve step falls back to
          // server-side (deriveAgeRange/deriveSalaryRange), letting the
          // admin see and correct the guess before publishing rather
          // than only after.
          const derivedAge = deriveAgeRange(ex.ageLimit);
          const derivedSalary = deriveSalaryRange(ex.postDetails);

          typeSpecific = {
            state: String(ex.state ?? "Bihar"),
            department: String(ex.department ?? data.draft.organization),
            shortInfo: typeof ex.shortInfo === "string" ? ex.shortInfo : "",
            totalVacancies: String(ex.totalVacancies ?? 0),
            qualification: String(ex.qualification ?? ""),
            minAge: derivedAge.minAge !== undefined ? String(derivedAge.minAge) : "",
            maxAge: derivedAge.maxAge !== undefined ? String(derivedAge.maxAge) : "",
            salaryMin: derivedSalary.salaryMin !== undefined ? String(derivedSalary.salaryMin) : "",
            salaryMax: derivedSalary.salaryMax !== undefined ? String(derivedSalary.salaryMax) : "",
            ageRelaxation: typeof ex.ageRelaxation === "string" ? ex.ageRelaxation : "",
            syllabusSummary: typeof ex.syllabusSummary === "string" ? ex.syllabusSummary : "",
            officialApplyUrl: firstNonEmptyString(
              ex.officialApplyUrl,
              ex.applyOnlineLink,
              findLinkByKeywords(ex.importantLinks, APPLY_LINK_KEYWORDS)
            ),
            officialNotificationUrl: firstNonEmptyString(
              ex.officialNotificationUrl,
              ex.notificationPdfLink,
              findLinkByKeywords(ex.importantLinks, NOTIFICATION_LINK_KEYWORDS)
            ),
            ...dateFields,
          };

          // Seed a starting draft from whatever the source page's own
          // Eligibility section contained — the admin edits/corrects
          // from here rather than typing every bullet from scratch.
          // Job-only: this curated-bullets tier exists alongside the
          // shared raw "eligibility" textarea because Job also has its
          // own eligibility-checker feature that reads from it.
          if (typeof ex.eligibility === "string" && ex.eligibility) {
            setEligibilityDetails(pipeRowsToLines(ex.eligibility).join("\n"));
          }
        }

        setFields({ ...common, ...typeSpecific });

        // The rest are shared across all three draft types too — the
        // bot extracts them the same way regardless of what kind of
        // posting the source page turns out to be.
        if (typeof ex.conclusionText === "string" && ex.conclusionText) {
          setConclusion(ex.conclusionText);
        }
        if (Array.isArray(ex.faqText) && ex.faqText.length > 0) {
          setFaqs(parseFaqLines(ex.faqText as string[]));
        }
        if (Array.isArray(ex.howToApply) && ex.howToApply.length > 0) {
          setHowToLines((ex.howToApply as string[]).join("\n"));
        }
        if (Array.isArray(ex.importantLinks) && ex.importantLinks.length > 0) {
          setImportantLinksRows(ex.importantLinks as LinkRowDraft[]);
        }
        if (Array.isArray(ex.genericSections) && ex.genericSections.length > 0) {
          setAdditionalSections(ex.genericSections as SectionDraft[]);
        }
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: fields.title,
        organization: fields.organization,
        category: fields.category,
      };

      // ---- Raw pipe-table / free-text sections — same keys
      // approveDraft already reads for every draft type. ----
      const rawTextFields: Record<string, string | undefined> = {
        importantDatesText: fields.importantDatesText,
        applicationFeeText: fields.applicationFeeText,
        ageLimit: fields.ageLimit,
        postDetails: fields.postDetails,
        eligibility: fields.eligibility,
        selectionProcess: fields.selectionProcess,
        documentsRequired: fields.documentsRequired,
        examPattern: fields.examPattern,
      };
      for (const [key, value] of Object.entries(rawTextFields)) {
        if (value?.trim()) body[key] = value;
      }

      const applicationFee: { general?: number; reserved?: number; note?: string } = {};
      if (fields.feeGeneral) applicationFee.general = Number(fields.feeGeneral) || 0;
      if (fields.feeReserved) applicationFee.reserved = Number(fields.feeReserved) || 0;
      if (fields.feeNote?.trim()) applicationFee.note = fields.feeNote.trim();
      if (Object.keys(applicationFee).length > 0) body.applicationFee = applicationFee;

      const ageLimitRows = ageLimitByGrade.filter((r) => r.grade || r.minAge || r.maxAge);
      if (ageLimitRows.length > 0) body.ageLimitByGrade = ageLimitRows;

      const ageRelaxationRows = ageRelaxationBreakdown.filter((r) => r.category || r.relaxation);
      if (ageRelaxationRows.length > 0) body.ageRelaxationBreakdown = ageRelaxationRows;

      const linkRows = importantLinksRows.filter((r) => r.label || r.url);
      if (linkRows.length > 0) body.importantLinks = linkRows;

      const howToList = howToLines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (howToList.length > 0) body.howToApply = howToList;

      const examNotes = examPatternNotes.split("\n").map((s) => s.trim()).filter(Boolean);
      if (examNotes.length > 0) body.examPatternNotes = examNotes;

      const faqRows = faqs.filter((f) => f.question || f.answer);
      if (faqRows.length > 0) body.faqs = faqRows;

      if (conclusion.trim()) body.conclusion = conclusion.trim();

      const sectionRows = additionalSections.filter((s) => s.heading || s.content);
      if (sectionRows.length > 0) body.genericSections = sectionRows;

      // ---- Fields specific to one draft type ----
      if (draft?.draftType === "job") {
        body.totalVacancies = Number(fields.totalVacancies) || 0;
        body.qualification = fields.qualification;
        body.state = fields.state || "Bihar";
        body.department = fields.department || fields.organization;
        if (fields.shortInfo?.trim()) body.shortInfo = fields.shortInfo.trim();
        if (fields.minAge) body.minAge = Number(fields.minAge) || undefined;
        if (fields.maxAge) body.maxAge = Number(fields.maxAge) || undefined;
        if (fields.salaryMin) body.salaryMin = Number(fields.salaryMin) || undefined;
        if (fields.salaryMax) body.salaryMax = Number(fields.salaryMax) || undefined;
        if (fields.ageRelaxation?.trim()) body.ageRelaxation = fields.ageRelaxation.trim();
        if (fields.syllabusSummary?.trim()) body.syllabusSummary = fields.syllabusSummary.trim();
        if (fields.officialApplyUrl?.trim()) body.officialApplyUrl = fields.officialApplyUrl.trim();
        if (fields.officialNotificationUrl?.trim()) body.officialNotificationUrl = fields.officialNotificationUrl.trim();

        const importantDates = JOB_DATE_FIELDS.filter(({ key }) => fields[key]).map(
          ({ key, label }) => ({ label, date: fields[key] })
        );
        if (importantDates.length > 0) body.importantDates = importantDates;

        if (ageAsOnDate) body.ageAsOnDate = ageAsOnDate;

        const eligibilityLines = eligibilityDetails.split("\n").map((s) => s.trim()).filter(Boolean);
        if (eligibilityLines.length > 0) body.eligibilityDetails = eligibilityLines;
      } else if (draft?.draftType === "result") {
        body.resultDate = fields.resultDate;
        if (fields.summary?.trim()) body.summary = fields.summary.trim();
        if (fields.officialLink?.trim()) body.officialLink = fields.officialLink.trim();
      } else if (draft?.draftType === "admit_card") {
        body.examDate = fields.examDate;
        body.releaseDate = fields.releaseDate;
        if (fields.officialLink?.trim()) body.officialLink = fields.officialLink.trim();
      }

      const res = await fetch(`/api/admin/drafts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Approve failed");
      setDecision("approved");
    } catch {
      setError("Could not approve this draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Reject failed");
      setDecision("rejected");
    } catch {
      setError("Could not reject this draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading draft…</p>;
  }

  if (notFoundState || !draft) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Draft not found</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          It may have already been reviewed, or the link is invalid.
        </p>
        <Button className="mt-5" onClick={() => router.push("/admin/drafts")}>
          Back to Drafts
        </Button>
      </Card>
    );
  }

  if (decision) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        {decision === "approved" ? (
          <CheckCircle2 size={32} className="mx-auto text-[var(--color-success)]" />
        ) : (
          <XCircle size={32} className="mx-auto text-[var(--color-danger)]" />
        )}
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">
          {TYPE_LABELS[draft.draftType]} {decision === "approved" ? "approved and published" : "rejected"}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {decision === "approved"
            ? "This is now live on the public site."
            : "This draft has been discarded and will not be published."}
        </p>
        <Button className="mt-5" onClick={() => router.push("/admin/drafts")}>
          Back to Drafts
        </Button>
      </Card>
    );
  }

  const howToLabel =
    draft.draftType === "result" ? "How to Check Result" : draft.draftType === "admit_card" ? "How to Download Admit Card" : "How to Apply";
  const documentsLabel = draft.draftType === "admit_card" ? "Exam Day Instructions / Documents to Carry" : "Documents Required";

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
          <h1 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
            Review Draft
            <Badge tone="primary">{TYPE_LABELS[draft.draftType]}</Badge>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Detected {formatDate(draft.detectedAt)} · Extraction confidence:{" "}
            <Badge tone={draft.confidence === "high" ? "success" : draft.confidence === "medium" ? "warning" : "danger"}>
              {draft.confidence}
            </Badge>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Editable fields — every field the published record can hold,
            pre-populated from whatever the bot extracted, grouped to
            match the sections the public page itself renders. */}
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Title" value={fields.title ?? ""} onChange={(e) => setField("title")(e.target.value)} />
            <TextField
              label="Organization"
              value={fields.organization ?? ""}
              onChange={(e) => setField("organization")(e.target.value)}
            />
          </div>
          <TextField
            label="Category"
            value={fields.category ?? ""}
            onChange={(e) => setField("category")(e.target.value)}
          />

          {draft.draftType === "job" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <TextField label="State" value={fields.state ?? ""} onChange={(e) => setField("state")(e.target.value)} />
                <TextField
                  label="Department"
                  value={fields.department ?? ""}
                  onChange={(e) => setField("department")(e.target.value)}
                />
              </div>
              <TextAreaField
                label="Short Info"
                value={fields.shortInfo ?? ""}
                onChange={(e) => setField("shortInfo")(e.target.value)}
                hint="One or two sentences shown at the top of the job page, under the title."
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Total Vacancies"
                  type="number"
                  value={fields.totalVacancies ?? "0"}
                  onChange={(e) => setField("totalVacancies")(e.target.value)}
                />
                <TextField
                  label="Qualification"
                  value={fields.qualification ?? ""}
                  onChange={(e) => setField("qualification")(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Min. Age"
                  type="number"
                  value={fields.minAge ?? ""}
                  onChange={(e) => setField("minAge")(e.target.value)}
                />
                <TextField
                  label="Max. Age"
                  type="number"
                  value={fields.maxAge ?? ""}
                  onChange={(e) => setField("maxAge")(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Salary Min (₹)"
                  type="number"
                  value={fields.salaryMin ?? ""}
                  onChange={(e) => setField("salaryMin")(e.target.value)}
                />
                <TextField
                  label="Salary Max (₹)"
                  type="number"
                  value={fields.salaryMax ?? ""}
                  onChange={(e) => setField("salaryMax")(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Official Apply URL"
                  value={fields.officialApplyUrl ?? ""}
                  onChange={(e) => setField("officialApplyUrl")(e.target.value)}
                />
                <TextField
                  label="Official Notification URL"
                  value={fields.officialNotificationUrl ?? ""}
                  onChange={(e) => setField("officialNotificationUrl")(e.target.value)}
                />
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <SectionDivider
                  label={`Important Dates ${fields.dateApplicationEnd || fields.dateExamDate ? "(auto-filled from PDF)" : "(fill in from the notification)"}`}
                />
                <div className="grid grid-cols-2 gap-4">
                  {JOB_DATE_FIELDS.map(({ key, label }) => (
                    <TextField
                      key={key}
                      label={label}
                      type="date"
                      value={fields[key] ?? ""}
                      onChange={(e) => setField(key)(e.target.value)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {draft.draftType === "result" && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Result Date"
                type="date"
                value={fields.resultDate ?? ""}
                onChange={(e) => setField("resultDate")(e.target.value)}
              />
              <TextField
                label="Official Link"
                value={fields.officialLink ?? ""}
                onChange={(e) => setField("officialLink")(e.target.value)}
              />
              <div className="col-span-2">
                <TextAreaField
                  label="Summary"
                  value={fields.summary ?? ""}
                  onChange={(e) => setField("summary")(e.target.value)}
                  hint="One or two sentences shown at the top of the result page, under the title."
                />
              </div>
            </div>
          )}

          {draft.draftType === "admit_card" && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Release Date"
                type="date"
                value={fields.releaseDate ?? ""}
                onChange={(e) => setField("releaseDate")(e.target.value)}
              />
              <TextField
                label="Exam Date"
                type="date"
                value={fields.examDate ?? ""}
                onChange={(e) => setField("examDate")(e.target.value)}
              />
              <div className="col-span-2">
                <TextField
                  label="Official Link"
                  value={fields.officialLink ?? ""}
                  onChange={(e) => setField("officialLink")(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Everything below is shared by all three draft types — the
              extractor produces these the same way regardless of what
              kind of posting the source page turns out to be, and the
              published record has the same field for each of them on
              Job, Result, and Admit Card alike. */}

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Important Dates (full table)" />
            <RawTableField
              label="Raw dates table"
              value={fields.importantDatesText ?? ""}
              onChange={setField("importantDatesText")}
              hint="Pipe-encoded rows as extracted from the source — edit to fix a row, or add one."
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Application Fee" />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="General / OBC / EWS (₹)"
                type="number"
                value={fields.feeGeneral ?? ""}
                onChange={(e) => setField("feeGeneral")(e.target.value)}
              />
              <TextField
                label="SC / ST / PwD (₹)"
                type="number"
                value={fields.feeReserved ?? ""}
                onChange={(e) => setField("feeReserved")(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <TextField
                label="Fee Note"
                value={fields.feeNote ?? ""}
                onChange={(e) => setField("feeNote")(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <RawTableField
                label="Full fee table (if the source publishes more than a general/reserved split)"
                value={fields.applicationFeeText ?? ""}
                onChange={setField("applicationFeeText")}
              />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Age Limit" />
            {draft.draftType === "job" && (
              <TextField
                label="Age Reckoned As On"
                type="date"
                value={ageAsOnDate}
                onChange={(e) => setAgeAsOnDate(e.target.value)}
              />
            )}

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Grade-wise Age Limit (optional — only for posts where the minimum/maximum age varies by grade)
              </p>
              <RowsEditor
                rows={ageLimitByGrade}
                setRows={setAgeLimitByGrade}
                fields={[
                  { key: "grade", label: "Grade / Cadre" },
                  { key: "minAge", label: "Min. Age" },
                  { key: "maxAge", label: "Max. Age" },
                ]}
                addLabel="Add Grade Row"
                newRow={{ grade: "", minAge: "", maxAge: "" }}
              />
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Age Relaxation (optional — category-wise relaxation on top of the limits above)
              </p>
              <RowsEditor
                rows={ageRelaxationBreakdown}
                setRows={setAgeRelaxationBreakdown}
                fields={[
                  { key: "category", label: "Category" },
                  { key: "relaxation", label: "Relaxation" },
                ]}
                addLabel="Add Relaxation Row"
                newRow={{ category: "", relaxation: "" }}
              />
            </div>

            {draft.draftType === "job" && (
              <div className="mt-4">
                <TextField
                  label="Age Relaxation (general note)"
                  value={fields.ageRelaxation ?? ""}
                  onChange={(e) => setField("ageRelaxation")(e.target.value)}
                />
              </div>
            )}

            <div className="mt-4">
              <RawTableField
                label="Full age limit table (raw, as published)"
                value={fields.ageLimit ?? ""}
                onChange={setField("ageLimit")}
              />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Post / Vacancy Details" />
            <RawTableField
              label="Raw vacancy / post details table"
              value={fields.postDetails ?? ""}
              onChange={setField("postDetails")}
              hint="Category-wise vacancy counts are derived from this table automatically on publish."
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Eligibility" />
            {draft.draftType === "job" && (
              <TextAreaField
                label="Education Eligibility — Details"
                value={eligibilityDetails}
                onChange={(e) => setEligibilityDetails(e.target.value)}
                hint="One bullet point per line — shown as a bulleted list on the job page."
              />
            )}
            <div className={draft.draftType === "job" ? "mt-4" : ""}>
              <RawTableField
                label="Full eligibility table/list (raw, as published)"
                value={fields.eligibility ?? ""}
                onChange={setField("eligibility")}
              />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Selection Process" />
            <RawTableField
              label="Raw selection process table"
              value={fields.selectionProcess ?? ""}
              onChange={setField("selectionProcess")}
              hint="Falls back to a numbered step list on the public page if this isn't a real table."
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Exam Pattern" />
            <RawTableField
              label="Raw exam pattern table"
              value={fields.examPattern ?? ""}
              onChange={setField("examPattern")}
            />
            <div className="mt-4">
              <TextAreaField
                label="Exam Pattern — Notes"
                value={examPatternNotes}
                onChange={(e) => setExamPatternNotes(e.target.value)}
                hint="One note per line, e.g. negative marking or merit-list rules. Shown below the exam pattern table."
              />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label={documentsLabel} />
            <RawTableField
              label="Raw table/list"
              value={fields.documentsRequired ?? ""}
              onChange={setField("documentsRequired")}
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <TextAreaField
              label={howToLabel}
              value={howToLines}
              onChange={(e) => setHowToLines(e.target.value)}
              hint="One step per line — shown as a numbered list on the public page."
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Important Links" />
            <RowsEditor
              rows={importantLinksRows}
              setRows={setImportantLinksRows}
              fields={[
                { key: "label", label: "Label" },
                { key: "url", label: "URL" },
              ]}
              addLabel="Add Link"
              newRow={{ label: "", url: "" }}
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="FAQs" />
            <RowsEditor
              rows={faqs}
              setRows={setFaqs}
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              addLabel="Add FAQ"
              newRow={{ question: "", answer: "" }}
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Additional Sections (from source page)" />
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Any source heading that doesn&apos;t match one of the sections above — e.g. &quot;Physical
              Eligibility&quot; or &quot;Reservation Policy&quot; — lands here automatically. Retitle, edit, or
              remove any of these before publishing.
            </p>
            <RowsEditor
              rows={additionalSections}
              setRows={setAdditionalSections}
              fields={[
                { key: "heading", label: "Heading" },
                { key: "content", label: "Content (raw table/list)", multiline: true },
              ]}
              addLabel="Add Section"
              newRow={{ heading: "", content: "" }}
            />
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            {draft.draftType === "job" && (
              <TextAreaField
                label="Syllabus"
                value={fields.syllabusSummary ?? ""}
                onChange={(e) => setField("syllabusSummary")(e.target.value)}
              />
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <TextAreaField
              label="Conclusion"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              hint="Closing summary paragraph shown at the bottom of the page."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--color-danger-tint)] p-3 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row">
            <Button onClick={handleApprove} disabled={submitting} className="flex-1">
              <CheckCircle2 size={15} /> {submitting ? "Approving…" : "Approve & Publish"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:border-[var(--color-danger)]"
            >
              <XCircle size={15} /> Reject
            </Button>
          </div>
        </Card>

        {/* Source */}
        <Card className="h-fit space-y-4 lg:sticky lg:top-24">
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
            Open source <ExternalLink size={13} />
          </a>
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Raw extracted data
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Everything the bot found, unedited — for cross-checking anything the fields on the left don&apos;t
              seem to reflect correctly.
            </p>
            <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {JSON.stringify(draft.extractedFields, null, 2)}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
