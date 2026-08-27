"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, CheckCircle2, XCircle, FileText, Plus, Trash2 } from "lucide-react";
import { BotDraft } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { deepDecodeEntities } from "@/lib/entities";
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

interface FaqDraft {
  question: string;
  answer: string;
}

// Splits a bot-extracted "cell | cell || row || row" pipe table (see
// tableToPairs() in extractHtmlNotificationFields.ts) into one readable
// line per row — used to seed the Eligibility Details textarea with a
// starting draft from whatever the eligibility table/list actually
// contained, same idea as parseSelectionSteps() in lib/server/data.ts.
function pipeRowsToLines(text: string): string[] {
  if (!text.includes(" | ")) {
    // Not a table — likely already plain sentences/bullets (e.g. a <ul>
    // eligibility list); split on the row separator only.
    return text.split(" || ").map((s) => s.trim()).filter(Boolean);
  }
  return text
    .split(" || ")
    .map((row) =>
      row
        .split(" | ")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(": ")
    )
    .filter(Boolean);
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

// Raw text fields the HTML extractor (extractHtmlNotificationFields.ts)
// produces for sources like biharjob.co.in, where the notification's
// full detail — eligibility, age limit, vacancy breakdown, selection
// process, documents required, exam pattern — lives directly in the
// post's own page rather than a linked PDF. These don't have their own
// form inputs (there's no single normalized shape for a per-category,
// per-paper fee table the way there is for a single application fee
// number), so they're shown here as a read-only reference panel instead
// — same information the admin would otherwise have to go dig out of
// "Raw extracted data" or the source page itself.
const RICH_DETAIL_KEYS = [
  "ageLimit",
  "postDetails",
  "eligibility",
  "selectionProcess",
  "documentsRequired",
  "examPattern",
  "howToApply",
  "importantLinks",
  "applyOnlineLink",
  "notificationPdfLink",
  "officialWebsiteLink",
] as const;

// faqText / conclusionText are shown as a read-only reference only (see
// the panel below) — unlike the keys above, there's no Job field they
// pass straight through into, since an FAQ/closing-summary section
// never comes back from extraction in the {faqs, conclusion} shape the
// job record actually stores; the admin retypes them into the FAQs /
// Conclusion inputs above instead.
const REFERENCE_ONLY_KEYS = ["faqText", "conclusionText"] as const;

// Rows come across as "cell | cell | cell" per row, joined "row || row"
// across rows — see tableToPairs()/join(" || ") in
// extractHtmlNotificationFields.ts. First row is treated as the header,
// matching every table these sources actually publish (category/date
// labels, column names, etc.).
function parsePipeRows(text?: string): string[][] {
  if (!text) return [];
  return text
    .split(" || ")
    .map((row) => row.split(" | ").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function PipeTable({ text }: { text?: string }) {
  const rows = parsePipeRows(text);
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--color-background)] text-left text-[var(--color-text-muted)]">
            {header.map((cell, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 text-[var(--color-text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  // One generic field bag — which keys are shown/sent depends on draftType.
  const [fields, setFields] = useState<Record<string, string>>({});
  const setField = (key: string) => (value: string) => setFields((prev) => ({ ...prev, [key]: value }));

  // The richer job-detail fields (see screenshots this feature was built
  // from: grade-wise age limits, per-post eligibility bullets, exam
  // pattern footnotes, FAQs, a closing summary) have no single-string
  // shape the generic `fields` bag above can hold, and the bot never
  // reliably auto-extracts them — so they get their own state, editable
  // here, and are merged into the approve payload alongside `fields`.
  const [ageAsOnDate, setAgeAsOnDate] = useState("");
  const [ageLimitByGrade, setAgeLimitByGrade] = useState<AgeLimitRowDraft[]>([]);
  const [eligibilityDetails, setEligibilityDetails] = useState("");
  const [examPatternNotes, setExamPatternNotes] = useState("");
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
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
        // means the form fields, the Additional Notification Details
        // preview, and the payload sent on approve are all clean
        // without needing to remember to decode at each read site.
        const cleanedDraft: BotDraft = {
          ...data.draft,
          extractedFields: deepDecodeEntities(data.draft.extractedFields) as BotDraft["extractedFields"],
        };
        setDraft(cleanedDraft);
        const ex = cleanedDraft.extractedFields as Record<string, unknown>;
        const today = new Date().toISOString().slice(0, 10);

        if (data.draft.draftType === "result") {
          setFields({
            title: String(ex.title ?? data.draft.jobTitle),
            organization: String(ex.organization ?? data.draft.organization),
            category: String(ex.category ?? ""),
            resultDate: String(ex.resultDate ?? today),
          });
        } else if (data.draft.draftType === "admit_card") {
          setFields({
            title: String(ex.title ?? data.draft.jobTitle),
            organization: String(ex.organization ?? data.draft.organization),
            category: String(ex.category ?? ""),
            examDate: String(ex.examDate ?? today),
            releaseDate: String(ex.releaseDate ?? today),
          });
        } else {
          const importantDates = Array.isArray(ex.importantDates)
            ? (ex.importantDates as { label: string; date: string }[])
            : [];
          const fee = (ex.applicationFee ?? {}) as { general?: number; reserved?: number };

          const dateFields: Record<string, string> = {};
          for (const { key, label } of JOB_DATE_FIELDS) {
            const found = importantDates.find((d) => d.label === label);
            if (found) dateFields[key] = found.date;
          }

          setFields({
            title: String(ex.title ?? data.draft.jobTitle),
            organization: String(ex.organization ?? data.draft.organization),
            totalVacancies: String(ex.totalVacancies ?? 0),
            qualification: String(ex.qualification ?? ""),
            feeGeneral: fee.general !== undefined ? String(fee.general) : "",
            feeReserved: fee.reserved !== undefined ? String(fee.reserved) : "",
            ...dateFields,
          });

          // Seed a starting draft from whatever the source page's own
          // Eligibility section contained — the admin edits/corrects
          // from here rather than typing every bullet from scratch.
          if (typeof ex.eligibility === "string" && ex.eligibility) {
            setEligibilityDetails(pipeRowsToLines(ex.eligibility).join("\n"));
          }
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
      };

      if (draft?.draftType === "job") {
        body.totalVacancies = Number(fields.totalVacancies) || 0;
        body.qualification = fields.qualification;

        const importantDates = JOB_DATE_FIELDS.filter(({ key }) => fields[key]).map(
          ({ key, label }) => ({ label, date: fields[key] })
        );
        if (importantDates.length > 0) body.importantDates = importantDates;

        const applicationFee: { general?: number; reserved?: number } = {};
        if (fields.feeGeneral) applicationFee.general = Number(fields.feeGeneral) || 0;
        if (fields.feeReserved) applicationFee.reserved = Number(fields.feeReserved) || 0;
        if (Object.keys(applicationFee).length > 0) body.applicationFee = applicationFee;

        if (ageAsOnDate) body.ageAsOnDate = ageAsOnDate;

        const ageLimitRows = ageLimitByGrade.filter((r) => r.grade || r.minAge || r.maxAge);
        if (ageLimitRows.length > 0) body.ageLimitByGrade = ageLimitRows;

        const eligibilityLines = eligibilityDetails.split("\n").map((s) => s.trim()).filter(Boolean);
        if (eligibilityLines.length > 0) body.eligibilityDetails = eligibilityLines;

        const examNotes = examPatternNotes.split("\n").map((s) => s.trim()).filter(Boolean);
        if (examNotes.length > 0) body.examPatternNotes = examNotes;

        const faqRows = faqs.filter((f) => f.question || f.answer);
        if (faqRows.length > 0) body.faqs = faqRows;

        if (conclusion.trim()) body.conclusion = conclusion.trim();
      } else if (draft?.draftType === "result") {
        body.category = fields.category;
        body.resultDate = fields.resultDate;
      } else if (draft?.draftType === "admit_card") {
        body.category = fields.category;
        body.examDate = fields.examDate;
        body.releaseDate = fields.releaseDate;
      }

      // Carry the HTML-sourced reference details (eligibility, age limit,
      // vacancy table, selection process, documents required, exam
      // pattern, important links, ...) through on approve too, exactly
      // as extracted — same pass-through contract as the rest of `body`
      // above. NOTE: the API route and the published job record need to
      // accept/store these keys for them to actually show up on the live
      // site; this only wires up the review page's half of that.
      const ex = draft?.extractedFields as Record<string, unknown> | undefined;
      for (const key of RICH_DETAIL_KEYS) {
        const value = ex?.[key];
        if (value !== undefined) body[key] = value;
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

  const ex = (draft.extractedFields ?? {}) as Record<string, unknown>;
  const howToApply = Array.isArray(ex.howToApply) ? (ex.howToApply as string[]) : [];
  const importantLinks = Array.isArray(ex.importantLinks)
    ? (ex.importantLinks as { label: string; url: string }[])
    : [];
  const faqTextRef = Array.isArray(ex.faqText) ? (ex.faqText as string[]) : [];
  const conclusionTextRef = typeof ex.conclusionText === "string" ? ex.conclusionText : "";
  const hasAdditionalDetails =
    RICH_DETAIL_KEYS.some((key) => ex[key] !== undefined) ||
    REFERENCE_ONLY_KEYS.some((key) => ex[key] !== undefined);

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
        {/* Editable fields — vary by draft type */}
        <Card className="space-y-4">
          <TextField label="Title" value={fields.title ?? ""} onChange={(e) => setField("title")(e.target.value)} />
          <TextField
            label="Organization"
            value={fields.organization ?? ""}
            onChange={(e) => setField("organization")(e.target.value)}
          />

          {draft.draftType === "job" && (
            <>
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

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Important Dates {fields.dateApplicationEnd || fields.dateExamDate ? "(auto-filled from PDF)" : "(fill in from the notification)"}
                </p>
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

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Application Fee (₹)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="General / OBC / EWS"
                    type="number"
                    value={fields.feeGeneral ?? ""}
                    onChange={(e) => setField("feeGeneral")(e.target.value)}
                  />
                  <TextField
                    label="SC / ST / PwD"
                    type="number"
                    value={fields.feeReserved ?? ""}
                    onChange={(e) => setField("feeReserved")(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Age Limit — Details
                </p>
                <TextField
                  label="Age Reckoned As On"
                  type="date"
                  value={ageAsOnDate}
                  onChange={(e) => setAgeAsOnDate(e.target.value)}
                />

                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Grade-wise Age Limit (optional — only for posts where the minimum/maximum age varies by grade)
                  </p>
                  {ageLimitByGrade.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                      <TextField
                        label="Grade / Cadre"
                        value={row.grade}
                        onChange={(e) =>
                          setAgeLimitByGrade((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, grade: e.target.value } : r))
                          )
                        }
                      />
                      <TextField
                        label="Min. Age"
                        value={row.minAge}
                        onChange={(e) =>
                          setAgeLimitByGrade((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, minAge: e.target.value } : r))
                          )
                        }
                      />
                      <TextField
                        label="Max. Age"
                        value={row.maxAge}
                        onChange={(e) =>
                          setAgeLimitByGrade((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, maxAge: e.target.value } : r))
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setAgeLimitByGrade((prev) => prev.filter((_, idx) => idx !== i))}
                        className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
                        aria-label="Remove row"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAgeLimitByGrade((prev) => [...prev, { grade: "", minAge: "", maxAge: "" }])}
                  >
                    <Plus size={14} /> Add Grade Row
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <TextAreaField
                  label="Education Eligibility — Details"
                  value={eligibilityDetails}
                  onChange={(e) => setEligibilityDetails(e.target.value)}
                  hint="One bullet point per line — shown as a bulleted list on the job page."
                />
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <TextAreaField
                  label="Exam Pattern — Notes"
                  value={examPatternNotes}
                  onChange={(e) => setExamPatternNotes(e.target.value)}
                  hint="One note per line, e.g. negative marking or merit-list rules. Shown below the exam pattern table."
                />
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  FAQs
                </p>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <TextField
                            label="Question"
                            value={faq.question}
                            onChange={(e) =>
                              setFaqs((prev) =>
                                prev.map((f, idx) => (idx === i ? { ...f, question: e.target.value } : f))
                              )
                            }
                          />
                          <TextAreaField
                            label="Answer"
                            value={faq.answer}
                            onChange={(e) =>
                              setFaqs((prev) =>
                                prev.map((f, idx) => (idx === i ? { ...f, answer: e.target.value } : f))
                              )
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFaqs((prev) => prev.filter((_, idx) => idx !== i))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
                          aria-label="Remove FAQ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setFaqs((prev) => [...prev, { question: "", answer: "" }])}
                  >
                    <Plus size={14} /> Add FAQ
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <TextAreaField
                  label="Conclusion"
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  hint="Closing summary paragraph shown at the bottom of the job page."
                />
              </div>
            </>
          )}

          {draft.draftType === "result" && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Category"
                value={fields.category ?? ""}
                onChange={(e) => setField("category")(e.target.value)}
              />
              <TextField
                label="Result Date"
                type="date"
                value={fields.resultDate ?? ""}
                onChange={(e) => setField("resultDate")(e.target.value)}
              />
            </div>
          )}

          {draft.draftType === "admit_card" && (
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Category"
                value={fields.category ?? ""}
                onChange={(e) => setField("category")(e.target.value)}
              />
              <TextField
                label="Release Date"
                type="date"
                value={fields.releaseDate ?? ""}
                onChange={(e) => setField("releaseDate")(e.target.value)}
              />
              <div className="col-span-2">
                <TextField
                  label="Exam Date"
                  type="date"
                  value={fields.examDate ?? ""}
                  onChange={(e) => setField("examDate")(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg bg-[var(--color-background)] p-3 text-xs text-[var(--color-text-secondary)]">
            Anything not edited here falls back to a sensible placeholder
            (usually the source notification link) on publish — edit the
            published entry afterward for anything more precise.
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

      {/* Additional notification details pulled from the source page's
          own sections (eligibility, age limit, vacancy table, selection
          process, documents required, exam pattern, links) — populated
          for HTML sources like biharjob.co.in that don't have a linked
          PDF. Shown as reference/proofreading; included in the approve
          payload above. */}
      {hasAdditionalDetails && (
        <Card className="mt-5 space-y-6">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Additional Notification Details
            <span className="ml-2 font-normal text-[var(--color-text-muted)]">(from source page)</span>
          </p>

          {typeof ex.eligibility === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Eligibility
              </p>
              <PipeTable text={ex.eligibility as string} />
            </section>
          )}

          {typeof ex.ageLimit === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Age Limit
              </p>
              <PipeTable text={ex.ageLimit as string} />
            </section>
          )}

          {typeof ex.postDetails === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Post / Vacancy Details
              </p>
              <PipeTable text={ex.postDetails as string} />
            </section>
          )}

          {typeof ex.selectionProcess === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Selection Process
              </p>
              <PipeTable text={ex.selectionProcess as string} />
            </section>
          )}

          {typeof ex.examPattern === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Exam Pattern
              </p>
              <PipeTable text={ex.examPattern as string} />
            </section>
          )}

          {typeof ex.documentsRequired === "string" && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Documents Required
              </p>
              <PipeTable text={ex.documentsRequired as string} />
            </section>
          )}

          {howToApply.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                How to Apply
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-xs text-[var(--color-text-secondary)]">
                {howToApply.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {faqTextRef.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                FAQ (raw — transcribe into the FAQs fields above)
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-xs text-[var(--color-text-secondary)]">
                {faqTextRef.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          {conclusionTextRef && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Conclusion (raw — transcribe into the Conclusion field above)
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{conclusionTextRef}</p>
            </section>
          )}

          {importantLinks.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Important Links
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {importantLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  >
                    <span className="truncate">{link.label}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </Card>
      )}
    </div>
  );
}