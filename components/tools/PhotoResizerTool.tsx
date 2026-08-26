"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Download, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import ImageDropzone from "./ImageDropzone";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/FormField";
import {
  loadImageFromFile,
  compressToTargetSize,
  downloadBlob,
  formatBytes,
  clamp,
  LoadedImage,
} from "@/lib/image-tools";

interface Preset {
  label: string;
  width: number;
  height: number;
  minKB: number;
  maxKB: number;
}

const PRESETS: Preset[] = [
  { label: "Passport Photo (200×230, 20–50 KB)", width: 200, height: 230, minKB: 20, maxKB: 50 },
  { label: "Signature (140×60, 10–20 KB)", width: 140, height: 60, minKB: 10, maxKB: 20 },
  { label: "Small Photo (100×120, 20–50 KB)", width: 100, height: 120, minKB: 20, maxKB: 50 },
];

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PREVIEW_MAX_WIDTH = 440;
const HANDLE_SIZE = 16;

export default function PhotoResizerTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [presetIndex, setPresetIndex] = useState(0); // -1 = custom
  const [customWidth, setCustomWidth] = useState(200);
  const [customHeight, setCustomHeight] = useState(230);
  const [customMinKB, setCustomMinKB] = useState(20);
  const [customMaxKB, setCustomMaxKB] = useState(50);

  const target =
    presetIndex >= 0
      ? PRESETS[presetIndex]
      : { label: "Custom", width: customWidth, height: customHeight, minKB: customMinKB, maxKB: customMaxKB };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; box: CropBox } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; url: string; quality: number } | null>(null);

  const aspectRatio = target.width / target.height;

  const fitCropBox = (previewW: number, previewH: number, ratio: number): CropBox => {
    let w = previewW;
    let h = w / ratio;
    if (h > previewH) {
      h = previewH;
      w = h * ratio;
    }
    return { x: (previewW - w) / 2, y: (previewH - h) / 2, width: w, height: h };
  };

  const handleFile = async (file: File) => {
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, PREVIEW_MAX_WIDTH / img.width);
    const previewW = Math.round(img.width * scale);
    const previewH = Math.round(img.height * scale);
    setLoaded(img);
    setPreviewSize({ width: previewW, height: previewH });
    setCropBox(fitCropBox(previewW, previewH, aspectRatio));
    setResult(null);
  };

  // Re-fit the crop box (same center) whenever the target dimensions change
  const refitForRatio = (ratio: number) => {
    setPreviewSize((size) => {
      if (!size.width) return size;
      setCropBox((prev) => {
        if (!prev) return fitCropBox(size.width, size.height, ratio);
        const cx = prev.x + prev.width / 2;
        const cy = prev.y + prev.height / 2;
        let w = size.width;
        let h = w / ratio;
        if (h > size.height) {
          h = size.height;
          w = h * ratio;
        }
        const x = clamp(cx - w / 2, 0, size.width - w);
        const y = clamp(cy - h / 2, 0, size.height - h);
        return { x, y, width: w, height: h };
      });
      return size;
    });
    setResult(null);
  };

  const selectPreset = (index: number) => {
    setPresetIndex(index);
    refitForRatio(PRESETS[index].width / PRESETS[index].height);
  };

  const setCustomAndRefit = (updates: Partial<{ width: number; height: number }>) => {
    const w = updates.width ?? customWidth;
    const h = updates.height ?? customHeight;
    if (updates.width !== undefined) setCustomWidth(updates.width);
    if (updates.height !== undefined) setCustomHeight(updates.height);
    setPresetIndex(-1);
    refitForRatio(w / h);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || !cropBox) return;
    canvas.width = previewSize.width;
    canvas.height = previewSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loaded.image, 0, 0, previewSize.width, previewSize.height);

    // Dim everything, then re-reveal the crop region
    ctx.fillStyle = "rgba(24, 27, 37, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    ctx.clip();
    ctx.drawImage(loaded.image, 0, 0, previewSize.width, previewSize.height);
    ctx.restore();

    // Crop box border
    ctx.strokeStyle = "#3C44C2";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

    // Resize handle (bottom-right)
    ctx.fillStyle = "#3C44C2";
    ctx.fillRect(
      cropBox.x + cropBox.width - HANDLE_SIZE / 2,
      cropBox.y + cropBox.height - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
  }, [loaded, cropBox, previewSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cropBox) return;
    const pos = getPointerPos(e);
    const handleX = cropBox.x + cropBox.width;
    const handleY = cropBox.y + cropBox.height;
    const nearHandle =
      Math.abs(pos.x - handleX) < HANDLE_SIZE && Math.abs(pos.y - handleY) < HANDLE_SIZE;

    if (nearHandle) {
      dragRef.current = { mode: "resize", startX: pos.x, startY: pos.y, box: cropBox };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (
      pos.x >= cropBox.x &&
      pos.x <= cropBox.x + cropBox.width &&
      pos.y >= cropBox.y &&
      pos.y <= cropBox.y + cropBox.height
    ) {
      dragRef.current = { mode: "move", startX: pos.x, startY: pos.y, box: cropBox };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pos = getPointerPos(e);
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;

    if (drag.mode === "move") {
      const x = clamp(drag.box.x + dx, 0, previewSize.width - drag.box.width);
      const y = clamp(drag.box.y + dy, 0, previewSize.height - drag.box.height);
      setCropBox({ ...drag.box, x, y });
    } else {
      let newWidth = clamp(drag.box.width + dx, 40, previewSize.width - drag.box.x);
      let newHeight = newWidth / aspectRatio;
      if (drag.box.y + newHeight > previewSize.height) {
        newHeight = previewSize.height - drag.box.y;
        newWidth = newHeight * aspectRatio;
      }
      setCropBox({ ...drag.box, width: newWidth, height: newHeight });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const resetCrop = () => {
    if (!previewSize.width) return;
    let w = previewSize.width;
    let h = w / aspectRatio;
    if (h > previewSize.height) {
      h = previewSize.height;
      w = h * aspectRatio;
    }
    setCropBox({ x: (previewSize.width - w) / 2, y: (previewSize.height - h) / 2, width: w, height: h });
    setResult(null);
  };

  const handleApply = async () => {
    if (!loaded || !cropBox) return;
    setProcessing(true);
    setResult(null);

    const scale = loaded.width / previewSize.width;
    const sx = cropBox.x * scale;
    const sy = cropBox.y * scale;
    const sWidth = cropBox.width * scale;
    const sHeight = cropBox.height * scale;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = target.width;
    outCanvas.height = target.height;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }
    ctx.drawImage(loaded.image, sx, sy, sWidth, sHeight, 0, 0, target.width, target.height);

    const { blob, quality } = await compressToTargetSize(outCanvas, target.maxKB);
    setResult({ blob, url: URL.createObjectURL(blob), quality });
    setProcessing(false);
  };

  const resultKB = result ? result.blob.size / 1024 : 0;
  const withinRange = result ? resultKB >= target.minKB * 0.5 && resultKB <= target.maxKB : false;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        {!loaded ? (
          <ImageDropzone
            label="Upload a photo to crop and resize"
            onFile={handleFile}
          />
        ) : (
          <div>
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="mx-auto cursor-move touch-none rounded-lg border border-[var(--color-border)]"
            />
            <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
              Drag inside the box to move it, drag the corner handle to resize.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={resetCrop}>
                <RotateCcw size={14} /> Reset Crop
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLoaded(null);
                  setResult(null);
                }}
              >
                Change Photo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Output Size</p>
          <div className="space-y-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => selectPreset(i)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  presetIndex === i
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomAndRefit({})}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                presetIndex === -1
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
              }`}
            >
              Custom dimensions &amp; size
            </button>
          </div>

          {presetIndex === -1 && (
            <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Width (px)"
                  type="number"
                  min={20}
                  value={customWidth}
                  onChange={(e) => setCustomAndRefit({ width: Number(e.target.value) || 1 })}
                />
                <TextField
                  label="Height (px)"
                  type="number"
                  min={20}
                  value={customHeight}
                  onChange={(e) => setCustomAndRefit({ height: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Min Size (KB)"
                  type="number"
                  min={1}
                  value={customMinKB}
                  onChange={(e) => setCustomMinKB(Number(e.target.value) || 1)}
                />
                <TextField
                  label="Max Size (KB)"
                  type="number"
                  min={1}
                  value={customMaxKB}
                  onChange={(e) => setCustomMaxKB(Number(e.target.value) || 1)}
                />
              </div>
            </div>
          )}
        </Card>

        <Button onClick={handleApply} disabled={!loaded || processing} className="w-full">
          {processing ? "Processing…" : "Crop, Resize & Compress"}
        </Button>

        {result && (
          <Card
            className={
              withinRange
                ? "border-[var(--color-success)]/30 bg-[var(--color-success-tint)]"
                : "border-[var(--color-warning)]/30 bg-[var(--color-warning-tint)]"
            }
          >
            <div className="flex items-start gap-2">
              {withinRange ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
              )}
              <div>
                <p
                  className={`text-sm font-semibold ${
                    withinRange ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
                  }`}
                >
                  {formatBytes(result.blob.size)} · {target.width}×{target.height}px
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  Target: {target.minKB}–{target.maxKB} KB
                  {!withinRange && " — couldn't fit the target range at readable quality."}
                </p>
              </div>
            </div>
            <Button
              className="mt-3 w-full"
              onClick={() => downloadBlob(result.blob, `photo-${target.width}x${target.height}.jpg`)}
            >
              <Download size={14} /> Download
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
