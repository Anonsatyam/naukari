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

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_RECT: Rect = { left: 0.1, top: 0.1, width: 0.8, height: 0.8 };

export default function CropPdfTool() {
  const t = useTranslations("cropPdfPage");
  const tShared = useTranslations("toolsShared");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect>(DEFAULT_RECT);
  const [processing, setProcessing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startRect: Rect } | null>(null);

  const handleFiles = async ([f]: File[]) => {
    if (!f) return;
    setFile(f);
    setRect(DEFAULT_RECT);
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
    dragState.current = { startX: e.clientX, startY: e.clientY, startRect: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || !previewRef.current) return;
    const box = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragState.current.startX) / box.width;
    const dy = (e.clientY - dragState.current.startY) / box.height;
    const { startRect } = dragState.current;
    setRect({
      left: clamp(startRect.left + dx, 0, 1 - startRect.width),
      top: clamp(startRect.top + dy, 0, 1 - startRect.height),
      width: startRect.width,
      height: startRect.height,
    });
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startRect = rect;
    const startX = e.clientX;
    const startY = e.clientY;
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) return;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      setRect({
        left: startRect.left,
        top: startRect.top,
        width: clamp(startRect.width + dx, 0.1, 1 - startRect.left),
        height: clamp(startRect.height + dy, 0.1, 1 - startRect.top),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleCrop = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize();
        const cropX = rect.left * width;
        const cropY = (1 - rect.top - rect.height) * height;
        const cropWidth = rect.width * width;
        const cropHeight = rect.height * height;
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
                left: `${rect.left * 100}%`,
                top: `${rect.top * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
              }}
            >
              <div
                onPointerDown={onResizePointerDown}
                className="absolute bottom-0 right-0 h-4 w-4 -translate-x-1 -translate-y-1 cursor-se-resize rounded-full border-2 border-white bg-[var(--color-brand)]"
              />
            </div>
          </div>

          <Button onClick={handleCrop} disabled={processing} className="w-full">
            <Download size={14} /> {processing ? t("processing") : t("cropButton")}
          </Button>
        </>
      )}
    </div>
  );
}
