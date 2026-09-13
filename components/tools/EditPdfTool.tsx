"use client";

import { useRef, useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, X, RotateCw, ArrowLeft, ArrowRight, Type, Eraser } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { loadPdfDocument, renderPageToCanvas, getPageSize, pdfBytesToBlob } from "@/lib/pdfRender";
import { canvasToBlob, clamp, downloadBlob } from "@/lib/image-tools";

interface TextAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  text: string;
  fontSize: number;
  color: string;
}

interface RectAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  color: string;
}

interface PageEntry {
  originalIndex: number;
  previewUrl: string;
  rotation: number;
  width: number;
  height: number;
  annotations: TextAnnotation[];
  rects: RectAnnotation[];
}

type ToolMode = "text" | "cover";

const TEXT_SIZES = [
  { value: 10, labelKey: "textSizeSmall" as const },
  { value: 14, labelKey: "textSizeMedium" as const },
  { value: 22, labelKey: "textSizeLarge" as const },
];

const TEXT_COLORS = [
  { value: "#111111", labelKey: "colorBlack" as const },
  { value: "#d13438", labelKey: "colorRed" as const },
  { value: "#2050c9", labelKey: "colorBlue" as const },
];

const COVER_COLORS = [
  { value: "#ffffff", labelKey: "colorWhite" as const },
  { value: "#000000", labelKey: "colorBlack" as const },
  { value: "#f2f2f2", labelKey: "colorGray" as const },
];

const DEFAULT_RECT_WIDTH = 0.3;
const DEFAULT_RECT_HEIGHT = 0.05;
const MIN_RECT_SIZE = 0.02;

let nextAnnotationId = 0;
function newAnnotationId(): string {
  nextAnnotationId += 1;
  return `ann-${Date.now()}-${nextAnnotationId}`;
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return { r, g, b };
}

