"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, ShieldQuestion } from "lucide-react";
import { qualifications, qualificationRank, classifyQualification } from "@/lib/taxonomy";
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
  input: { qualification: string; age: number; hasBEd: boolean; isDomicile: boolean }
): CheckResult[] {
  const results: CheckResult[] = [];

  // Education — job.qualification is a taxonomy label the vast
  // majority of the time (extraction now classifies it from the
  // notification's own Eligibility text), but a bot draft can still
  // land on something else (an admin-edited free-text value, or the
  // "As per notification" fallback when nothing recognizable was
  // found anywhere). classifyQualification catches the free-text case;
  // when even that comes back empty, the requirement is genuinely
  // unknown — reported as "info" rather than silently auto-passing
  // every candidate against a requirement the checker never actually
  // identified.
  const requiredLabel = qualificationRank[job.qualification] ? job.qualification : classifyQualification(job.qualification);
  const requiredRank = requiredLabel ? qualificationRank[requiredLabel] : undefined;
  const userRank = qualificationRank[input.qualification] ?? 1;
  if (requiredRank === undefined) {
    results.push({
      label: "Education",
      status: "info",
      reason: `This job's qualification requirement ("${job.qualification}") couldn't be matched to a specific level — check the official notification directly.`,
    });
  } else {
    results.push({
      label: "Education",
      status: userRank >= requiredRank ? "pass" : "fail",
      reason:
        userRank >= requiredRank
          ? `Your qualification meets the requirement (${requiredLabel}).`
          : `This job requires at least ${requiredLabel}.`,
    });
  }

  // Age
  const ageOk = input.age >= job.minAge && input.age <= job.maxAge;
  results.push({
    label: "Age",
    status: ageOk ? "pass" : "fail",
    reason: ageOk
      ? `Your age (${input.age}) is within the ${job.minAge}–${job.maxAge} year range.`
      : input.age > job.maxAge
      ? `Maximum age is ${job.maxAge}. ${job.ageRelaxation ?? "Check if a relaxation applies to your category."}`
      : `Minimum age is ${job.minAge}.`,
  });

  // Rule-specific checks
  job.eligibilityRules.forEach((rule) => {
    if (rule.label === "B.Ed Requirement") {
      results.push({
        label: "B.Ed",
        status: input.hasBEd ? "pass" : "fail",
        reason: input.hasBEd
          ? "You meet the B.Ed requirement for this post."
          : "B.Ed Required — this post's Paper II needs a B.Ed degree.",
      });
    } else if (rule.label === "Domicile") {
      results.push({
        label: "Domicile",
        status: input.isDomicile ? "pass" : "fail",
        reason: input.isDomicile
          ? "You meet the Bihar residency requirement."
          : "This post requires Bihar domicile as per category rules.",
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [qualification, setQualification] = useState("Graduate");
  const [age, setAge] = useState(25);
  const [hasBEd, setHasBEd] = useState(false);
  const [isDomicile, setIsDomicile] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: { jobs: Job[] }) => {
        setJobs(data.jobs);
        if (!initialJobId && data.jobs.length > 0) {
          setJobId(data.jobs[0].id);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const needsBEd = job?.eligibilityRules.some((r) => r.label === "B.Ed Requirement") ?? false;
  const needsDomicile = job?.eligibilityRules.some((r) => r.label === "Domicile") ?? false;

  const results = submitted && job ? evaluate(job, { qualification, age, hasBEd, isDomicile }) : [];
  const blockingResults = results.filter((r) => r.status !== "info");
  const overallEligible = blockingResults.every((r) => r.status === "pass");

  if (loading) {
    return (
      <Card padding="p-10" className="text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading jobs…</p>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card padding="p-10" className="text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">No jobs available yet</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Check back once jobs have been published.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      {/* Form */}
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
              Job
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
            label="Your Highest Qualification"
            value={qualification}
            onChange={(e) => {
              setQualification(e.target.value);
              setSubmitted(false);
            }}
            options={qualifications.filter((q) => q !== "All")}
          />

          <TextField
            label="Your Age"
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
              label="I hold a B.Ed degree"
              checked={hasBEd}
              onChange={(e) => {
                setHasBEd(e.target.checked);
                setSubmitted(false);
              }}
            />
          )}

          {needsDomicile && (
            <CheckboxField
              label="I am a resident (domicile) of Bihar"
              checked={isDomicile}
              onChange={(e) => {
                setIsDomicile(e.target.checked);
                setSubmitted(false);
              }}
            />
          )}

          <Button type="submit" className="w-full">
            Check Eligibility
          </Button>
        </Card>
      </form>

      {/* Result */}
      <div>
        {!submitted ? (
          <Card
            padding="p-10"
            className="flex h-full flex-col items-center justify-center border-dashed text-center"
          >
            <ShieldQuestion size={28} className="text-[var(--color-text-muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Fill the form to see your result
            </p>
            <p className="mt-1 max-w-xs text-sm text-[var(--color-text-secondary)]">
              We&apos;ll check each requirement individually and explain the reason —
              not just eligible or not.
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
                {overallEligible ? "You appear to be eligible" : "You may not be eligible"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                for {job.title}. Always confirm with the official notification before applying.
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
