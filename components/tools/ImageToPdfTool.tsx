"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { loadImageFromFile, canvasToBlob, downloadBlob, formatBytes } from "@/lib/image-tools";
import { pdfBytesToBlob } from "@/lib/pdfRender";

interface QueuedImage {
  file: File;
  previewUrl: string;
}

async function imageFileToPngBytes(file: File): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const loaded = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = loaded.width;
  canvas.height = loaded.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image.");
  ctx.drawImage(loaded.image, 0, 0);
  const blob = await canvasToBlob(canvas, "image/png");
  return { bytes: await blob.arrayBuffer(), width: loaded.width, height: loaded.height };
}

export default function ImageToPdfTool() {
  const t = useTranslations("imageToPdfPage");
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const handleFiles = (files: File[]) => {
    setResultSize(null);
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setResultSize(null);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const { file } of images) {
        const { bytes, width, height } = await imageFileToPngBytes(file);
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      }
      const outBytes = await pdfDoc.save();
      const blob = pdfBytesToBlob(outBytes);
      downloadBlob(blob, "images.pdf");
      setResultSize(blob.size);
      toast.success(t("successMessage"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorMessage"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone
        label={t("uploadLabel")}
        onFiles={handleFiles}
        accept={{ "image/*": [] }}
        multiple
      />

      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((img, i) => (
            <div
              key={img.previewUrl}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
            >
              <GripVertical size={16} className="shrink-0 text-[var(--color-text-muted)]" />
              <img src={img.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">{img.file.name}</p>
              <IconButton
                icon={<ArrowUp size={13} />}
                label="Move up"
                size="sm"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              />
              <IconButton
                icon={<ArrowDown size={13} />}
                label="Move down"
                size="sm"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
              />
              <IconButton icon={<X size={14} />} label="Remove" tone="danger" size="sm" onClick={() => removeImage(i)} />
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleGenerate} disabled={images.length === 0 || processing} className="w-full">
        <Download size={14} /> {processing ? t("processing") : t("generateButton")}
      </Button>

      {resultSize !== null && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          {t("resultSize", { size: formatBytes(resultSize) })}
        </p>
      )}
    </div>
  );
}
