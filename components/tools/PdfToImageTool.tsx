"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { loadPdfDocument, renderPageToCanvas } from "@/lib/pdfRender";
import { canvasToBlob, downloadBlob } from "@/lib/image-tools";

interface RenderedPage {
  pageNumber: number;
  previewUrl: string;
  blob: Blob;
}

const SCALE_OPTIONS = [
  { value: 3, labelKey: "scaleStandard" as const },
  { value: 4, labelKey: "scaleHigh" as const },
  { value: 5, labelKey: "scaleVeryHigh" as const },
];

export default function PdfToImageTool() {
  const t = useTranslations("pdfToImagePage");
  const tShared = useTranslations("toolsShared");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [scaleIndex, setScaleIndex] = useState(1);

  const handleFiles = async ([file]: File[]) => {
    if (!file) return;
    setProcessing(true);
    setPages([]);
    setFileName(file.name);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(bytes);
      const rendered: RenderedPage[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = await renderPageToCanvas(pdfDoc, i, SCALE_OPTIONS[scaleIndex].value);
        const blob = await canvasToBlob(canvas, "image/png");
        rendered.push({ pageNumber: i, previewUrl: URL.createObjectURL(blob), blob });
      }
      setPages(rendered);
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  const downloadPage = (page: RenderedPage) => {
    downloadBlob(page.blob, `${(fileName ?? "page").replace(/\.pdf$/i, "")}-page-${page.pageNumber}.png`);
  };

  return (
    <div className="space-y-4">
      {pages.length === 0 && (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {t("qualityLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {SCALE_OPTIONS.map((opt, i) => (
              <button
                key={opt.labelKey}
                type="button"
                onClick={() => setScaleIndex(i)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  scaleIndex === i
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </>
      )}

      <FileDropzone
        label={t("uploadLabel")}
        onFiles={handleFiles}
        accept={{ "application/pdf": [] }}
        hint={tShared("dropHintPdf")}
      />

      {processing && <p className="text-center text-sm text-[var(--color-text-secondary)]">{t("processing")}</p>}

      {pages.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.pageNumber} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <img src={page.previewUrl} alt={`Page ${page.pageNumber}`} className="w-full rounded" />
              <Button variant="secondary" size="sm" onClick={() => downloadPage(page)} className="mt-2 w-full">
                <Download size={14} /> {t("downloadPage", { page: page.pageNumber })}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
