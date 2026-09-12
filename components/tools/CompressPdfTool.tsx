"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { loadPdfDocument, renderPageToCanvas, pdfBytesToBlob } from "@/lib/pdfRender";
import { canvasToBlob, downloadBlob, formatBytes } from "@/lib/image-tools";

const QUALITY_OPTIONS = [
  { value: 0.4, labelKey: "qualityHigh" as const },
  { value: 0.25, labelKey: "qualityMedium" as const },
  { value: 0.12, labelKey: "qualityLow" as const },
];

export default function CompressPdfTool() {
  const t = useTranslations("compressPdfPage");
  const tShared = useTranslations("toolsShared");
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.25);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ originalSize: number; newSize: number } | null>(null);

  const handleFiles = ([f]: File[]) => {
    if (!f) return;
    setFile(f);
    setResult(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(bytes.slice(0));
      const outDoc = await PDFDocument.create();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = await renderPageToCanvas(pdfDoc, i, 1.5);
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);
        const imgBytes = await blob.arrayBuffer();
        const embedded = await outDoc.embedJpg(imgBytes);
        const page = outDoc.addPage([canvas.width, canvas.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: canvas.width, height: canvas.height });
      }

      const outBytes = await outDoc.save();
      const outBlob = pdfBytesToBlob(outBytes);
      downloadBlob(outBlob, `compressed-${file.name}`);
      setResult({ originalSize: file.size, newSize: outBlob.size });
      toast.success(t("successMessage"));
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!file && (
        <FileDropzone
          label={t("uploadLabel")}
          onFiles={handleFiles}
          accept={{ "application/pdf": [] }}
          hint={tShared("dropHintPdf")}
        />
      )}

      {file && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{file.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{formatBytes(file.size)}</p>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {t("qualityLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setQuality(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  quality === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("noteText")}</p>

          <Button onClick={handleCompress} disabled={processing} className="mt-4 w-full">
            <Download size={14} /> {processing ? t("processing") : t("compressButton")}
          </Button>
        </div>
      )}

      {result && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          {t("resultSummary", { before: formatBytes(result.originalSize), after: formatBytes(result.newSize) })}
        </p>
      )}
    </div>
  );
}
