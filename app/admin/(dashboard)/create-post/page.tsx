"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { DraftType } from "@/lib/types";
import { Button } from "@/components/Button";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField } from "@/components/FormField";
import { fieldInputClass, fieldLabelClass } from "@/lib/ui";
import {
  AgeLimitRowDraft,
  AgeRelaxationRowDraft,
  LinkRowDraft,
  FaqDraft,
  TYPE_LABELS,
  JOB_DATE_FIELDS,
  RowsEditor,
  SectionDivider,
} from "@/components/admin/DraftFormShared";
import { TableBuilder, TableBuilderValue, emptyTableBuilderValue, tableBuilderToPipeText } from "@/components/admin/TableBuilder";
import { ChipInput } from "@/components/admin/ChipInput";

interface CustomSectionDraft {
  heading: string;
  table: TableBuilderValue;
}

export default function CreatePostPage() {
  const router = useRouter();

  const [draftType, setDraftType] = useState<DraftType>("job");

  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [state, setState] = useState("Bihar");
  const [department, setDepartment] = useState("");
  const [shortInfo, setShortInfo] = useState("");
  const [totalVacancies, setTotalVacancies] = useState("0");
  const [qualification, setQualification] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [ageRelaxation, setAgeRelaxation] = useState("");
  const [syllabusSummary, setSyllabusSummary] = useState("");
  const [officialApplyUrl, setOfficialApplyUrl] = useState("");
  const [officialNotificationUrl, setOfficialNotificationUrl] = useState("");
  const [jobDates, setJobDates] = useState<Record<string, string>>({});

  const [resultDate, setResultDate] = useState("");
  const [summary, setSummary] = useState("");
  const [officialLink, setOfficialLink] = useState("");

  const [releaseDate, setReleaseDate] = useState("");
  const [examDate, setExamDate] = useState("");

  const [feeGeneral, setFeeGeneral] = useState("");
  const [feeReserved, setFeeReserved] = useState("");
  const [feeNote, setFeeNote] = useState("");

  const [importantDatesTable, setImportantDatesTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [applicationFeeTable, setApplicationFeeTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [ageLimitTable, setAgeLimitTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [postDetailsTable, setPostDetailsTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [eligibilityTable, setEligibilityTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [selectionProcessTable, setSelectionProcessTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [examPatternTable, setExamPatternTable] = useState<TableBuilderValue>(emptyTableBuilderValue);
  const [documentsRequiredTable, setDocumentsRequiredTable] = useState<TableBuilderValue>(emptyTableBuilderValue);

  const [ageLimitByGrade, setAgeLimitByGrade] = useState<AgeLimitRowDraft[]>([]);
  const [ageRelaxationBreakdown, setAgeRelaxationBreakdown] = useState<AgeRelaxationRowDraft[]>([]);
  const [howToLines, setHowToLines] = useState("");
  const [importantLinksRows, setImportantLinksRows] = useState<LinkRowDraft[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [customSections, setCustomSections] = useState<CustomSectionDraft[]>([]);
  const [conclusion, setConclusion] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string } | null>(null);

  const howToLabel =
    draftType === "result" ? "How to Check Result" : draftType === "admit_card" ? "How to Download Admit Card" : "How to Apply";
  const documentsLabel = draftType === "admit_card" ? "Exam Day Instructions / Documents to Carry" : "Documents Required";

  const addCustomSection = () => setCustomSections((prev) => [...prev, { heading: "", table: emptyTableBuilderValue() }]);
  const removeCustomSection = (i: number) => setCustomSections((prev) => prev.filter((_, idx) => idx !== i));
  const updateCustomSectionHeading = (i: number, heading: string) =>
    setCustomSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, heading } : s)));
  const updateCustomSectionTable = (i: number, table: TableBuilderValue) =>
    setCustomSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, table } : s)));

  const handleCreate = async () => {
    setError(null);

    if (!title.trim() || !organization.trim()) {
      setError("Title and Organization are required.");
      return;
    }

    const primaryLink =
      draftType === "job" ? officialApplyUrl.trim() || officialNotificationUrl.trim() : officialLink.trim();
    if (!primaryLink) {
      setError(
        draftType === "job"
          ? "Fill in at least the Official Apply URL or Official Notification URL."
          : "Fill in the Official Link."
      );
      return;
    }

    setSubmitting(true);
    try {
      const extractedFields: Record<string, unknown> = {
        title: title.trim(),
        organization: organization.trim(),
        category: category.trim(),
      };
      if (tags.length > 0) extractedFields.tags = tags;

      const rawTables: [string, TableBuilderValue][] = [
        ["importantDatesText", importantDatesTable],
        ["applicationFeeText", applicationFeeTable],
        ["ageLimit", ageLimitTable],
        ["postDetails", postDetailsTable],
        ["eligibility", eligibilityTable],
        ["selectionProcess", selectionProcessTable],
        ["examPattern", examPatternTable],
        ["documentsRequired", documentsRequiredTable],
      ];
      for (const [key, table] of rawTables) {
        const pipeText = tableBuilderToPipeText(table);
        if (pipeText) extractedFields[key] = pipeText;
      }

      const applicationFee: { general?: number; reserved?: number; note?: string } = {};
      if (feeGeneral) applicationFee.general = Number(feeGeneral) || 0;
      if (feeReserved) applicationFee.reserved = Number(feeReserved) || 0;
      if (feeNote.trim()) applicationFee.note = feeNote.trim();
      if (Object.keys(applicationFee).length > 0) extractedFields.applicationFee = applicationFee;

      const howToList = howToLines.split("\n").map((s) => s.trim()).filter(Boolean);
      if (howToList.length > 0) extractedFields.howToApply = howToList;

      const linkRows = importantLinksRows.filter((r) => r.label.trim() || r.url.trim());
      if (linkRows.length > 0) extractedFields.importantLinks = linkRows;

      const faqLines = faqs
        .filter((f) => f.question.trim() && f.answer.trim())
        .map((f) => `${f.question.trim()} Ans: ${f.answer.trim()}`);
      if (faqLines.length > 0) extractedFields.faqText = faqLines;

      const genericSections = customSections
        .filter((s) => s.heading.trim())
        .map((s) => ({ heading: s.heading.trim(), content: tableBuilderToPipeText(s.table) }))
        .filter((s) => s.content);
      if (genericSections.length > 0) extractedFields.genericSections = genericSections;

      if (conclusion.trim()) extractedFields.conclusionText = conclusion.trim();

      if (draftType === "job") {
        Object.assign(extractedFields, {
          state: state.trim() || "Bihar",
          department: department.trim() || organization.trim(),
          shortInfo: shortInfo.trim(),
          totalVacancies: Number(totalVacancies) || 0,
          qualification: qualification.trim(),
          ageRelaxation: ageRelaxation.trim(),
          syllabusSummary: syllabusSummary.trim(),
        });
        if (officialApplyUrl.trim()) extractedFields.officialApplyUrl = officialApplyUrl.trim();
        if (officialNotificationUrl.trim()) extractedFields.officialNotificationUrl = officialNotificationUrl.trim();
        if (minAge) extractedFields.minAge = Number(minAge);
        if (maxAge) extractedFields.maxAge = Number(maxAge);
        if (salaryMin) extractedFields.salaryMin = Number(salaryMin);
        if (salaryMax) extractedFields.salaryMax = Number(salaryMax);
        const importantDates = JOB_DATE_FIELDS.filter(({ key }) => jobDates[key]).map(({ key, label }) => ({
          label,
          date: jobDates[key],
        }));
        if (importantDates.length > 0) extractedFields.importantDates = importantDates;
      } else if (draftType === "result") {
        extractedFields.resultDate = resultDate || new Date().toISOString().slice(0, 10);
        if (summary.trim()) extractedFields.summary = summary.trim();
        extractedFields.officialLink = primaryLink;
      } else {
        extractedFields.examDate = examDate || new Date().toISOString().slice(0, 10);
        extractedFields.releaseDate = releaseDate || new Date().toISOString().slice(0, 10);
        extractedFields.officialLink = primaryLink;
      }

      const res = await fetch("/api/admin/drafts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: title.trim(),
          organization: organization.trim(),
          sourceUrl: primaryLink,
          draftType,
          extractedFields,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create this post.");
      setCreated({ id: data.draft.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        <CheckCircle2 size={32} className="mx-auto text-[var(--color-success)]" />
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Draft created</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Review everything one more time, then Approve &amp; Publish or Reject.
        </p>
        <Button className="mt-5" onClick={() => router.push(`/admin/drafts/${created.id}`)}>
          Go to Review
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Create Post" }]} />

      <div className="mt-1">
        <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Create Post</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Write a Job, Result, or Admit Card post from scratch — no source page needed.
        </p>
      </div>

      <Card className="mt-5 space-y-4">
        <div>
          <label className={fieldLabelClass}>Post Type</label>
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as DraftType)}
            className={fieldInputClass}
          >
            {(Object.keys(TYPE_LABELS) as DraftType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <ChipInput label="Tags" value={tags} onChange={setTags} hint="Shown as extra chips alongside Category on the card and detail page." />

        {draftType === "job" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="State" value={state} onChange={(e) => setState(e.target.value)} />
              <TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <TextAreaField
              label="Subtitle / Short Info"
              value={shortInfo}
              onChange={(e) => setShortInfo(e.target.value)}
              hint="One or two sentences shown at the top of the job page, under the title."
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Total Vacancies" type="number" value={totalVacancies} onChange={(e) => setTotalVacancies(e.target.value)} />
              <TextField label="Qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Min. Age" type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
              <TextField label="Max. Age" type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Salary Min (₹)" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              <TextField label="Salary Max (₹)" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Official Apply URL" value={officialApplyUrl} onChange={(e) => setOfficialApplyUrl(e.target.value)} />
              <TextField label="Official Notification URL" value={officialNotificationUrl} onChange={(e) => setOfficialNotificationUrl(e.target.value)} />
            </div>
            <div className="border-t border-[var(--color-border)] pt-4">
              <SectionDivider label="Important Dates" />
              <div className="grid grid-cols-2 gap-4">
                {JOB_DATE_FIELDS.map(({ key, label }) => (
                  <TextField
                    key={key}
                    label={label}
                    type="date"
                    value={jobDates[key] ?? ""}
                    onChange={(e) => setJobDates((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {draftType === "result" && (
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Result Date" type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
            <TextField label="Official Link" value={officialLink} onChange={(e) => setOfficialLink(e.target.value)} />
            <div className="col-span-2">
              <TextAreaField
                label="Subtitle / Summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                hint="One or two sentences shown at the top of the result page, under the title."
              />
            </div>
          </div>
        )}

        {draftType === "admit_card" && (
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Release Date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            <TextField label="Exam Date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <div className="col-span-2">
              <TextField label="Official Link" value={officialLink} onChange={(e) => setOfficialLink(e.target.value)} />
            </div>
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Important Dates (full table)" />
          <TableBuilder value={importantDatesTable} onChange={setImportantDatesTable} hint="e.g. columns: Event, Date" />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Application Fee" />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="General / OBC / EWS (₹)" type="number" value={feeGeneral} onChange={(e) => setFeeGeneral(e.target.value)} />
            <TextField label="SC / ST / PwD (₹)" type="number" value={feeReserved} onChange={(e) => setFeeReserved(e.target.value)} />
          </div>
          <div className="mt-4">
            <TextField label="Fee Note" value={feeNote} onChange={(e) => setFeeNote(e.target.value)} />
          </div>
          <div className="mt-4">
            <TableBuilder value={applicationFeeTable} onChange={setApplicationFeeTable} hint="Optional — for a full fee table beyond the general/reserved split above." />
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Age Limit" />
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Grade-wise Age Limit (optional — only if the minimum/maximum age varies by grade)
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
              Age Relaxation (optional — category-wise relaxation)
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
          {draftType === "job" && (
            <div className="mt-4">
              <TextField label="Age Relaxation (general note)" value={ageRelaxation} onChange={(e) => setAgeRelaxation(e.target.value)} />
            </div>
          )}
          <div className="mt-4">
            <TableBuilder value={ageLimitTable} onChange={setAgeLimitTable} hint="Full age limit table, as it should appear on the page." />
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Post / Vacancy Details" />
          <TableBuilder value={postDetailsTable} onChange={setPostDetailsTable} hint="e.g. columns: Post Name, Category, Vacancies" />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Eligibility" />
          <TableBuilder value={eligibilityTable} onChange={setEligibilityTable} />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Selection Process" />
          <TableBuilder value={selectionProcessTable} onChange={setSelectionProcessTable} hint="e.g. columns: Stage, Details" />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Exam Pattern" />
          <TableBuilder value={examPatternTable} onChange={setExamPatternTable} />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label={documentsLabel} />
          <TableBuilder value={documentsRequiredTable} onChange={setDocumentsRequiredTable} />
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
          <SectionDivider label="Important Links (sidebar buttons)" />
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
          <SectionDivider label="FAQ Section" />
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
          <SectionDivider label="Custom Sections" />
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Add any section not covered above — give it its own name and table.
          </p>
          <div className="space-y-4">
            {customSections.map((section, i) => (
              <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1">
                    <TextField
                      label="Section Name"
                      value={section.heading}
                      onChange={(e) => updateCustomSectionHeading(i, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeCustomSection(i)}
                    className="mt-5 border-[var(--color-danger)]/30 text-[var(--color-danger)]"
                  >
                    Remove Section
                  </Button>
                </div>
                <TableBuilder value={section.table} onChange={(v) => updateCustomSectionTable(i, v)} />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addCustomSection}>
            Add Custom Section
          </Button>
        </div>

        {draftType === "job" && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <TextAreaField label="Syllabus" value={syllabusSummary} onChange={(e) => setSyllabusSummary(e.target.value)} />
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-4">
          <SectionDivider label="Conclusion Section" />
          <TextAreaField
            label="Conclusion"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            hint="Closing summary paragraph shown at the bottom of the page."
          />
        </div>

        {error && (
          <p className="rounded-lg bg-[var(--color-danger-tint)] p-3 text-sm text-[var(--color-danger)]">{error}</p>
        )}

        <div className="border-t border-[var(--color-border)] pt-4">
          <Button onClick={handleCreate} disabled={submitting} className="w-full">
            {submitting ? "Creating…" : "Create Draft"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
