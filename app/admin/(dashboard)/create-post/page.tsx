"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, Plus, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DraftType } from "@/lib/types";
import { Button } from "@/components/Button";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { TextField, TextAreaField, SelectField, DateField, SearchableSelectField } from "@/components/FormField";
import { TYPE_LABELS, RowsEditor, SectionDivider } from "@/components/admin/DraftFormShared";
import { ChipInput } from "@/components/admin/ChipInput";
import { states } from "@/lib/taxonomy";
import { IconButton } from "@/components/admin/IconButton";
import { openPreviewTab, fillPreviewTab } from "@/lib/adminPreview";
import {
  DynamicSectionsEditor,
  DynamicSectionDraft,
  draftsToSections,
} from "@/components/admin/DynamicSectionsEditor";

const PUBLIC_PATH_PREFIX: Record<DraftType, string> = {
  job: "/jobs",
  result: "/results",
  admit_card: "/admit-cards",
};

const rowSchema = z.object({ label: z.string(), url: z.string() });
const faqSchema = z.object({ question: z.string(), answer: z.string() });
const dateRowSchema = z.object({ label: z.string(), date: z.string() });

const createPostSchema = z.object({
  draftType: z.enum(["job", "result", "admit_card"]),
  title: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  category: z.string(),
  tags: z.array(z.string()),
  subtitle: z.string(),
  state: z.string(),
  department: z.string(),
  keyDates: z.array(dateRowSchema),
  resultDate: z.string(),
  releaseDate: z.string(),
  examDate: z.string(),
  importantLinksRows: z.array(rowSchema),
  faqs: z.array(faqSchema),
  sections: z.array(z.custom<DynamicSectionDraft>()),
  conclusion: z.string(),
});

type FormValues = z.infer<typeof createPostSchema>;

// Module-level (not a React ref) so the handleSubmit callbacks below can
// close over it without tripping react-hooks/refs — this page only ever has
// one mounted instance, so a plain variable is safe here.
let previewTabHandle: Window | null = null;

const defaultValues: FormValues = {
  draftType: "job",
  title: "",
  organization: "",
  category: "",
  tags: [],
  subtitle: "",
  state: "",
  department: "",
  keyDates: [],
  resultDate: "",
  releaseDate: "",
  examDate: "",
  importantLinksRows: [],
  faqs: [],
  sections: [],
  conclusion: "",
};

