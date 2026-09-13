import type { PDFPageProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

export type DetectedFontFamily = "serif" | "sans" | "monospace";

export interface DetectedTextRun {
  id: string;
  text: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  color: string;
  coverColor: string;
  bold: boolean;
  italic: boolean;
  fontFamily: DetectedFontFamily;
  /**
   * The PDF's own embedded font program, extracted via pdf.js internals
   * (undocumented — `commonObjs` entries aren't a public API, so this is
   * best-effort and may be null for many PDFs). Only usable at save time
   * if every character actually needed is present in this — usually
   * subsetted — font; callers must verify coverage before using it and
   * fall back to a standard font otherwise, never assume it's complete.
   */
  fontBytes: Uint8Array | null;
}

interface PdfjsFontObject {
  bold?: boolean;
  italic?: boolean;
  isSerifFont?: boolean;
  isMonospace?: boolean;
  fallbackName?: string;
  data?: Uint8Array;
}

interface FontInfo {
  bold: boolean;
  italic: boolean;
  fontFamily: DetectedFontFamily;
  fontBytes: Uint8Array | null;
}

function getFontInfo(page: PDFPageProxy, fontName: string, cache: Map<string, FontInfo>): FontInfo {
  const cached = cache.get(fontName);
  if (cached) return cached;

  let info: FontInfo = { bold: false, italic: false, fontFamily: "sans", fontBytes: null };
  try {
    if (page.commonObjs.has(fontName)) {
      const fontObj = page.commonObjs.get(fontName) as PdfjsFontObject;
      const fallback = fontObj.fallbackName ?? "";
      let fontFamily: DetectedFontFamily = "sans";
      if (fontObj.isMonospace || /mono/i.test(fallback)) fontFamily = "monospace";
      else if (fontObj.isSerifFont || (/serif/i.test(fallback) && !/sans/i.test(fallback))) fontFamily = "serif";
      const fontBytes = fontObj.data instanceof Uint8Array && fontObj.data.length > 0 ? fontObj.data : null;
      info = { bold: Boolean(fontObj.bold), italic: Boolean(fontObj.italic), fontFamily, fontBytes };
    }
  } catch {
    // undocumented internals — any failure here just means no extracted font/style info
  }
  cache.set(fontName, info);
  return info;
}

let nextRunId = 0;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function sampleInkColor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string {
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.max(1, Math.min(Math.ceil(w), ctx.canvas.width - ix));
  const ih = Math.max(1, Math.min(Math.ceil(h), ctx.canvas.height - iy));
  if (iw <= 0 || ih <= 0 || ix >= ctx.canvas.width || iy >= ctx.canvas.height) return "#111111";
  const data = ctx.getImageData(ix, iy, iw, ih).data;
  let best = { r: 0, g: 0, b: 0, lum: 255 };
  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance(data[i], data[i + 1], data[i + 2]);
    if (lum < best.lum) best = { r: data[i], g: data[i + 1], b: data[i + 2], lum };
  }
  return toHex(best.r, best.g, best.b);
}

/**
 * Detects every text run on a rendered page, using pdf.js's own text-content
 * layout math (the same primitives its selectable text layer is built from),
 * and guesses each run's ink color by sampling the already-rendered canvas.
 */
export async function detectTextRuns(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<DetectedTextRun[]> {
  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();
  const ctx = canvas.getContext("2d");
  const runs: DetectedTextRun[] = [];
  const fontCache = new Map<string, FontInfo>();

  for (const item of textContent.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    if (fontHeight <= 0) continue;
    const left = tx[4];
    const top = tx[5] - fontHeight;
    const width = item.width * scale;
    const height = fontHeight;

    const centerX = left + width / 2;
    const aboveY = Math.max(0, top - 3);
    let coverColor = "#ffffff";
    if (ctx && centerX >= 0 && centerX < ctx.canvas.width && aboveY >= 0 && aboveY < ctx.canvas.height) {
      const bg = ctx.getImageData(Math.round(centerX), Math.round(aboveY), 1, 1).data;
      coverColor = toHex(bg[0], bg[1], bg[2]);
    }

    const { bold, italic, fontFamily, fontBytes } = getFontInfo(page, item.fontName, fontCache);

    nextRunId += 1;
    runs.push({
      id: `run-${Date.now()}-${nextRunId}`,
      text: item.str,
      xPct: left / viewport.width,
      yPct: top / viewport.height,
      widthPct: width / viewport.width,
      heightPct: height / viewport.height,
      color: ctx ? sampleInkColor(ctx, left, top, width, height) : "#111111",
      coverColor,
      bold,
      italic,
      fontFamily,
      fontBytes,
    });
  }
  return runs;
}
