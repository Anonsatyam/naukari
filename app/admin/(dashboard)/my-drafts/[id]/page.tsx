"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { ExternalLink, CheckCircle2, XCircle, Eye, FileText, TriangleAlert } from "lucide-react";
import { Draft, AdditionalSection } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { deepDecodeEntities } from "@/lib/entities";
import { openPreviewWindow } from "@/lib/adminPreview";
import { TABLE_SEP, deriveAgeRange, deriveSalaryRange, parseFaqLines } from "@/lib/pipeTables";
import { Button } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField, DateField, SearchableSelectField } from "@/components/FormField";
import { ChipInput } from "@/components/admin/ChipInput";
import { states } from "@/lib/taxonomy";
import { toast } from "sonner";
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

const LIST_HREF = "/admin/my-drafts";
const LIST_LABEL = "Drafts";

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

interface FormValues {
  fields: Record<string, string>;
  ageAsOnDate: string;
  ageLimitByGrade: AgeLimitRowDraft[];
  ageRelaxationBreakdown: AgeRelaxationRowDraft[];
  importantLinksRows: LinkRowDraft[];
  eligibilityDetails: string;
  examPatternNotes: string;
  howToLines: string;
  faqs: FaqDraft[];
  additionalSections: DynamicSectionDraft[];
  conclusion: string;
  tags: string[];
}

const EMPTY_DEFAULTS: FormValues = {
  fields: {},
  ageAsOnDate: "",
  ageLimitByGrade: [],
  ageRelaxationBreakdown: [],
  importantLinksRows: [],
  eligibilityDetails: "",
  examPatternNotes: "",
  howToLines: "",
  faqs: [],
  additionalSections: [],
  conclusion: "",
  tags: [],
};

