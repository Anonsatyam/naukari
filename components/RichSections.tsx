import { Wallet, Hourglass, Users, ListChecks, ClipboardList, FileText, GraduationCap } from "lucide-react";
import { Section, StepList, PipeTableOrText } from "@/components/DetailSections";
import { KeyValueRow } from "@/components/KeyValueRow";
import { formatCurrency } from "@/lib/utils";
import type { VacancyBreakdown, AgeLimitRow, AgeRelaxationRow } from "@/lib/types";

// The Application Fee / Age Limit / Vacancy Details / Selection Process /
// Exam Pattern / Documents Required sections, factored out of the Job
// detail page so Result and Admit Card pages render the exact same
// fields the exact same way instead of each re-implementing (and
// silently drifting out of parity with) their own version. A source
// routinely bundles a full recruitment notification's worth of these
// into what's nominally a "Result" or "Admit Card" page — see
// lib/types.ts's ResultItem/AdmitCardItem comments for why those two
// carry the same fields Job does. Unlike the Job page (which always
// shows these six sections with a placeholder), every section here is
// self-hiding (returns null) when the entity genuinely has none of
// that data, since a plain result/admit-card announcement often won't.

export function ApplicationFeeSection({
  fee,
  feeText,
}: {
  fee?: { general: number; reserved: number; note?: string };
  feeText?: string;
}) {
  if (!feeText && !fee) return null;
  return (
    <Section title="Application Fee" icon={<Wallet size={16} />} accent="green">
      {feeText ? (
        <PipeTableOrText text={feeText} />
      ) : (
        <div className="space-y-3">
          <KeyValueRow label="General / OBC" value={formatCurrency(fee!.general)} />
          <KeyValueRow label="SC / ST / Reserved" value={formatCurrency(fee!.reserved)} />
          {fee!.note && <p className="text-xs text-[var(--color-text-secondary)]">{fee!.note}</p>}
        </div>
      )}
    </Section>
  );
}

export function AgeLimitSection({
  ageLimitByGrade,
  ageRelaxationBreakdown,
  ageLimitText,
  children,
}: {
  ageLimitByGrade?: AgeLimitRow[];
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageLimitText?: string;
  children?: React.ReactNode;
}) {
  const hasGradeTable = Array.isArray(ageLimitByGrade) && ageLimitByGrade.length > 0;
  const hasRelaxationTable = Array.isArray(ageRelaxationBreakdown) && ageRelaxationBreakdown.length > 0;
  if (!hasGradeTable && !hasRelaxationTable && !ageLimitText) return null;

  return (
    <Section title="Age Limit Details" icon={<Hourglass size={16} />} accent="purple">
      {hasGradeTable && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Grade-wise Age Limit
          </p>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="grid grid-cols-3 gap-3 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
              <span>Grade / Cadre</span>
              <span>Min. Age</span>
              <span>Max. Age</span>
            </div>
            <div>
              {ageLimitByGrade!.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-[var(--color-text-primary)]">{row.grade}</span>
                  <span className="text-[var(--color-text-secondary)]">{row.minAge}</span>
                  <span className="text-[var(--color-text-secondary)]">{row.maxAge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasRelaxationTable && (
        <div className={hasGradeTable ? "mt-4" : ""}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Age Relaxation
          </p>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="grid grid-cols-2 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
              <span>Category</span>
              <span className="text-right">Relaxation</span>
            </div>
            <div>
              {ageRelaxationBreakdown!.map((row) => (
                <div key={row.category} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                  <span className="text-right font-medium text-[var(--color-text-primary)]">{row.relaxation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!hasGradeTable && !hasRelaxationTable && ageLimitText && <PipeTableOrText text={ageLimitText} />}

      {children}
    </Section>
  );
}

export function VacancyDetailsSection({
  vacancyBreakdown,
  postDetailsText,
  totalVacancies,
}: {
  vacancyBreakdown?: VacancyBreakdown[];
  postDetailsText?: string;
  totalVacancies?: number;
}) {
  const hasTable = Array.isArray(vacancyBreakdown) && vacancyBreakdown.length > 0;
  const hasFallback = !hasTable && !!postDetailsText;
  if (!hasTable && !hasFallback) return null;

  const hasGrade = hasTable && vacancyBreakdown!.some((row) => row.grade);
  const cols = hasGrade ? "grid-cols-[1fr_auto_auto]" : "grid-cols-2";

  return (
    <Section title="Post / Vacancy Details" icon={<Users size={16} />} accent="orange">
      {hasTable ? (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <div className={`grid ${cols} gap-3 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white`}>
            <span>Post / Category</span>
            {hasGrade && <span>Grade</span>}
            <span className="text-right">Posts</span>
          </div>
          <div>
            {vacancyBreakdown!.map((row) => (
              <div key={row.category} className={`grid ${cols} gap-3 px-4 py-2.5 text-sm`}>
                <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                {hasGrade && <span className="text-[var(--color-text-secondary)]">{row.grade ?? "—"}</span>}
                <span className="text-right font-medium text-[var(--color-text-primary)]">
                  {row.count.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
            <div className={`grid ${cols} gap-3 bg-[var(--color-background)] px-4 py-2.5 text-sm font-semibold`}>
              <span className="text-[var(--color-text-primary)]">Total</span>
              {hasGrade && <span />}
              <span className="text-right text-[var(--color-text-primary)]">
                {totalVacancies ? totalVacancies.toLocaleString("en-IN") : "As notified"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <PipeTableOrText text={postDetailsText!} />
      )}
    </Section>
  );
}

export function SelectionProcessSection({
  selectionProcess,
  selectionProcessText,
}: {
  selectionProcess?: string[];
  selectionProcessText?: string;
}) {
  const hasSteps = Array.isArray(selectionProcess) && selectionProcess.length > 0;
  if (!hasSteps && !selectionProcessText) return null;
  return (
    <Section title="Selection Process" icon={<ListChecks size={16} />} accent="blue">
      {selectionProcessText ? <PipeTableOrText text={selectionProcessText} /> : <StepList items={selectionProcess!} />}
    </Section>
  );
}

export function ExamPatternSection({
  examPattern,
  examPatternNotes,
}: {
  examPattern?: string;
  examPatternNotes?: string[];
}) {
  if (!examPattern) return null;
  return (
    <Section title="Exam Pattern" icon={<ClipboardList size={16} />} accent="amber">
      <PipeTableOrText text={examPattern} />
      {Array.isArray(examPatternNotes) && examPatternNotes.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4">
          {examPatternNotes.map((note, i) => (
            <li key={i} className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              • {note}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function EligibilitySection({ eligibilityText }: { eligibilityText?: string }) {
  if (!eligibilityText) return null;
  return (
    <Section title="Eligibility" icon={<GraduationCap size={16} />} accent="teal">
      <PipeTableOrText text={eligibilityText} />
    </Section>
  );
}

export function DocumentsRequiredSection({ documentsRequired }: { documentsRequired?: string }) {
  if (!documentsRequired) return null;
  return (
    <Section title="Documents Required" icon={<FileText size={16} />} accent="neutral">
      <PipeTableOrText text={documentsRequired} />
    </Section>
  );
}