export default function EditPdfTool() {
  const t = useTranslations("editPdfPage");
  const tShared = useTranslations("toolsShared");
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [tool, setTool] = useState<ToolMode>("text");
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState(TEXT_COLORS[0].value);
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0].value);
  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
        const { width, height } = await getPageSize(pdfDoc, i);
        entries.push({
          originalIndex: i - 1,
          previewUrl: URL.createObjectURL(blob),
          rotation: 0,
          width,
          height,
          annotations: [],
          rects: [],
        });
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

  const addAnnotationAt = (pageIndex: number, xPct: number, yPct: number) => {
    const annotation: TextAnnotation = { id: newAnnotationId(), xPct, yPct, text: "", fontSize, color };
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, annotations: [...p.annotations, annotation] } : p))
    );
  };

  const addRectAt = (pageIndex: number, xPct: number, yPct: number) => {
    const rect: RectAnnotation = {
      id: newAnnotationId(),
      xPct: clamp(xPct - DEFAULT_RECT_WIDTH / 2, 0, 1 - DEFAULT_RECT_WIDTH),
      yPct: clamp(yPct - DEFAULT_RECT_HEIGHT / 2, 0, 1 - DEFAULT_RECT_HEIGHT),
      widthPct: DEFAULT_RECT_WIDTH,
      heightPct: DEFAULT_RECT_HEIGHT,
      color: coverColor,
    };
    setPages((prev) => (prev.map((p, i) => (i === pageIndex ? { ...p, rects: [...p.rects, rect] } : p))));
  };

  const handlePageClick = (pageIndex: number, e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    if (tool === "text") addAnnotationAt(pageIndex, xPct, yPct);
    else addRectAt(pageIndex, xPct, yPct);
  };

  const updateAnnotationText = (pageIndex: number, id: string, text: string) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i === pageIndex ? { ...p, annotations: p.annotations.map((a) => (a.id === id ? { ...a, text } : a)) } : p
      )
    );
  };

  const removeAnnotation = (pageIndex: number, id: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, annotations: p.annotations.filter((a) => a.id !== id) } : p))
    );
  };

  const removeRect = (pageIndex: number, id: string) => {
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, rects: p.rects.filter((r) => r.id !== id) } : p)));
  };

  const updateRect = (pageIndex: number, id: string, patch: Partial<RectAnnotation>) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i === pageIndex ? { ...p, rects: p.rects.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : p
      )
    );
  };

  const onRectMovePointerDown = (pageIndex: number, rectAnn: RectAnnotation) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const box = containerRefs.current[pageIndex]?.getBoundingClientRect();
    if (!box) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = rectAnn;
    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      updateRect(pageIndex, rectAnn.id, {
        xPct: clamp(start.xPct + dx, 0, 1 - start.widthPct),
        yPct: clamp(start.yPct + dy, 0, 1 - start.heightPct),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const onRectResizePointerDown = (pageIndex: number, rectAnn: RectAnnotation) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const box = containerRefs.current[pageIndex]?.getBoundingClientRect();
    if (!box) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = rectAnn;
    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      updateRect(pageIndex, rectAnn.id, {
        widthPct: clamp(start.widthPct + dx, MIN_RECT_SIZE, 1 - start.xPct),
        heightPct: clamp(start.heightPct + dy, MIN_RECT_SIZE, 1 - start.yPct),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleSave = async () => {
    if (!sourceBytes || pages.length === 0) return;
    setProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(sourceBytes);
      const outDoc = await PDFDocument.create();
      const font = await outDoc.embedFont(StandardFonts.Helvetica);
      const copied = await outDoc.copyPages(
        srcDoc,
        pages.map((p) => p.originalIndex)
      );
      copied.forEach((page, i) => {
        const entry = pages[i];
        if (entry.rotation) page.setRotation(degrees(page.getRotation().angle + entry.rotation));
        outDoc.addPage(page);
        for (const rectAnn of entry.rects) {
          const { r, g, b } = hexToRgb01(rectAnn.color);
          page.drawRectangle({
            x: rectAnn.xPct * entry.width,
            y: (1 - rectAnn.yPct - rectAnn.heightPct) * entry.height,
            width: rectAnn.widthPct * entry.width,
            height: rectAnn.heightPct * entry.height,
            color: rgb(r, g, b),
          });
        }
        for (const ann of entry.annotations) {
          const text = ann.text.trim();
          if (!text) continue;
          const { r, g, b } = hexToRgb01(ann.color);
          page.drawText(text, {
            x: ann.xPct * entry.width,
            y: (1 - ann.yPct) * entry.height - ann.fontSize,
            size: ann.fontSize,
            font,
            color: rgb(r, g, b),
          });
        }
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
          <p className="text-xs text-[var(--color-text-secondary)]">{t("addTextHint")}</p>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("toolLabel")}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTool("text")}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    tool === "text"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <Type size={13} /> {t("toolText")}
                </button>
                <button
                  type="button"
                  onClick={() => setTool("cover")}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    tool === "cover"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <Eraser size={13} /> {t("toolCover")}
                </button>
              </div>
            </div>

            {tool === "text" && (
              <>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {t("textSizeLabel")}
                  </p>
                  <div className="flex gap-1.5">
                    {TEXT_SIZES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFontSize(opt.value)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          fontSize === opt.value
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {t("textColorLabel")}
                  </p>
                  <div className="flex gap-1.5">
                    {TEXT_COLORS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-label={t(opt.labelKey)}
                        onClick={() => setColor(opt.value)}
                        className={`h-7 w-7 rounded-full border-2 ${
                          color === opt.value ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                        }`}
                        style={{ backgroundColor: opt.value }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {tool === "cover" && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {t("coverColorLabel")}
                </p>
                <div className="flex items-center gap-1.5">
                  {COVER_COLORS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-label={t(opt.labelKey)}
                      onClick={() => setCoverColor(opt.value)}
                      className={`h-7 w-7 rounded-full border-2 ${
                        coverColor === opt.value ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                      }`}
                      style={{ backgroundColor: opt.value }}
                    />
                  ))}
                  <input
                    type="color"
                    value={coverColor}
                    onChange={(e) => setCoverColor(e.target.value)}
                    aria-label={t("colorCustom")}
                    className="h-7 w-7 cursor-pointer rounded-full border-2 border-[var(--color-border)] p-0"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page, i) => (
              <div key={`${page.originalIndex}-${i}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <div
                  ref={(el) => {
                    containerRefs.current[i] = el;
                  }}
                  className="relative overflow-hidden rounded"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                >
                  <img
                    src={page.previewUrl}
                    alt={`Page ${i + 1}`}
                    className={tool === "text" ? "w-full cursor-text rounded" : "w-full cursor-crosshair rounded"}
                    onClick={(e) => handlePageClick(i, e)}
                  />
                  {page.rects.map((rectAnn) => (
                    <div
                      key={rectAnn.id}
                      className="absolute border border-dashed border-[var(--color-primary)]"
                      style={{
                        left: `${rectAnn.xPct * 100}%`,
                        top: `${rectAnn.yPct * 100}%`,
                        width: `${rectAnn.widthPct * 100}%`,
                        height: `${rectAnn.heightPct * 100}%`,
                        backgroundColor: rectAnn.color,
                      }}
                      onPointerDown={onRectMovePointerDown(i, rectAnn)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRect(i, rectAnn.id);
                        }}
                        className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white"
                      >
                        <X size={9} />
                      </button>
                      <div
                        onPointerDown={onRectResizePointerDown(i, rectAnn)}
                        className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-full border border-white bg-[var(--color-primary)]"
                      />
                    </div>
                  ))}
                  {page.annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${ann.xPct * 100}%`, top: `${ann.yPct * 100}%` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-0.5">
                        <input
                          value={ann.text}
                          onChange={(e) => updateAnnotationText(i, ann.id, e.target.value)}
                          placeholder={t("addTextPlaceholder")}
                          autoFocus
                          style={{ color: ann.color, fontSize: `${Math.max(ann.fontSize * 0.5, 9)}px` }}
                          className="w-24 rounded border border-dashed border-[var(--color-primary)] bg-[var(--color-surface)]/90 px-1 py-0.5 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeAnnotation(i, ann.id)}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-white"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">{i + 1}</p>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <IconButton icon={<ArrowLeft size={13} />} label="Move left" size="sm" onClick={() => move(i, -1)} disabled={i === 0} />
                  <IconButton icon={<ArrowRight size={13} />} label="Move right" size="sm" onClick={() => move(i, 1)} disabled={i === pages.length - 1} />
                  <IconButton icon={<RotateCw size={13} />} label="Rotate" size="sm" onClick={() => rotatePage(i)} />
                  <IconButton icon={<Type size={13} />} label="Add text" size="sm" onClick={() => addAnnotationAt(i, 0.5, 0.5)} />
                  <IconButton icon={<Eraser size={13} />} label="Cover text" size="sm" onClick={() => addRectAt(i, 0.5, 0.5)} />
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
