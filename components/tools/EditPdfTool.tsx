"use client";

import { useRef, useState } from "react";
import { PDFDocument, StandardFonts, PDFFont, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import FileDropzone from "./FileDropzone";
import EditPdfToolbar from "./edit-pdf/EditPdfToolbar";
import PageThumbnailRail from "./edit-pdf/PageThumbnailRail";
import PdfPageCanvas from "./edit-pdf/PdfPageCanvas";
import {
  PageEntry,
  TextAnnotation,
  RectAnnotation,
  ImageAnnotation,
  ExistingTextRun,
  ToolMode,
  TEXT_COLORS,
  COVER_COLORS,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  BASE_PAGE_WIDTH,
} from "./edit-pdf/types";
import { loadPdfDocument, renderPageToCanvas, getPageSize, pdfBytesToBlob } from "@/lib/pdfRender";
import { detectTextRuns } from "@/lib/pdfTextLayer";
import { canvasToBlob, downloadBlob, loadImageFromFile, clamp } from "@/lib/image-tools";

const RENDER_SCALE = 2.0;

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `id-${Date.now()}-${nextId}`;
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return { r, g, b };
}

// Whitespace is drawn as manual cursor advancement (see drawTextPreservingSpaces),
// never as an actual glyph from the extracted font, so it's excluded here — an
// extracted/subsetted font's .notdef glyph is often a visible box, not blank,
// so a missing space glyph must never actually reach page.drawText().
function hasFullGlyphCoverage(fkFont: ReturnType<typeof fontkit.create>, text: string): boolean {
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    const codePoint = ch.codePointAt(0);
    if (codePoint === undefined) return false;
    const glyph = fkFont.glyphForCodePoint(codePoint);
    if (!glyph || glyph.id === 0) return false;
  }
  return true;
}

const SPACE_WIDTH_RATIO = 0.27;

/**
 * Draws text word-by-word, advancing the cursor by an estimated space width
 * between words instead of ever asking the font to render a space glyph —
 * needed because an extracted/subsetted font's space glyph is unreliable
 * (see hasFullGlyphCoverage), while a standard font's own space is fine.
 */
