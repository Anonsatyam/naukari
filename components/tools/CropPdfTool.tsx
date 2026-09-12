"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { loadPdfDocument, renderPageToCanvas, pdfBytesToBlob } from "@/lib/pdfRender";
import { clamp, downloadBlob } from "@/lib/image-tools";

interface Margins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const DEFAULT_MARGINS: Margins = { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 };
const MIN_SIZE = 0.05;

type Corner = "nw" | "ne" | "se" | "sw";

export default function CropPdfTool() {
  const t = useTranslations("cropPdfPage");
  const tShared = useTranslations("toolsShared");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [margins, setMargins] = useState<Margins>(DEFAULT_MARGINS);
  const [processing, setProcessing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startMargins: Margins } | null>(null);

  const handleFiles = async ([f]: File[]) => {
    if (!f) return;
    setFile(f);
    setMargins(DEFAULT_MARGINS);
    setProcessing(true);
    try {
      const bytes = await f.arrayBuffer();
      const pdfDoc = await loadPdfDocument(bytes);
      const canvas = await renderPageToCanvas(pdfDoc, 1, 1.2);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/png")
      );
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startMargins: margins };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || !previewRef.current) return;
    const box = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragState.current.startX) / box.width;
    const dy = (e.clientY - dragState.current.startY) / box.height;
    const { startMargins } = dragState.current;
    const clampedDx = clamp(dx, -startMargins.left, startMargins.right);
    const clampedDy = clamp(dy, -startMargins.top, startMargins.bottom);
    setMargins({
      left: startMargins.left + clampedDx,
      right: startMargins.right - clampedDx,
      top: startMargins.top + clampedDy,
      bottom: startMargins.bottom - clampedDy,
    });
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  const onHandlePointerDown = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startMargins = margins;
    const startX = e.clientX;
    const startY = e.clientY;
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) return;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      const next = { ...startMargins };
      if (corner === "nw" || corner === "sw") {
        next.left = clamp(startMargins.left + dx, 0, 1 - startMargins.right - MIN_SIZE);
      } else {
        next.right = clamp(startMargins.right - dx, 0, 1 - startMargins.left - MIN_SIZE);
      }
      if (corner === "nw" || corner === "ne") {
        next.top = clamp(startMargins.top + dy, 0, 1 - startMargins.bottom - MIN_SIZE);
      } else {
        next.bottom = clamp(startMargins.bottom - dy, 0, 1 - startMargins.top - MIN_SIZE);
      }
      setMargins(next);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const setMarginPercent = (side: keyof Margins, percent: number) => {
    const value = clamp(percent / 100, 0, 1);
    setMargins((prev) => {
      if (side === "left") return { ...prev, left: clamp(value, 0, 1 - prev.right - MIN_SIZE) };
      if (side === "right") return { ...prev, right: clamp(value, 0, 1 - prev.left - MIN_SIZE) };
      if (side === "top") return { ...prev, top: clamp(value, 0, 1 - prev.bottom - MIN_SIZE) };
      return { ...prev, bottom: clamp(value, 0, 1 - prev.top - MIN_SIZE) };
    });
  };

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize();
        const cropX = margins.left * width;
        const cropY = margins.bottom * height;
        const cropWidth = (1 - margins.left - margins.right) * width;
        const cropHeight = (1 - margins.top - margins.bottom) * height;
        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
      }
      const outBytes = await pdfDoc.save();
      downloadBlob(pdfBytesToBlob(outBytes), `cropped-${file.name}`);
      toast.success(t("successMessage"));
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  const boxWidthPct = (1 - margins.left - margins.right) * 100;
  const boxHeightPct = (1 - margins.top - margins.bottom) * 100;

  const marginFields: { key: keyof Margins; label: string }[] = [
    { key: "left", label: t("sideLeft") },
    { key: "top", label: t("sideTop") },
    { key: "right", label: t("sideRight") },
    { key: "bottom", label: t("sideBottom") },
  ];

  return (
    <div className="space-y-4">
      {!previewUrl && (
        <FileDropzone
          label={t("uploadLabel")}
          onFiles={handleFiles}
          accept={{ "application/pdf": [] }}
          hint={tShared("dropHintPdf")}
        />
      )}

      {processing && !previewUrl && (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">{t("processing")}</p>
      )}

      {previewUrl && (
        <>
          <p className="text-xs text-[var(--color-text-secondary)]">{t("hint")}</p>
          <div
            ref={previewRef}
            className="relative mx-auto max-w-md select-none overflow-hidden rounded-lg border border-[var(--color-border)]"
          >
            <img src={previewUrl} alt="" className="w-full" draggable={false} />
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="absolute cursor-move border-2 border-[var(--color-brand)] bg-[var(--color-brand)]/10"
              style={{
                left: `${margins.left * 100}%`,
                top: `${margins.top * 100}%`,
                width: `${boxWidthPct}%`,
                height: `${boxHeightPct}%`,
              }}
            >
              {(["nw", "ne", "se", "sw"] as Corner[]).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={onHandlePointerDown(corner)}
                  className={`absolute h-4 w-4 rounded-full border-2 border-white bg-[var(--color-brand)] ${
                    corner === "nw"
                      ? "left-0 top-0 -translate-x-1 -translate-y-1 cursor-nw-resize"
                      : corner === "ne"
                        ? "right-0 top-0 translate-x-1 -translate-y-1 cursor-ne-resize"
                        : corner === "se"
                          ? "bottom-0 right-0 translate-x-1 translate-y-1 cursor-se-resize"
                          : "bottom-0 left-0 -translate-x-1 translate-y-1 cursor-sw-resize"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {marginFields.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                  {f.label}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(margins[f.key] * 100)}
                  onChange={(e) => setMarginPercent(f.key, Number(e.target.value))}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>
            ))}
          </div>

          <Button onClick={handleCrop} disabled={processing} className="w-full">
            <Download size={14} /> {processing ? t("processing") : t("cropButton")}
          </Button>
        </>
      )}
    </div>
  );
}
