"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import ImageDropzone from "./ImageDropzone";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/FormField";
import { useDragPosition } from "@/lib/useDragPosition";
import { loadImageFromFile, canvasToBlob, downloadBlob, LoadedImage } from "@/lib/image-tools";

const PREVIEW_MAX_WIDTH = 480;

function drawLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  name: string,
  date: string,
  fontScale: number,
  posX: number,
  posY: number
) {
  const text = [name, date].filter(Boolean).join("   |   ");
  if (!text) return;

  const fontSize = Math.max(10, Math.round(width * fontScale));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const paddingX = fontSize * 0.6;
  const paddingY = fontSize * 0.5;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  let boxX = posX * width - boxWidth / 2;
  let boxY = posY * height - boxHeight / 2;
  boxX = Math.min(Math.max(boxX, 0), width - boxWidth);
  boxY = Math.min(Math.max(boxY, 0), height - boxHeight);

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
}

export default function NameDatePhotoTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fontScale, setFontScale] = useState(0.045);

  const { targetRef, position, setPosition, onPointerDown, onPointerMove, onPointerUp } =
    useDragPosition({ x: 0.5, y: 0.88 });

  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const handleFile = async (file: File) => {
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, PREVIEW_MAX_WIDTH / img.width);
    setLoaded(img);
    setPreviewSize({ width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
    setPosition({ x: 0.5, y: 0.88 });
  };

  useEffect(() => {
    const canvas = targetRef.current;
    if (!canvas || !loaded || !previewSize.width) return;
    canvas.width = previewSize.width;
    canvas.height = previewSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loaded.image, 0, 0, previewSize.width, previewSize.height);
    drawLabel(ctx, previewSize.width, previewSize.height, name, date, fontScale, position.x, position.y);
  }, [loaded, previewSize, name, date, fontScale, position, targetRef]);

  const handleDownload = async () => {
    if (!loaded) return;
    const canvas = document.createElement("canvas");
    canvas.width = loaded.width;
    canvas.height = loaded.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(loaded.image, 0, 0, loaded.width, loaded.height);
    drawLabel(ctx, loaded.width, loaded.height, name, date, fontScale, position.x, position.y);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    downloadBlob(blob, "photo-with-name-date.jpg");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        {!loaded ? (
          <ImageDropzone
            label="Upload a photo to add your name and date"
            onFile={handleFile}
          />
        ) : (
          <div>
            <canvas
              ref={targetRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="mx-auto cursor-grab touch-none rounded-lg border border-[var(--color-border)] active:cursor-grabbing"
            />
            <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
              Drag on the photo to reposition the label.
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setLoaded(null)}>
                Change Photo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4">
          <TextField
            label="Name"
            placeholder="e.g. Rahul Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Text Size
            </label>
            <input
              type="range"
              min={0.02}
              max={0.08}
              step={0.005}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
        </Card>

        <Button onClick={handleDownload} disabled={!loaded} className="w-full">
          <Download size={14} /> Download Photo
        </Button>
      </div>
    </div>
  );
}