function drawTextPreservingSpaces(
  page: import("pdf-lib").PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }
) {
  const segments = text.split(/(\s+)/);
  let cursorX = opts.x;
  for (const segment of segments) {
    if (!segment) continue;
    if (/^\s+$/.test(segment)) {
      cursorX += opts.size * SPACE_WIDTH_RATIO * segment.length;
      continue;
    }
    page.drawText(segment, { x: cursorX, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    cursorX += opts.font.widthOfTextAtSize(segment, opts.size);
  }
}

/**
 * Tries to reuse the PDF's own embedded font for an edited run, extracted
 * via pdf.js internals (see DetectedTextRun.fontBytes) — but only if every
 * character actually needed is present in it (it's usually subsetted to
 * just the original document's characters). Falls back to null on any
 * failure or missing coverage, so the caller can use a standard font instead.
 */
async function tryEmbedExtractedFont(
  outDoc: PDFDocument,
  fontBytes: Uint8Array,
  text: string,
  fkFontCache: Map<Uint8Array, ReturnType<typeof fontkit.create> | null>,
  embeddedFontCache: Map<Uint8Array, PDFFont>
): Promise<PDFFont | null> {
  let fkFont = fkFontCache.get(fontBytes);
  if (fkFont === undefined) {
    try {
      fkFont = fontkit.create(fontBytes);
    } catch {
      fkFont = null;
    }
    fkFontCache.set(fontBytes, fkFont);
  }
  if (!fkFont || !hasFullGlyphCoverage(fkFont, text)) return null;

  const cachedEmbed = embeddedFontCache.get(fontBytes);
  if (cachedEmbed) return cachedEmbed;
  try {
    const embedded = await outDoc.embedFont(fontBytes, { subset: true });
    embeddedFontCache.set(fontBytes, embedded);
    return embedded;
  } catch {
    return null;
  }
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

export default function EditPdfTool() {
  const t = useTranslations("editPdfPage");
  const tShared = useTranslations("toolsShared");
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [tool, setTool] = useState<ToolMode>("select");
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState(TEXT_COLORS[0].value);
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0].value);
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageClickRef = useRef<{ pageIndex: number; xPct: number; yPct: number } | null>(null);

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
        const pdfPage = await pdfDoc.getPage(i);
        const canvas = await renderPageToCanvas(pdfDoc, i, RENDER_SCALE);
        const blob = await canvasToBlob(canvas, "image/png");
        const { width, height } = await getPageSize(pdfDoc, i);
        const detected = await detectTextRuns(pdfPage, canvas, RENDER_SCALE);
        const existingRuns: ExistingTextRun[] = detected.map((run) => ({
          ...run,
          originalText: run.text,
          currentText: run.text,
          originalColor: run.color,
        }));
        entries.push({
          originalIndex: i - 1,
          previewUrl: URL.createObjectURL(blob),
          rotation: 0,
          width,
          height,
          texts: [],
          rects: [],
          images: [],
          existingRuns,
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

  const movePage = (index: number, dir: -1 | 1) => {
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

  const jumpToPage = (index: number) => {
    pageContainerRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false);
  };

  const addTextAt = (pageIndex: number, xPct: number, yPct: number) => {
    const annotation: TextAnnotation = { id: newId(), xPct, yPct, text: "", fontSize, color };
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, texts: [...p.texts, annotation] } : p)));
  };

  const addRectAt = (pageIndex: number, xPct: number, yPct: number) => {
    const width = 0.3;
    const height = 0.05;
    const rectAnn: RectAnnotation = {
      id: newId(),
      xPct: clamp(xPct - width / 2, 0, 1 - width),
      yPct: clamp(yPct - height / 2, 0, 1 - height),
      widthPct: width,
      heightPct: height,
      color: coverColor,
    };
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, rects: [...p.rects, rectAnn] } : p)));
  };

  const handlePageClick = (pageIndex: number, xPct: number, yPct: number) => {
    if (tool === "text") addTextAt(pageIndex, xPct, yPct);
    else if (tool === "cover") addRectAt(pageIndex, xPct, yPct);
    else if (tool === "image") {
      pendingImageClickRef.current = { pageIndex, xPct, yPct };
      imageInputRef.current?.click();
    }
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingImageClickRef.current;
    e.target.value = "";
    if (!file || !pending) return;
    try {
      const { bytes, width, height } = await imageFileToPngBytes(file);
      const boxWidth = 0.25;
      const boxHeight = boxWidth * (height / width);
      const imgAnn: ImageAnnotation = {
        id: newId(),
        xPct: clamp(pending.xPct - boxWidth / 2, 0, 1 - boxWidth),
        yPct: clamp(pending.yPct - boxHeight / 2, 0, 1 - boxHeight),
        widthPct: boxWidth,
        heightPct: boxHeight,
        bytes,
        previewUrl: URL.createObjectURL(new Blob([bytes], { type: "image/png" })),
      };
      setPages((prev) =>
        prev.map((p, i) => (i === pending.pageIndex ? { ...p, images: [...p.images, imgAnn] } : p))
      );
    } catch {
      toast.error(t("errorMessage"));
    }
  };

  const updateText = (pageIndex: number, id: string, patch: Partial<TextAnnotation>) =>
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, texts: p.texts.map((a) => (a.id === id ? { ...a, ...patch } : a)) } : p))
    );
  const removeText = (pageIndex: number, id: string) =>
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, texts: p.texts.filter((a) => a.id !== id) } : p)));

  const updateRect = (pageIndex: number, id: string, patch: Partial<RectAnnotation>) =>
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, rects: p.rects.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : p))
    );
  const removeRect = (pageIndex: number, id: string) =>
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, rects: p.rects.filter((r) => r.id !== id) } : p)));

  const updateImage = (pageIndex: number, id: string, patch: Partial<ImageAnnotation>) =>
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, images: p.images.map((im) => (im.id === id ? { ...im, ...patch } : im)) } : p))
    );
  const removeImage = (pageIndex: number, id: string) =>
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, images: p.images.filter((im) => im.id !== id) } : p)));

  const updateRun = (pageIndex: number, id: string, patch: Partial<ExistingTextRun>) =>
    setPages((prev) =>
      prev.map((p, i) =>
        i === pageIndex ? { ...p, existingRuns: p.existingRuns.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : p
      )
    );

  const handleSave = async () => {
    if (!sourceBytes || pages.length === 0) return;
    setProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(sourceBytes);
      const outDoc = await PDFDocument.create();
      outDoc.registerFontkit(fontkit);
      const fkFontCache = new Map<Uint8Array, ReturnType<typeof fontkit.create> | null>();
      const embeddedFontCache = new Map<Uint8Array, PDFFont>();
      const fonts: Record<string, PDFFont> = {
        plain: await outDoc.embedFont(StandardFonts.Helvetica),
        bold: await outDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await outDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await outDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      };
      const serifFonts: Record<string, PDFFont> = {
        plain: await outDoc.embedFont(StandardFonts.TimesRoman),
        bold: await outDoc.embedFont(StandardFonts.TimesRomanBold),
        italic: await outDoc.embedFont(StandardFonts.TimesRomanItalic),
        boldItalic: await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
      };
      const monospaceFonts: Record<string, PDFFont> = {
        plain: await outDoc.embedFont(StandardFonts.Courier),
        bold: await outDoc.embedFont(StandardFonts.CourierBold),
        italic: await outDoc.embedFont(StandardFonts.CourierOblique),
        boldItalic: await outDoc.embedFont(StandardFonts.CourierBoldOblique),
      };
      const fontsByFamily: Record<string, Record<string, PDFFont>> = {
        sans: fonts,
        serif: serifFonts,
        monospace: monospaceFonts,
      };
      const copied = await outDoc.copyPages(
        srcDoc,
        pages.map((p) => p.originalIndex)
      );

      for (let i = 0; i < copied.length; i++) {
        const page = copied[i];
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

        for (const run of entry.existingRuns) {
          if (run.currentText === run.originalText) continue;
          const boxX = run.xPct * entry.width;
          const boxY = (1 - run.yPct - run.heightPct) * entry.height;
          const boxWidth = run.widthPct * entry.width;
          const boxHeight = run.heightPct * entry.height;
          const { r: cr, g: cg, b: cb } = hexToRgb01(run.coverColor);
          page.drawRectangle({ x: boxX, y: boxY, width: boxWidth, height: boxHeight, color: rgb(cr, cg, cb) });

          const text = run.currentText.trim();
          if (text) {
            let font: PDFFont | null = null;
            let usingExtractedFont = false;
            // Bold/Italic toggles can't be faked on the original single-style
            // extracted font, so only try reusing it when neither is set.
            if (run.fontBytes && !run.bold && !run.italic) {
              font = await tryEmbedExtractedFont(outDoc, run.fontBytes, text, fkFontCache, embeddedFontCache);
              usingExtractedFont = font !== null;
            }
            if (!font) {
              const fontKey = run.bold && run.italic ? "boldItalic" : run.bold ? "bold" : run.italic ? "italic" : "plain";
              font = fontsByFamily[run.fontFamily][fontKey];
            }
            const fontSizePt = boxHeight * 0.85;
            const { r: tr, g: tg, b: tb } = hexToRgb01(run.color);
            const drawOpts = {
              x: boxX,
              y: boxY + (boxHeight - fontSizePt) * 0.3,
              size: fontSizePt,
              font,
              color: rgb(tr, tg, tb),
            };
            if (usingExtractedFont) drawTextPreservingSpaces(page, text, drawOpts);
            else page.drawText(text, drawOpts);
          }
        }

        for (const imgAnn of entry.images) {
          const embedded = await outDoc.embedPng(imgAnn.bytes);
          page.drawImage(embedded, {
            x: imgAnn.xPct * entry.width,
            y: (1 - imgAnn.yPct - imgAnn.heightPct) * entry.height,
            width: imgAnn.widthPct * entry.width,
            height: imgAnn.heightPct * entry.height,
          });
        }

        for (const ann of entry.texts) {
          const text = ann.text.trim();
          if (!text) continue;
          const { r, g, b } = hexToRgb01(ann.color);
          page.drawText(text, {
            x: ann.xPct * entry.width,
            y: (1 - ann.yPct) * entry.height - ann.fontSize,
            size: ann.fontSize,
            font: fonts.plain,
            color: rgb(r, g, b),
          });
        }
      }

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

      {processing && pages.length === 0 && (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">{t("processing")}</p>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />

      {pages.length > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row">
          <PageThumbnailRail
            pages={pages}
            open={sidebarOpen}
            onMove={movePage}
            onRotate={rotatePage}
            onDelete={removePage}
            onJumpTo={jumpToPage}
            className="lg:w-40 lg:shrink-0"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <EditPdfToolbar
              tool={tool}
              setTool={setTool}
              fontSize={fontSize}
              setFontSize={setFontSize}
              color={color}
              setColor={setColor}
              coverColor={coverColor}
              setCoverColor={setCoverColor}
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              onZoomOut={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              onZoomReset={() => setZoom(100)}
              onSave={handleSave}
              processing={processing}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
            />

            <div className="space-y-4 overflow-x-auto">
              {pages.map((page, i) => {
                const containerWidthPx = (BASE_PAGE_WIDTH * zoom) / 100;
                const containerHeightPx = containerWidthPx * (page.height / page.width);
                return (
                  <div
                    key={`${page.originalIndex}-${i}`}
                    style={{ width: `${containerWidthPx}px`, maxWidth: "100%" }}
                    className="mx-auto"
                  >
                    <PdfPageCanvas
                      page={page}
                      pageIndex={i}
                      tool={tool}
                      containerHeightPx={containerHeightPx}
                      registerContainer={(el) => {
                        pageContainerRefs.current[i] = el;
                      }}
                      onPageClick={handlePageClick}
                      onUpdateText={updateText}
                      onRemoveText={removeText}
                      onUpdateRect={updateRect}
                      onRemoveRect={removeRect}
                      onUpdateImage={updateImage}
                      onRemoveImage={removeImage}
                      onUpdateRun={updateRun}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
