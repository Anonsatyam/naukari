"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Job, ResultItem, AdmitCardItem } from "@/lib/types";
import { PREVIEW_STORAGE_KEY } from "@/lib/adminPreview";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { JobDetailBody } from "@/components/detail/JobDetailBody";
import { ResultDetailBody } from "@/components/detail/ResultDetailBody";
import { AdmitCardDetailBody } from "@/components/detail/AdmitCardDetailBody";

type PreviewPayload =
  | { type: "job"; entity: Job }
  | { type: "result"; entity: ResultItem }
  | { type: "admit_card"; entity: AdmitCardItem };

export default function AdminPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null | "error">(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
        if (!raw) {
          setPayload("error");
          return;
        }
        setPayload(JSON.parse(raw) as PreviewPayload);
      } catch {
        setPayload("error");
      }
    });
  }, []);

  if (payload === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle size={28} className="mx-auto text-[var(--color-warning)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">No preview data found</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Open Preview again from the post editor to see it here.
          </p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return <p className="p-8 text-sm text-[var(--color-text-secondary)]">Loading preview…</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-[var(--color-warning)] px-4 py-2.5 text-sm font-semibold text-black">
        <span>👁 PREVIEW MODE — this post has not been published yet. Nothing here is live.</span>
        <button
          type="button"
          onClick={() => window.close()}
          className="flex shrink-0 items-center gap-1 rounded-md bg-black/10 px-2.5 py-1 text-xs hover:bg-black/20"
        >
          <X size={13} /> Close
        </button>
      </div>
      <Header />
      <main className="flex-1">
        {payload.type === "job" && <JobDetailBody job={payload.entity} relatedJobs={[]} />}
        {payload.type === "result" && <ResultDetailBody result={payload.entity} />}
        {payload.type === "admit_card" && <AdmitCardDetailBody card={payload.entity} />}
      </main>
      <Footer />
    </div>
  );
}
