"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Info, ShieldQuestion } from "lucide-react";
import { qualifications, qualificationRank, classifyQualification, taxonomyLabel } from "@/lib/taxonomy";
import { Job } from "@/lib/types";
import { Button } from "./Button";
import Card from "./Card";
import { SelectField, TextField, CheckboxField } from "./FormField";
import { cn } from "@/lib/utils";

type CheckResult = {
  label: string;
  status: "pass" | "fail" | "info";
  reason: string;
};

function evaluate(
  job: Job,
  input: { qualification: string; age: number; hasBEd: boolean; isDomicile: boolean },
  t: ReturnType<typeof useTranslations<"eligibilityChecker">>,
  locale: string
): CheckResult[] {
  const results: CheckResult[] = [];

  const requiredLabel = qualificationRank[job.qualification] ? job.qualification : classifyQualification(job.qualification);
  const requiredRank = requiredLabel ? qualificationRank[requiredLabel] : undefined;
  const userRank = qualificationRank[input.qualification] ?? 1;
  if (requiredRank === undefined) {
    results.push({
      label: t("educationLabel"),
      status: "info",
      reason: t("educationUnmatched", { qualification: job.qualification }),
    });
  } else {
    const requiredDisplay = taxonomyLabel(requiredLabel ?? job.qualification, locale, "qualification");
    results.push({
      label: t("educationLabel"),
      status: userRank >= requiredRank ? "pass" : "fail",
      reason:
        userRank >= requiredRank
          ? t("educationPass", { required: requiredDisplay })
          : t("educationFail", { required: requiredDisplay }),
    });
  }

  const ageOk = input.age >= job.minAge && input.age <= job.maxAge;
  results.push({
    label: t("ageResultLabel"),
    status: ageOk ? "pass" : "fail",
    reason: ageOk
      ? t("agePass", { age: input.age, min: job.minAge, max: job.maxAge })
      : input.age > job.maxAge
      ? t("ageFailMax", { max: job.maxAge, relaxation: job.ageRelaxation ?? t("ageRelaxationDefault") })
      : t("ageFailMin", { min: job.minAge }),
  });

  job.eligibilityRules.forEach((rule) => {
    if (rule.label === "B.Ed Requirement") {
      results.push({
        label: t("bEdLabel"),
        status: input.hasBEd ? "pass" : "fail",
        reason: input.hasBEd ? t("bEdPass") : t("bEdFail"),
      });
    } else if (rule.label === "Domicile") {
      results.push({
        label: t("domicileResultLabel"),
        status: input.isDomicile ? "pass" : "fail",
        reason: input.isDomicile ? t("domicilePass") : t("domicileFail"),
      });
    } else if (rule.type === "other") {
      results.push({
        label: rule.label,
        status: "info",
        reason: rule.description,
      });
    }
  });

  return results;
}

export default function EligibilityChecker({ initialJobId }: { initialJobId?: string }) {
  const t = useTranslations("eligibilityChecker");
  const locale = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [qualification, setQualification] = useState("Graduate");
  const [age, setAge] = useState(25);
  const [hasBEd, setHasBEd] = useState(false);
  const [isDomicile, setIsDomicile] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const initialJobIdRef = useRef(initialJobId);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: { jobs: Job[] }) => {
        setJobs(data.jobs);
        if (!initialJobIdRef.current && data.jobs.length > 0) {
          setJobId(data.jobs[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const needsBEd = job?.eligibilityRules.some((r) => r.label === "B.Ed Requirement") ?? false;
  const needsDomicile = job?.eligibilityRules.some((r) => r.label === "Domicile") ?? false;

  const results = submitted && job ? evaluate(job, { qualification, age, hasBEd, isDomicile }, t, locale) : [];
  const blockingResults = results.filter((r) => r.status !== "info");
  const overallEligible = blockingResults.every((r) => r.status === "pass");

  if (loading) {
    return (
      <Card padding="p-10" className="text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card padding="p-10" className="text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("noJobsTitle")}</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {t("noJobsBody")}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="h-fit"
      >
        <Card className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("jobLabel")}
            </label>
            <select
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                setSubmitted(false);
              }}
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          <SelectField
            label={t("qualificationLabel")}
            value={qualification}
            onChange={(e) => {
              setQualification(e.target.value);
              setSubmitted(false);
            }}
            options={qualifications.filter((q) => q !== "All")}
          />

          <TextField
            label={t("ageLabel")}
            type="number"
            min={15}
            max={65}
            value={age}
            onChange={(e) => {
              setAge(Number(e.target.value));
              setSubmitted(false);
            }}
          />

          {needsBEd && (
            <CheckboxField
              label={t("hasBEdLabel")}
              checked={hasBEd}
              onChange={(e) => {
                setHasBEd(e.target.checked);
                setSubmitted(false);
              }}
            />
          )}

          {needsDomicile && (
            <CheckboxField
              label={t("domicileLabel")}
              checked={isDomicile}
              onChange={(e) => {
                setIsDomicile(e.target.checked);
                setSubmitted(false);
              }}
            />
          )}

          <Button type="submit" className="w-full">
            {t("checkButton")}
          </Button>
        </Card>
      </form>

      <div>
        {!submitted ? (
          <Card
            padding="p-10"
            className="flex h-full flex-col items-center justify-center border-dashed text-center"
          >
            <ShieldQuestion size={28} className="text-[var(--color-text-muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
              {t("fillFormTitle")}
            </p>
            <p className="mt-1 max-w-xs text-sm text-[var(--color-text-secondary)]">
              {t("fillFormBody")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card
              className={cn(
                overallEligible
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success-tint)]"
                  : "border-[var(--color-danger)]/30 bg-[var(--color-danger-tint)]"
              )}
            >
              <p
                className={cn(
                  "text-sm font-bold",
                  overallEligible ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                )}
              >
                {overallEligible ? t("eligibleTitle") : t("notEligibleTitle")}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t("forJob", { title: job.title })}
              </p>
            </Card>

            <Card padding="p-0" className="divide-y divide-[var(--color-border)]">
              {results.map((r) => (
                <div key={r.label} className="flex items-start gap-3 p-4">
                  {r.status === "pass" && (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  )}
                  {r.status === "fail" && (
                    <XCircle size={20} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                  )}
                  {r.status === "info" && (
                    <Info size={20} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{r.label}</p>
                    <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{r.reason}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
