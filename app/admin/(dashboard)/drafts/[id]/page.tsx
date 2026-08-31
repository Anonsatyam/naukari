"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, CheckCircle2, XCircle, Eye, FileText, TriangleAlert } from "lucide-react";
import { BotDraft, AdditionalSection } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { deepDecodeEntities } from "@/lib/entities";
import { openPreviewWindow } from "@/lib/adminPreview";
import { TABLE_SEP, deriveAgeRange, deriveSalaryRange, parseFaqLines } from "@/lib/pipeTables";
import { Button } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField } from "@/components/FormField";
import { ChipInput } from "@/components/admin/ChipInput";
import {
  AgeLimitRowDraft,
  AgeRelaxationRowDraft,
  LinkRowDraft,
  FaqDraft,
  TYPE_LABELS,
  JOB_DATE_FIELDS,
  RawTableField,
  RowsEditor,
  SectionDivider,
  pipeRowsToLines as pipeRowsToLinesShared,
} from "@/components/admin/DraftFormShared";
import {
  DynamicSectionsEditor,
  DynamicSectionDraft,
  sectionToDraft,
  draftsToSections,
} from "@/components/admin/DynamicSectionsEditor";

function pipeRowsToLines(text: string): string[] {
  return pipeRowsToLinesShared(text, TABLE_SEP);
}

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
  const [additionalSections, setAdditionalSections] = useState<DynamicSectionDraft[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/drafts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: { draft: BotDraft }) => {
        const cleanedDraft: BotDraft = {
          ...data.draft,
          extractedFields: deepDecodeEntities(data.draft.extractedFields) as BotDraft["extractedFields"],
        };
        setDraft(cleanedDraft);
        const ex = cleanedDraft.extractedFields as Record<string, unknown>;
        const type = data.draft.draftType;
        const today = new Date().toISOString().slice(0, 10);

        const fee = (ex.applicationFee ?? {}) as { general?: number; reserved?: number; note?: string };

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

          const derivedAge = deriveAgeRange(ex.ageLimit);
          const derivedSalary = deriveSalaryRange(ex.postDetails);

          typeSpecific = {
            state: String(ex.state ?? "Bihar"),
            department: String(ex.department ?? data.draft.organization),
            shortInfo: typeof ex.shortInfo === "string" ? ex.shortInfo : "",
            totalVacancies: String(ex.totalVacancies ?? 0),
            qualification: String(ex.qualification ?? ""),
            minAge:
              typeof ex.minAge === "number"
                ? String(ex.minAge)
                : derivedAge.minAge !== undefined
                ? String(derivedAge.minAge)
                : "",
            maxAge:
              typeof ex.maxAge === "number"
                ? String(ex.maxAge)
                : derivedAge.maxAge !== undefined
                ? String(derivedAge.maxAge)
                : "",
            salaryMin:
              typeof ex.salaryMin === "number"
                ? String(ex.salaryMin)
                : derivedSalary.salaryMin !== undefined
                ? String(derivedSalary.salaryMin)
                : "",
            salaryMax:
              typeof ex.salaryMax === "number"
                ? String(ex.salaryMax)
                : derivedSalary.salaryMax !== undefined
                ? String(derivedSalary.salaryMax)
                : "",
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

          if (typeof ex.eligibility === "string" && ex.eligibility) {
            setEligibilityDetails(pipeRowsToLines(ex.eligibility).join("\n"));
          }
        }

        setFields({ ...common, ...typeSpecific });

        if (typeof ex.conclusionText === "string" && ex.conclusionText) {
          setConclusion(ex.conclusionText);
        }
        if (Array.isArray(ex.tags) && ex.tags.length > 0) {
          setTags(ex.tags as string[]);
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
          setAdditionalSections((ex.genericSections as AdditionalSection[]).map(sectionToDraft));
        }
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [id]);

  const buildEditsPayload = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      title: fields.title,
      organization: fields.organization,
      category: fields.category,
    };
    if (tags.length > 0) body.tags = tags;

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

    const sectionRows = draftsToSections(additionalSections);
    if (sectionRows.length > 0) body.genericSections = sectionRows;

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

    return body;
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEditsPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not build a preview.");
      openPreviewWindow(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build a preview. Please try again.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEditsPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setDecision("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve this draft. Please try again.");
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

  const listHref = draft.origin === "manual" ? "/admin/my-drafts" : "/admin/drafts";
  const listLabel = draft.origin === "manual" ? "Drafts" : "Bot Drafts";

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
        <Button className="mt-5" onClick={() => router.push(listHref)}>
          Back to {listLabel}
        </Button>
      </Card>
    );
  }

  const howToLabel =
    draft.draftType === "result" ? "How to Check Result" : draft.draftType === "admit_card" ? "How to Download Admit Card" : "How to Apply";
  const documentsLabel = draft.draftType === "admit_card" ? "Exam Day Instructions / Documents to Carry" : "Documents Required";

  const verification = (draft.extractedFields as { verification?: { sourceHeadingCount?: number; capturedHeadingCount?: number; possibleGap?: boolean } })?.verification;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: listLabel, href: listHref },
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

      {verification?.possibleGap && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-warning)] bg-[var(--color-warning-tint)] px-4 py-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-semibold">This extraction might be missing a section.</span> The source page had{" "}
            {verification.sourceHeadingCount} heading(s) worth checking, but only {verification.capturedHeadingCount} ended up with
            captured content below. This isn&apos;t a diagnosis of what&apos;s missing — open the source link and compare before approving.
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
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
          <ChipInput label="Tags" value={tags} onChange={setTags} hint="Shown as extra chips alongside Category on the card and detail page." />

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
            <SectionDivider label="Sections" />
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Everything the bot found beyond the fields above lands here automatically, one section per source
              heading. Retitle, edit, reorder, remove, or add your own before publishing.
            </p>
            <DynamicSectionsEditor sections={additionalSections} setSections={setAdditionalSections} />
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
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={previewing}
              className="flex-1"
            >
              <Eye size={15} /> {previewing ? "Building preview…" : "Preview Post"}
            </Button>
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
