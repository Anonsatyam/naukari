"use client";

import { useState } from "react";
import { PDFDocument, PDFDict, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { Button } from "@/components/Button";
import { pdfBytesToBlob } from "@/lib/pdfRender";
import { downloadBlob, formatBytes } from "@/lib/image-tools";

const COMPRESS_QUALITY = 0.12;
const COMPRESS_MAX_DIM = 800;

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Standard PNG-style scanline unfiltering (Sub/Up/Average/Paeth) — used when a
// FlateDecode image XObject has Predictor >= 10 in its DecodeParms. Verified
// against both pdf-lib's own (unfiltered) encoding and a manually
// Paeth-filtered stream before relying on it here.
function unfilterPngPredictor(data: Uint8Array, width: number, height: number, colors: number): Uint8Array {
  const bytesPerPixel = colors;
  const rowBytes = width * colors;
  const out = new Uint8Array(rowBytes * height);
  let prevRow = new Uint8Array(rowBytes);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filterType = data[pos];
    pos += 1;
    const row = data.subarray(pos, pos + rowBytes);
    pos += rowBytes;
    const outRow = out.subarray(y * rowBytes, (y + 1) * rowBytes);
    for (let i = 0; i < rowBytes; i++) {
      const a = i >= bytesPerPixel ? outRow[i - bytesPerPixel] : 0;
      const b = prevRow[i];
      const c = i >= bytesPerPixel ? prevRow[i - bytesPerPixel] : 0;
      let value = row[i];
      if (filterType === 1) value = (value + a) & 0xff;
      else if (filterType === 2) value = (value + b) & 0xff;
      else if (filterType === 3) value = (value + ((a + b) >> 1)) & 0xff;
      else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = (value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      outRow[i] = value;
    }
    prevRow = outRow;
  }
  return out;
}

async function canvasFromRawColorData(
  raw: Uint8Array,
  width: number,
  height: number,
  colors: 1 | 3
): Promise<HTMLCanvasElement> {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += colors) {
    const j = i * 4;
    if (colors === 3) {
      rgba[j] = raw[p];
      rgba[j + 1] = raw[p + 1];
      rgba[j + 2] = raw[p + 2];
    } else {
      rgba[j] = rgba[j + 1] = rgba[j + 2] = raw[p];
    }
    rgba[j + 3] = 255;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

function scaledCanvas(source: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
  if (scale >= 1) return source;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function numberOr(dict: PDFDict, key: string, fallback: number): number {
  try {
    return dict.lookup(PDFName.of(key), PDFNumber).asNumber();
  } catch {
    return fallback;
  }
}

/**
 * Finds every image actually embedded in the PDF and recompresses it in
 * place, leaving text/vector content completely untouched. Handles JPEG
 * (DCTDecode) directly, and plain raster FlateDecode images (DeviceRGB/Gray,
 * 8-bit, no transparency) by inflating + optionally PNG-unfiltering them
 * first. Every other case (CMYK, indexed palettes, CCITT fax, JPX,
 * transparency) is left untouched rather than risk corrupting a format this
 * isn't confident about. Each image is only replaced if the recompressed
 * version is actually smaller.
 */
async function recompressEmbeddedImages(pdfDoc: PDFDocument, quality: number, maxDim: number): Promise<number> {
  const objects = pdfDoc.context.enumerateIndirectObjects();
  let recompressedCount = 0;

  for (const [ref, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.get(PDFName.of("Subtype"));
    if (!subtype || subtype.toString() !== "/Image") continue;
    const filter = dict.get(PDFName.of("Filter"))?.toString();
    if (filter !== "/DCTDecode" && filter !== "/FlateDecode") continue;
    if (dict.has(PDFName.of("SMask")) || dict.has(PDFName.of("Mask"))) continue; // preserve transparency, never guess it

    try {
      const rawBytes = obj.getContents();
      let bitmap: HTMLCanvasElement | ImageBitmap;

      if (filter === "/DCTDecode") {
        bitmap = await createImageBitmap(new Blob([new Uint8Array(rawBytes)], { type: "image/jpeg" }));
      } else {
        const colorSpace = dict.get(PDFName.of("ColorSpace"))?.toString();
        const bpc = numberOr(dict, "BitsPerComponent", 8);
        const colors: 1 | 3 | 0 = colorSpace === "/DeviceRGB" ? 3 : colorSpace === "/DeviceGray" ? 1 : 0;
        if (colors === 0 || bpc !== 8) continue;

        const width = numberOr(dict, "Width", 0);
        const height = numberOr(dict, "Height", 0);
        if (width <= 0 || height <= 0) continue;

        const decodeParms = dict.lookupMaybe(PDFName.of("DecodeParms"), PDFDict);
        const predictor = decodeParms ? numberOr(decodeParms, "Predictor", 1) : 1;

        const inflated = await inflateZlib(rawBytes);
        const raw = predictor >= 10 ? unfilterPngPredictor(inflated, width, height, colors) : inflated;
        bitmap = await canvasFromRawColorData(raw, width, height, colors);
      }

      const width = "width" in bitmap ? bitmap.width : 0;
      const height = "height" in bitmap ? bitmap.height : 0;
      if (width <= 0 || height <= 0) continue;

      const sourceCanvas =
        bitmap instanceof HTMLCanvasElement
          ? bitmap
          : (() => {
              const c = document.createElement("canvas");
              c.width = width;
              c.height = height;
              c.getContext("2d")?.drawImage(bitmap as ImageBitmap, 0, 0);
              return c;
            })();
      const canvas = scaledCanvas(sourceCanvas, maxDim);

      const newBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
      );
      const newBytes = new Uint8Array(await newBlob.arrayBuffer());
      if (newBytes.length >= rawBytes.length) continue;

      const newDict = dict.clone(pdfDoc.context);
      newDict.set(PDFName.of("Width"), pdfDoc.context.obj(canvas.width));
      newDict.set(PDFName.of("Height"), pdfDoc.context.obj(canvas.height));
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
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const recompressedCount = await recompressEmbeddedImages(pdfDoc, COMPRESS_QUALITY, COMPRESS_MAX_DIM);

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
