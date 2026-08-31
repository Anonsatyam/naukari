"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { DraftType } from "@/lib/types";
import { Button } from "@/components/Button";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField } from "@/components/FormField";
import { fieldInputClass, fieldLabelClass } from "@/lib/ui";
import { LinkRowDraft, FaqDraft, TYPE_LABELS, RowsEditor, SectionDivider } from "@/components/admin/DraftFormShared";
import { ChipInput } from "@/components/admin/ChipInput";
import {
  DynamicSectionsEditor,
  DynamicSectionDraft,
  DateRowDraft,
  draftsToSections,
} from "@/components/admin/DynamicSectionsEditor";

export default function CreatePostPage() {
  const router = useRouter();

  const [draftType, setDraftType] = useState<DraftType>("job");

  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState("");

  const [state, setState] = useState("Bihar");
  const [department, setDepartment] = useState("");
  const [totalVacancies, setTotalVacancies] = useState("0");
  const [qualification, setQualification] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [officialApplyUrl, setOfficialApplyUrl] = useState("");
  const [officialNotificationUrl, setOfficialNotificationUrl] = useState("");
  const [keyDates, setKeyDates] = useState<DateRowDraft[]>([]);

  const [resultDate, setResultDate] = useState("");
  const [officialLink, setOfficialLink] = useState("");

  const [releaseDate, setReleaseDate] = useState("");
  const [examDate, setExamDate] = useState("");

  const [importantLinksRows, setImportantLinksRows] = useState<LinkRowDraft[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [sections, setSections] = useState<DynamicSectionDraft[]>([]);
  const [conclusion, setConclusion] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string } | null>(null);

  const addKeyDate = () => setKeyDates((prev) => [...prev, { label: "", date: "" }]);
  const removeKeyDate = (i: number) => setKeyDates((prev) => prev.filter((_, idx) => idx !== i));
  const updateKeyDate = (i: number, patch: Partial<DateRowDraft>) =>
    setKeyDates((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

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

      const linkRows = importantLinksRows.filter((r) => r.label.trim() || r.url.trim());
      if (linkRows.length > 0) extractedFields.importantLinks = linkRows;

      const faqLines = faqs
        .filter((f) => f.question.trim() && f.answer.trim())
        .map((f) => `${f.question.trim()} Ans: ${f.answer.trim()}`);
      if (faqLines.length > 0) extractedFields.faqText = faqLines;

      const genericSections = draftsToSections(sections);
      if (genericSections.length > 0) extractedFields.genericSections = genericSections;

      if (conclusion.trim()) extractedFields.conclusionText = conclusion.trim();

      if (draftType === "job") {
        Object.assign(extractedFields, {
          state: state.trim() || "Bihar",
          department: department.trim() || organization.trim(),
          shortInfo: subtitle.trim(),
          totalVacancies: Number(totalVacancies) || 0,
          qualification: qualification.trim(),
        });
        if (officialApplyUrl.trim()) extractedFields.officialApplyUrl = officialApplyUrl.trim();
        if (officialNotificationUrl.trim()) extractedFields.officialNotificationUrl = officialNotificationUrl.trim();
        if (minAge) extractedFields.minAge = Number(minAge);
        if (maxAge) extractedFields.maxAge = Number(maxAge);
        const importantDates = keyDates.filter((d) => d.label.trim() && d.date.trim());
        if (importantDates.length > 0) extractedFields.importantDates = importantDates;
      } else if (draftType === "result") {
        extractedFields.resultDate = resultDate || new Date().toISOString().slice(0, 10);
        if (subtitle.trim()) extractedFields.summary = subtitle.trim();
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
          Write a Job, Result, or Admit Card post from scratch — every section below is yours to name and shape.
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
        <TextAreaField
          label="Subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          hint="One or two sentences shown at the top of the page, under the title."
        />

        {draftType === "job" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="State" value={state} onChange={(e) => setState(e.target.value)} />
              <TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Total Vacancies" type="number" value={totalVacancies} onChange={(e) => setTotalVacancies(e.target.value)} />
              <TextField label="Qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Min. Age"
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="Used for the Eligibility Checker"
              />
              <TextField
                label="Max. Age"
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="Used for the Eligibility Checker"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Official Apply URL" value={officialApplyUrl} onChange={(e) => setOfficialApplyUrl(e.target.value)} />
              <TextField label="Official Notification URL" value={officialNotificationUrl} onChange={(e) => setOfficialNotificationUrl(e.target.value)} />
            </div>
          </>
        )}

        {draftType === "result" && (
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Result Date" type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
            <TextField label="Official Link" value={officialLink} onChange={(e) => setOfficialLink(e.target.value)} />
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

        {draftType === "job" && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <SectionDivider label="Key Dates" />
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Name each date yourself — e.g. &quot;Application Start&quot;, &quot;Application End&quot;, &quot;Exam Date&quot;.
              A date labeled exactly &quot;Application End&quot; powers the closing-soon badge on the card.
            </p>
            <div className="space-y-3">
              {keyDates.map((row, i) => (
                <div key={i} className="flex items-end gap-2 rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex-1">
                    <TextField label="Label" value={row.label} onChange={(e) => updateKeyDate(i, { label: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <TextField label="Date" type="date" value={row.date} onChange={(e) => updateKeyDate(i, { date: e.target.value })} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKeyDate(i)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
                    aria-label="Remove date"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addKeyDate}>
                <Plus size={14} /> Add Date
              </Button>
            </div>
          </div>
        )}

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
          <SectionDivider label="Sections" />
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Add as many sections as you need, in any order — Important Dates, Age Limit, Post Details, Eligibility,
            Selection Process, How to Apply, or anything else. Name each one yourself and pick how it holds its
            content.
          </p>
          <DynamicSectionsEditor sections={sections} setSections={setSections} />
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
