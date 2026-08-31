"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import ImageDropzone from "./ImageDropzone";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import { CheckboxField } from "@/components/FormField";
import { useDragPosition } from "@/lib/useDragPosition";
import { loadImageFromFile, canvasToBlob, downloadBlob, LoadedImage } from "@/lib/image-tools";

const PREVIEW_MAX_WIDTH = 480;
const WHITE_THRESHOLD = 235;

function makeWhiteTransparent(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > WHITE_THRESHOLD && data[i + 1] > WHITE_THRESHOLD && data[i + 2] > WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export default function SignatureMergeTool() {
  const t = useTranslations("signatureMergePage");
  const tShared = useTranslations("toolsShared");
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [signature, setSignature] = useState<LoadedImage | null>(null);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [sizePct, setSizePct] = useState(0.3);

  const { targetRef, position, setPosition, onPointerDown, onPointerMove, onPointerUp } =
    useDragPosition({ x: 0.75, y: 0.85 });

  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const handlePhotoFile = async (file: File) => {
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, PREVIEW_MAX_WIDTH / img.width);
    setPhoto(img);
    setPreviewSize({ width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
    setPosition({ x: 0.75, y: 0.85 });
  };

  const drawComposite = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number,
      photoImg: HTMLImageElement,
      sigSource: CanvasImageSource,
      sigNaturalWidth: number,
      sigNaturalHeight: number
    ) => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(photoImg, 0, 0, canvasWidth, canvasHeight);

      const sigWidth = canvasWidth * sizePct;
      const sigHeight = sigWidth * (sigNaturalHeight / sigNaturalWidth);
      const x = Math.min(Math.max(position.x * canvasWidth - sigWidth / 2, 0), canvasWidth - sigWidth);
      const y = Math.min(Math.max(position.y * canvasHeight - sigHeight / 2, 0), canvasHeight - sigHeight);

      ctx.drawImage(sigSource, x, y, sigWidth, sigHeight);
    },
    [sizePct, position]
  );

  useEffect(() => {
    const canvas = targetRef.current;
    if (!canvas || !photo || !previewSize.width) return;
    canvas.width = previewSize.width;
    canvas.height = previewSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!signature) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(photo.image, 0, 0, previewSize.width, previewSize.height);
      return;
    }

    const sigSource = removeWhite
      ? makeWhiteTransparent(signature.image, signature.width, signature.height)
      : signature.image;

    drawComposite(ctx, previewSize.width, previewSize.height, photo.image, sigSource, signature.width, signature.height);
  }, [photo, signature, previewSize, removeWhite, targetRef, drawComposite]);

  const handleDownload = async () => {
    if (!photo || !signature) return;
    const canvas = document.createElement("canvas");
    canvas.width = photo.width;
    canvas.height = photo.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sigSource = removeWhite
      ? makeWhiteTransparent(signature.image, signature.width, signature.height)
      : signature.image;

    drawComposite(ctx, photo.width, photo.height, photo.image, sigSource, signature.width, signature.height);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    downloadBlob(blob, "photo-with-signature.jpg");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        {!photo ? (
          <ImageDropzone
            label={t("uploadBaseLabel")}
            onFile={handlePhotoFile}
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
              {t("dragHint")}
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  setSignature(null);
                }}
              >
                {tShared("changePhoto")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4">
          {!signature ? (
            <ImageDropzone
              label={t("uploadSignatureLabel")}
              onFile={async (file) => setSignature(await loadImageFromFile(file))}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t("signatureUploaded")}</p>
              <button
                type="button"
                onClick={() => setSignature(null)}
                className="text-xs font-semibold text-[var(--color-primary)]"
              >
                {t("replace")}
              </button>
            </div>
          )}

          <CheckboxField
            label={t("removeWhiteLabel")}
            checked={removeWhite}
            onChange={(e) => setRemoveWhite(e.target.checked)}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("signatureSizeLabel")}
            </label>
            <input
              type="range"
              min={0.1}
              max={0.6}
              step={0.01}
              value={sizePct}
              onChange={(e) => setSizePct(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
        </Card>

        <Button onClick={handleDownload} disabled={!photo || !signature} className="w-full">
          <Download size={14} /> {t("downloadPhoto")}
        </Button>
      </div>
    </div>
  );
}
