"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, X, RotateCw, ArrowLeft, ArrowRight } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { loadPdfDocument, renderPageToCanvas, pdfBytesToBlob } from "@/lib/pdfRender";
import { canvasToBlob, downloadBlob } from "@/lib/image-tools";

interface PageEntry {
  originalIndex: number;
  previewUrl: string;
  rotation: number;
}

export default function EditPdfTool() {
  const t = useTranslations("editPdfPage");
  const tShared = useTranslations("toolsShared");
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = async ([file]: File[]) => {
    if (!file) return;
    setProcessing(true);
    setPages([]);
    try {
      const bytes = await file.arrayBuffer();
      setSourceBytes(bytes);
      const pdfDoc = await loadPdfDocument(bytes.slice(0));
      const entries: PageEntry[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = await renderPageToCanvas(pdfDoc, i, 0.6);
        const blob = await canvasToBlob(canvas, "image/png");
        entries.push({ originalIndex: i - 1, previewUrl: URL.createObjectURL(blob), rotation: 0 });
      }
      setPages(entries);
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  const removePage = (index: number) => setPages((prev) => prev.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    setPages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const rotatePage = (index: number) => {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));
  };

  const handleSave = async () => {
    if (!sourceBytes || pages.length === 0) return;
    setProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(sourceBytes);
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(
        srcDoc,
        pages.map((p) => p.originalIndex)
      );
      copied.forEach((page, i) => {
        if (pages[i].rotation) page.setRotation(degrees(page.getRotation().angle + pages[i].rotation));
        outDoc.addPage(page);
      });
      const outBytes = await outDoc.save();
      downloadBlob(pdfBytesToBlob(outBytes), "edited.pdf");
      toast.success(t("successMessage"));
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {pages.length === 0 && (
        <FileDropzone
          label={t("uploadLabel")}
          onFiles={handleFiles}
          accept={{ "application/pdf": [] }}
          hint={tShared("dropHintPdf")}
        />
      )}

      {processing && <p className="text-center text-sm text-[var(--color-text-secondary)]">{t("processing")}</p>}

      {pages.length > 0 && (
        <>
          <p className="text-xs text-[var(--color-text-secondary)]">{t("hint")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page, i) => (
              <div key={`${page.originalIndex}-${i}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <img
                  src={page.previewUrl}
                  alt={`Page ${i + 1}`}
                  className="w-full rounded"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />
                <p className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">{i + 1}</p>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <IconButton icon={<ArrowLeft size={13} />} label="Move left" size="sm" onClick={() => move(i, -1)} disabled={i === 0} />
                  <IconButton icon={<ArrowRight size={13} />} label="Move right" size="sm" onClick={() => move(i, 1)} disabled={i === pages.length - 1} />
                  <IconButton icon={<RotateCw size={13} />} label="Rotate" size="sm" onClick={() => rotatePage(i)} />
                  <IconButton icon={<X size={13} />} label="Delete page" tone="danger" size="sm" onClick={() => removePage(i)} />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={processing} className="w-full">
            <Download size={14} /> {t("saveButton")}
          </Button>
        </>
      )}
    </div>
  );
}
