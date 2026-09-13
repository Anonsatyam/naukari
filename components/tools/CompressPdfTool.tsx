"use client";

import { useState } from "react";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { pdfBytesToBlob } from "@/lib/pdfRender";
import { downloadBlob, formatBytes } from "@/lib/image-tools";

const QUALITY_OPTIONS = [
  { value: 0.8, maxDim: 2200, labelKey: "qualityHigh" as const },
  { value: 0.45, maxDim: 1400, labelKey: "qualityMedium" as const },
  { value: 0.12, maxDim: 800, labelKey: "qualityLow" as const },
];

async function recompressEmbeddedJpegs(
  pdfDoc: PDFDocument,
  quality: number,
  maxDim: number
): Promise<number> {
  const objects = pdfDoc.context.enumerateIndirectObjects();
  let recompressedCount = 0;

  for (const [ref, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.get(PDFName.of("Subtype"));
    if (!subtype || subtype.toString() !== "/Image") continue;
    const filter = dict.get(PDFName.of("Filter"));
    // Only JPEGs are handled — the safest, highest-value case (scans/photos).
    // Everything else (PNG/Flate, CCITT fax, JPX, indexed palettes, etc.) is
    // left completely untouched rather than risk corrupting an unfamiliar format.
    if (filter?.toString() !== "/DCTDecode") continue;

    try {
      const rawBytes = obj.getContents();
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(rawBytes)], { type: "image/jpeg" }));
      const { width, height } = bitmap;
      if (width <= 0 || height <= 0) continue;

      const scale = Math.min(1, maxDim / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const newBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
      );
      const newBytes = new Uint8Array(await newBlob.arrayBuffer());

      if (newBytes.length >= rawBytes.length) continue;

      const newDict = dict.clone(pdfDoc.context);
      newDict.set(PDFName.of("Width"), pdfDoc.context.obj(targetWidth));
      newDict.set(PDFName.of("Height"), pdfDoc.context.obj(targetHeight));
      newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      newDict.set(PDFName.of("BitsPerComponent"), pdfDoc.context.obj(8));
      newDict.delete(PDFName.of("DecodeParms"));
      newDict.delete(PDFName.of("Decode"));
      pdfDoc.context.assign(ref, PDFRawStream.of(newDict, newBytes));
      recompressedCount++;
    } catch {
      // Skip this image on any failure — never risk corrupting the PDF.
      continue;
    }
  }

  return recompressedCount;
}

export default function CompressPdfTool() {
  const t = useTranslations("compressPdfPage");
  const tShared = useTranslations("toolsShared");
  const [file, setFile] = useState<File | null>(null);
  const [qualityIndex, setQualityIndex] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ originalSize: number; newSize: number; kept: boolean } | null>(null);

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
      const opt = QUALITY_OPTIONS[qualityIndex];
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const recompressedCount = await recompressEmbeddedJpegs(pdfDoc, opt.value, opt.maxDim);

      if (recompressedCount === 0) {
        downloadBlob(file, file.name);
        setResult({ originalSize: file.size, newSize: file.size, kept: true });
        toast.success(t("alreadyOptimizedMessage"));
        return;
      }

      const outBytes = await pdfDoc.save();
      const outBlob = pdfBytesToBlob(outBytes);

      if (outBlob.size >= file.size) {
        downloadBlob(file, file.name);
        setResult({ originalSize: file.size, newSize: file.size, kept: true });
        toast.success(t("alreadyOptimizedMessage"));
      } else {
        downloadBlob(outBlob, `compressed-${file.name}`);
        setResult({ originalSize: file.size, newSize: outBlob.size, kept: false });
        toast.success(t("successMessage"));
      }
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
            {QUALITY_OPTIONS.map((opt, i) => (
              <button
                key={opt.labelKey}
                type="button"
                onClick={() => setQualityIndex(i)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  qualityIndex === i
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

      {result && !result.kept && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          {t("resultSummary", { before: formatBytes(result.originalSize), after: formatBytes(result.newSize) })}
        </p>
      )}
      {result && result.kept && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">{t("alreadyOptimizedNote")}</p>
      )}
    </div>
  );
}