export default function CreatePostPage() {
  const router = useRouter();

  const { register, control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues,
  });
  const draftType = useWatch({ control, name: "draftType" });

  const {
    fields: keyDateFields,
    append: appendKeyDate,
    remove: removeKeyDate,
  } = useFieldArray({ control, name: "keyDates" });

  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [created, setCreated] = useState<{ id: string } | null>(null);
  const [published, setPublished] = useState<{ type: DraftType; slug: string } | null>(null);

  const buildExtractedFields = (values: FormValues): Record<string, unknown> => {
    const extractedFields: Record<string, unknown> = {
      title: values.title.trim(),
      organization: values.organization.trim(),
      category: values.category.trim(),
    };
    if (values.tags.length > 0) extractedFields.tags = values.tags;

    const linkRows = values.importantLinksRows.filter((r) => r.label.trim() || r.url.trim());
    if (linkRows.length > 0) extractedFields.importantLinks = linkRows;

    const faqLines = values.faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f) => `${f.question.trim()} Ans: ${f.answer.trim()}`);
    if (faqLines.length > 0) extractedFields.faqText = faqLines;

    const genericSections = draftsToSections(values.sections);
    if (genericSections.length > 0) extractedFields.genericSections = genericSections;

    if (values.conclusion.trim()) extractedFields.conclusionText = values.conclusion.trim();

    if (values.draftType === "job") {
      Object.assign(extractedFields, {
        state: values.state.trim() || "Bihar",
        department: values.department.trim() || values.organization.trim(),
        shortInfo: values.subtitle.trim(),
      });
      const importantDates = values.keyDates.filter((d) => d.label.trim() && d.date.trim());
      if (importantDates.length > 0) extractedFields.importantDates = importantDates;
    } else if (values.draftType === "result") {
      extractedFields.resultDate = values.resultDate || new Date().toISOString().slice(0, 10);
      if (values.subtitle.trim()) extractedFields.summary = values.subtitle.trim();
    } else {
      extractedFields.examDate = values.examDate || new Date().toISOString().slice(0, 10);
      extractedFields.releaseDate = values.releaseDate || new Date().toISOString().slice(0, 10);
    }

    return extractedFields;
  };

  const onPreview = handleSubmit(
    async (values) => {
      setPreviewing(true);
      try {
        const primaryLink = values.importantLinksRows.find((r) => r.url.trim())?.url.trim();
        const res = await fetch("/api/admin/drafts/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: values.title.trim(),
            organization: values.organization.trim(),
            sourceUrl: primaryLink ?? "",
            draftType: values.draftType,
            extractedFields: buildExtractedFields(values),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not build a preview.");
        fillPreviewTab(previewTabHandle, data);
      } catch (err) {
        previewTabHandle?.close();
        toast.error(err instanceof Error ? err.message : "Could not build a preview. Please try again.");
      } finally {
        setPreviewing(false);
      }
    },
    () => {
      previewTabHandle?.close();
      toast.error("Title and Organization are required before you can preview.");
    }
  );

  // react-hook-form's handleSubmit runs its (async, zod-based) validation
  // before calling the callback above, so by the time we'd reach it any
  // window.open() is no longer tied to this click and gets popup-blocked.
  // Open the tab here instead, synchronously on the actual click.
  const handlePreviewClick = () => {
    previewTabHandle = openPreviewTab();
    onPreview();
  };

  const onCreate = handleSubmit(
    async (values) => {
      const primaryLink = values.importantLinksRows.find((r) => r.url.trim())?.url.trim();
      if (!primaryLink) {
        toast.error("Add at least one Important Link — the first one becomes this post's official reference link.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/admin/drafts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: values.title.trim(),
            organization: values.organization.trim(),
            sourceUrl: primaryLink,
            draftType: values.draftType,
            extractedFields: buildExtractedFields(values),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not create this post.");
        setCreated({ id: data.draft.id });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create this post. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    () => toast.error("Title and Organization are required.")
  );

  const onPublish = handleSubmit(
    async (values) => {
      const primaryLink = values.importantLinksRows.find((r) => r.url.trim())?.url.trim();
      if (!primaryLink) {
        toast.error("Add at least one Important Link — the first one becomes this post's official reference link.");
        return;
      }
      setPublishing(true);
      try {
        const res = await fetch("/api/admin/drafts/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: values.title.trim(),
            organization: values.organization.trim(),
            sourceUrl: primaryLink,
            draftType: values.draftType,
            extractedFields: buildExtractedFields(values),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not publish this post.");
        toast.success("Published — it's live on the site now.");
        setPublished({ type: data.approved.type, slug: data.approved.entity.slug });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not publish this post. Please try again.");
      } finally {
        setPublishing(false);
      }
    },
    () => toast.error("Title and Organization are required.")
  );

  if (published) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        <CheckCircle2 size={32} className="mx-auto text-[var(--color-success)]" />
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Published</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          It&apos;s live on the site right now — no review step needed.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={() => window.open(`${PUBLIC_PATH_PREFIX[published.type]}/${published.slug}`, "_blank", "noopener")}
          >
            View Live
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Create Another Post
          </Button>
        </div>
      </Card>
    );
  }

  if (created) {
    return (
      <Card padding="p-8" className="mx-auto max-w-lg text-center">
        <CheckCircle2 size={32} className="mx-auto text-[var(--color-success)]" />
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Draft created</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          It&apos;s saved under Drafts — review everything one more time, then Approve &amp; Publish or Reject.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push(`/admin/my-drafts/${created.id}`)}>Go to Review</Button>
          <Button variant="secondary" onClick={() => router.push("/admin/my-drafts")}>
            Back to Drafts
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Drafts", href: "/admin/my-drafts" }, { label: "Create Post" }]} />

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Create Post</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Write a Job, Result, or Admit Card post from scratch — every section below is yours to name and shape.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handlePreviewClick}
          disabled={previewing || submitting || publishing}
          title="See how this post will look on the public site before creating it"
        >
          <Eye size={15} /> {previewing ? "Building preview…" : "Preview Post"}
        </Button>
      </div>

      <Card className="mt-5 space-y-4">
        <SelectField
          label="Post Type"
          options={(Object.keys(TYPE_LABELS) as DraftType[]).map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
          {...register("draftType")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Title" {...register("title")} />
          <TextField label="Organization" {...register("organization")} />
        </div>
        <TextField label="Category" {...register("category")} />
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
        <TextAreaField
          label="Subtitle"
          hint="One or two sentences shown at the top of the page, under the title."
          {...register("subtitle")}
        />

        {draftType === "job" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <SearchableSelectField
                  label="State"
                  value={field.value}
                  onChange={field.onChange}
                  options={states.filter((s) => s !== "All")}
                />
              )}
            />
            <TextField label="Department" {...register("department")} />
          </div>
        )}

        {draftType === "result" && (
          <Controller
            control={control}
            name="resultDate"
            render={({ field }) => <DateField label="Result Date" value={field.value} onChange={field.onChange} />}
          />
        )}

        {draftType === "admit_card" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="releaseDate"
              render={({ field }) => <DateField label="Release Date" value={field.value} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="examDate"
              render={({ field }) => <DateField label="Exam Date" value={field.value} onChange={field.onChange} />}
            />
          </div>
        )}

        {draftType === "job" && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <SectionDivider label="Key Dates" />
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Name each date yourself — e.g. &quot;Application Start&quot;, &quot;Application End&quot;, &quot;Exam Date&quot;.
              A date labeled exactly &quot;Application End&quot; powers the closing-soon badge on the card.
            </p>
            <div className="space-y-3">
              {keyDateFields.map((field, i) => (
                <div key={field.id} className="space-y-2 rounded-lg bg-[var(--color-border)] p-3">
                  <div className="flex justify-end">
                    <IconButton
                      icon={<Trash2 size={13} />}
                      label="Remove date"
                      tone="danger"
                      size="sm"
                      onClick={() => removeKeyDate(i)}
                    />
                  </div>
                  <TextField label="Label" {...register(`keyDates.${i}.label`)} />
                  <Controller
                    control={control}
                    name={`keyDates.${i}.date`}
                    render={({ field: dateField }) => (
                      <DateField label="Date" value={dateField.value} onChange={dateField.onChange} />
                    )}
                  />
                </div>
              ))}
              <Button type="button" size="sm" onClick={() => appendKeyDate({ label: "", date: "" })}>
                <Plus size={14} /> Add Date
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <SectionDivider label="Important Links (sidebar buttons)" />
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Add every action link here — Apply Online, Download Notification, Official Website, Check Result,
            Download Admit Card. The first link doubles as this post&apos;s official reference link.
          </p>
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
          <SectionDivider label="Sections" />
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Add as many sections as you need, in any order — Important Dates, Age Limit, Post Details, Eligibility,
            Selection Process, How to Apply, or anything else. Name each one yourself and pick how it holds its
            content.
          </p>
          <Controller
            control={control}
            name="sections"
            render={({ field }) => (
              <DynamicSectionsEditor
                sections={field.value}
                setSections={(updater) => field.onChange(updater(field.value))}
              />
            )}
          />
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <SectionDivider label="FAQ Section" />
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
            onClick={handlePreviewClick}
            disabled={previewing || submitting || publishing}
            className="flex-1"
          >
            <Eye size={15} /> {previewing ? "Building preview…" : "Preview Post"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCreate}
            disabled={submitting || previewing || publishing}
            className="flex-1"
          >
            {submitting ? "Creating…" : "Create Draft"}
          </Button>
          <Button
            type="button"
            onClick={onPublish}
            disabled={publishing || previewing || submitting}
            className="flex-1"
          >
            <Rocket size={15} /> {publishing ? "Publishing…" : "Publish Directly"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