export default function ManualDraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const { register, control, getValues, reset } = useForm<FormValues>({ defaultValues: EMPTY_DEFAULTS });

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/drafts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: { draft: Draft }) => {
        const cleanedDraft: Draft = {
          ...data.draft,
          extractedFields: deepDecodeEntities(data.draft.extractedFields) as Draft["extractedFields"],
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
        let eligibilityDetailsValue = "";
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
            state: String(ex.state ?? ""),
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
            eligibilityDetailsValue = pipeRowsToLines(ex.eligibility).join("\n");
          }
        }

        reset({
          fields: { ...common, ...typeSpecific },
          ageAsOnDate: "",
          ageLimitByGrade: [],
          ageRelaxationBreakdown: [],
          importantLinksRows:
            Array.isArray(ex.importantLinks) && ex.importantLinks.length > 0
              ? (ex.importantLinks as LinkRowDraft[])
              : [],
          eligibilityDetails: eligibilityDetailsValue,
          examPatternNotes: "",
          howToLines:
            Array.isArray(ex.howToApply) && ex.howToApply.length > 0 ? (ex.howToApply as string[]).join("\n") : "",
          faqs: Array.isArray(ex.faqText) && ex.faqText.length > 0 ? parseFaqLines(ex.faqText as string[]) : [],
          additionalSections:
            Array.isArray(ex.genericSections) && ex.genericSections.length > 0
              ? (ex.genericSections as AdditionalSection[]).map(sectionToDraft)
              : [],
          conclusion: typeof ex.conclusionText === "string" && ex.conclusionText ? ex.conclusionText : "",
          tags: Array.isArray(ex.tags) && ex.tags.length > 0 ? (ex.tags as string[]) : [],
        });
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [id, reset]);

  const buildEditsPayload = (values: FormValues): Record<string, unknown> => {
    const { fields } = values;
    const body: Record<string, unknown> = {
      title: fields.title,
      organization: fields.organization,
      category: fields.category,
    };
    if (values.tags.length > 0) body.tags = values.tags;

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

    const ageLimitRows = values.ageLimitByGrade.filter((r) => r.grade || r.minAge || r.maxAge);
    if (ageLimitRows.length > 0) body.ageLimitByGrade = ageLimitRows;

    const ageRelaxationRows = values.ageRelaxationBreakdown.filter((r) => r.category || r.relaxation);
    if (ageRelaxationRows.length > 0) body.ageRelaxationBreakdown = ageRelaxationRows;

    const linkRows = values.importantLinksRows.filter((r) => r.label || r.url);
    if (linkRows.length > 0) body.importantLinks = linkRows;

    const howToList = values.howToLines.split("\n").map((s) => s.trim()).filter(Boolean);
    if (howToList.length > 0) body.howToApply = howToList;

    const examNotes = values.examPatternNotes.split("\n").map((s) => s.trim()).filter(Boolean);
    if (examNotes.length > 0) body.examPatternNotes = examNotes;

    const faqRows = values.faqs.filter((f) => f.question || f.answer);
    if (faqRows.length > 0) body.faqs = faqRows;

    if (values.conclusion.trim()) body.conclusion = values.conclusion.trim();

    const sectionRows = draftsToSections(values.additionalSections);
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

      if (values.ageAsOnDate) body.ageAsOnDate = values.ageAsOnDate;

      const eligibilityLines = values.eligibilityDetails.split("\n").map((s) => s.trim()).filter(Boolean);
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
    try {
      const res = await fetch(`/api/admin/drafts/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEditsPayload(getValues())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not build a preview.");
      openPreviewWindow(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build a preview. Please try again.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEditsPayload(getValues())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setDecision("approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve this draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Reject failed");
      setDecision("rejected");
    } catch {
      toast.error("Could not reject this draft. Please try again.");
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
        <Button className="mt-5" onClick={() => router.push(LIST_HREF)}>
          Back to {LIST_LABEL}
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
        <Button className="mt-5" onClick={() => router.push(LIST_HREF)}>
          Back to {LIST_LABEL}
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
          { label: LIST_LABEL, href: LIST_HREF },
          { label: draft.jobTitle },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
            Edit Draft
            <Badge tone="primary">{TYPE_LABELS[draft.draftType]}</Badge>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Created {formatDate(draft.detectedAt)}
          </p>
        </div>
      </div>

      {verification?.possibleGap && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-warning)] bg-[var(--color-warning-tint)] px-4 py-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-semibold">This extraction might be missing a section.</span> The source page had{" "}
            {verification.sourceHeadingCount} heading(s) worth checking, but only {verification.capturedHeadingCount} ended up with
            captured content below. This isn&apos;t a diagnosis of what&apos;s missing — compare before approving.
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Title" {...register("fields.title")} />
            <TextField label="Organization" {...register("fields.organization")} />
          </div>
          <TextField label="Category" {...register("fields.category")} />
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <ChipInput
                label="Tags"
                value={field.value}
                onChange={field.onChange}
                hint="Shown as extra chips alongside Category on the card and detail page."
              />
            )}
          />

          {draft.draftType === "job" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="fields.state"
                  render={({ field }) => (
                    <SearchableSelectField
                      label="State"
                      value={field.value}
                      onChange={field.onChange}
                      options={states.filter((s) => s !== "All")}
                    />
                  )}
                />
                <TextField label="Department" {...register("fields.department")} />
              </div>
              <TextAreaField
                label="Short Info"
                hint="One or two sentences shown at the top of the job page, under the title."
                {...register("fields.shortInfo")}
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField label="Total Vacancies" type="number" {...register("fields.totalVacancies")} />
                <TextField label="Qualification" {...register("fields.qualification")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField label="Min. Age" type="number" {...register("fields.minAge")} />
                <TextField label="Max. Age" type="number" {...register("fields.maxAge")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField label="Salary Min (₹)" type="number" {...register("fields.salaryMin")} />
                <TextField label="Salary Max (₹)" type="number" {...register("fields.salaryMax")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField label="Official Apply URL" {...register("fields.officialApplyUrl")} />
                <TextField label="Official Notification URL" {...register("fields.officialNotificationUrl")} />
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <SectionDivider label="Important Dates" />
                <div className="grid grid-cols-2 gap-4">
                  {JOB_DATE_FIELDS.map(({ key, label }) => (
                    <Controller
                      key={key}
                      control={control}
                      name={`fields.${key}`}
                      render={({ field }) => <DateField label={label} value={field.value} onChange={field.onChange} />}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {draft.draftType === "result" && (
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="fields.resultDate"
                render={({ field }) => <DateField label="Result Date" value={field.value} onChange={field.onChange} />}
              />
              <TextField label="Official Link" {...register("fields.officialLink")} />
              <div className="col-span-2">
                <TextAreaField
                  label="Summary"
                  hint="One or two sentences shown at the top of the result page, under the title."
                  {...register("fields.summary")}
                />
              </div>
            </div>
          )}

          {draft.draftType === "admit_card" && (
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="fields.releaseDate"
                render={({ field }) => <DateField label="Release Date" value={field.value} onChange={field.onChange} />}
              />
              <Controller
                control={control}
                name="fields.examDate"
                render={({ field }) => <DateField label="Exam Date" value={field.value} onChange={field.onChange} />}
              />
              <div className="col-span-2">
                <TextField label="Official Link" {...register("fields.officialLink")} />
              </div>
            </div>
          )}


          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Important Dates (full table)" />
            <Controller
              control={control}
              name="fields.importantDatesText"
              render={({ field }) => (
                <RawTableField
                  label="Raw dates table"
                  value={field.value}
                  onChange={field.onChange}
                  hint="Pipe-encoded rows — edit to fix a row, or add one."
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Application Fee" />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="General / OBC / EWS (₹)" type="number" {...register("fields.feeGeneral")} />
              <TextField label="SC / ST / PwD (₹)" type="number" {...register("fields.feeReserved")} />
            </div>
            <div className="mt-4">
              <TextField label="Fee Note" {...register("fields.feeNote")} />
            </div>
            <div className="mt-4">
              <Controller
                control={control}
                name="fields.applicationFeeText"
                render={({ field }) => (
                  <RawTableField
                    label="Full fee table (if you need more than a general/reserved split)"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Age Limit" />
            {draft.draftType === "job" && (
              <Controller
                control={control}
                name="ageAsOnDate"
                render={({ field }) => <DateField label="Age Reckoned As On" value={field.value} onChange={field.onChange} />}
              />
            )}

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Grade-wise Age Limit (optional — only for posts where the minimum/maximum age varies by grade)
              </p>
              <Controller
                control={control}
                name="ageLimitByGrade"
                render={({ field }) => (
                  <RowsEditor
                    rows={field.value}
                    setRows={(updater) => field.onChange(updater(field.value))}
                    fields={[
                      { key: "grade", label: "Grade / Cadre" },
                      { key: "minAge", label: "Min. Age" },
                      { key: "maxAge", label: "Max. Age" },
                    ]}
                    addLabel="Add Grade Row"
                    newRow={{ grade: "", minAge: "", maxAge: "" }}
                  />
                )}
              />
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Age Relaxation (optional — category-wise relaxation on top of the limits above)
              </p>
              <Controller
                control={control}
                name="ageRelaxationBreakdown"
                render={({ field }) => (
                  <RowsEditor
                    rows={field.value}
                    setRows={(updater) => field.onChange(updater(field.value))}
                    fields={[
                      { key: "category", label: "Category" },
                      { key: "relaxation", label: "Relaxation" },
                    ]}
                    addLabel="Add Relaxation Row"
                    newRow={{ category: "", relaxation: "" }}
                  />
                )}
              />
            </div>

            {draft.draftType === "job" && (
              <div className="mt-4">
                <TextField label="Age Relaxation (general note)" {...register("fields.ageRelaxation")} />
              </div>
            )}

            <div className="mt-4">
              <Controller
                control={control}
                name="fields.ageLimit"
                render={({ field }) => (
                  <RawTableField label="Full age limit table" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Post / Vacancy Details" />
            <Controller
              control={control}
              name="fields.postDetails"
              render={({ field }) => (
                <RawTableField
                  label="Raw vacancy / post details table"
                  value={field.value}
                  onChange={field.onChange}
                  hint="Category-wise vacancy counts are derived from this table automatically on publish."
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Eligibility" />
            {draft.draftType === "job" && (
              <TextAreaField
                label="Education Eligibility — Details"
                hint="One bullet point per line — shown as a bulleted list on the job page."
                {...register("eligibilityDetails")}
              />
            )}
            <div className={draft.draftType === "job" ? "mt-4" : ""}>
              <Controller
                control={control}
                name="fields.eligibility"
                render={({ field }) => (
                  <RawTableField label="Full eligibility table/list" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Selection Process" />
            <Controller
              control={control}
              name="fields.selectionProcess"
              render={({ field }) => (
                <RawTableField
                  label="Raw selection process table"
                  value={field.value}
                  onChange={field.onChange}
                  hint="Falls back to a numbered step list on the public page if this isn't a real table."
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Exam Pattern" />
            <Controller
              control={control}
              name="fields.examPattern"
              render={({ field }) => (
                <RawTableField label="Raw exam pattern table" value={field.value} onChange={field.onChange} />
              )}
            />
            <div className="mt-4">
              <TextAreaField
                label="Exam Pattern — Notes"
                hint="One note per line, e.g. negative marking or merit-list rules. Shown below the exam pattern table."
                {...register("examPatternNotes")}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label={documentsLabel} />
            <Controller
              control={control}
              name="fields.documentsRequired"
              render={({ field }) => (
                <RawTableField label="Raw table/list" value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <TextAreaField
              label={howToLabel}
              hint="One step per line — shown as a numbered list on the public page."
              {...register("howToLines")}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Important Links" />
            <Controller
              control={control}
              name="importantLinksRows"
              render={({ field }) => (
                <RowsEditor
                  rows={field.value}
                  setRows={(updater) => field.onChange(updater(field.value))}
                  fields={[
                    { key: "label", label: "Label" },
                    { key: "url", label: "URL", kind: "url" },
                  ]}
                  addLabel="Add Link"
                  newRow={{ label: "", url: "" }}
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="FAQs" />
            <Controller
              control={control}
              name="faqs"
              render={({ field }) => (
                <RowsEditor
                  rows={field.value}
                  setRows={(updater) => field.onChange(updater(field.value))}
                  fields={[
                    { key: "question", label: "Question" },
                    { key: "answer", label: "Answer", multiline: true },
                  ]}
                  addLabel="Add FAQ"
                  newRow={{ question: "", answer: "" }}
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Sections" />
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Add as many sections as you need, in any order. Retitle, edit, reorder, remove, or add your own
              before publishing.
            </p>
            <Controller
              control={control}
              name="additionalSections"
              render={({ field }) => (
                <DynamicSectionsEditor
                  sections={field.value}
                  setSections={(updater) => field.onChange(updater(field.value))}
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            {draft.draftType === "job" && <TextAreaField label="Syllabus" {...register("fields.syllabusSummary")} />}
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <TextAreaField
              label="Conclusion"
              hint="Closing summary paragraph shown at the bottom of the page."
              {...register("conclusion")}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:flex-row">
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
              <CheckCircle2 size={15} /> {submitting ? "Publishing…" : "Publish"}
            </Button>
            <Button
              variant="dangerOutline"
              onClick={handleReject}
              disabled={submitting}
              className="flex-1"
            >
              <XCircle size={15} /> Discard
            </Button>
          </div>
        </Card>

        <Card className="h-fit space-y-4 lg:sticky lg:top-24">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <FileText size={15} /> Reference Link
          </p>
          <p className="break-all text-xs text-[var(--color-text-secondary)]">{draft.sourceUrl}</p>
          <a
            href={draft.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]"
          >
            Open link <ExternalLink size={13} />
          </a>
        </Card>
      </div>
    </div>
  );
}
