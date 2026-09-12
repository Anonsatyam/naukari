"use client";

import { useCallback, useState } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Download, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import ImageDropzone from "./ImageDropzone";
import Card from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/FormField";
import { loadImageFromFile, compressToTargetSize, downloadBlob, formatBytes, LoadedImage } from "@/lib/image-tools";

interface Preset {
  labelKey: "presetPassport" | "presetSignature" | "presetSmallPhoto";
  width: number;
  height: number;
  minKB: number;
  maxKB: number;
}

const PRESETS: Preset[] = [
  { labelKey: "presetPassport", width: 200, height: 230, minKB: 20, maxKB: 50 },
  { labelKey: "presetSignature", width: 140, height: 60, minKB: 10, maxKB: 20 },
  { labelKey: "presetSmallPhoto", width: 100, height: 120, minKB: 20, maxKB: 50 },
];

const INITIAL_CROP: Point = { x: 0, y: 0 };

export default function PhotoResizerTool() {
  const t = useTranslations("photoResizerPage");
  const tShared = useTranslations("toolsShared");
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [presetIndex, setPresetIndex] = useState(0);
  const [customWidth, setCustomWidth] = useState(200);
  const [customHeight, setCustomHeight] = useState(230);
  const [customMinKB, setCustomMinKB] = useState(20);
  const [customMaxKB, setCustomMaxKB] = useState(50);

  const target =
    presetIndex >= 0
      ? PRESETS[presetIndex]
      : { width: customWidth, height: customHeight, minKB: customMinKB, maxKB: customMaxKB };
  const aspectRatio = target.width / target.height;

  const [crop, setCrop] = useState<Point>(INITIAL_CROP);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; url: string; quality: number } | null>(null);

  const handleFile = async (file: File) => {
    const img = await loadImageFromFile(file);
    setLoaded(img);
    setCrop(INITIAL_CROP);
    setZoom(1);
    setCroppedAreaPixels(null);
    setResult(null);
  };

  const resetCropPosition = () => {
    setCrop(INITIAL_CROP);
    setZoom(1);
    setResult(null);
  };

  const selectPreset = (index: number) => {
    setPresetIndex(index);
    resetCropPosition();
  };

  const setCustomAndRefit = (updates: Partial<{ width: number; height: number }>) => {
    if (updates.width !== undefined) setCustomWidth(updates.width);
    if (updates.height !== undefined) setCustomHeight(updates.height);
    setPresetIndex(-1);
    resetCropPosition();
  };

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!loaded || !croppedAreaPixels) return;
    setProcessing(true);
    setResult(null);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = target.width;
    outCanvas.height = target.height;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }
    ctx.drawImage(
      loaded.image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      target.width,
      target.height
    );

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
            label={t("uploadLabel")}
            onFile={handleFile}
          />
        ) : (
          <div>
            <div className="relative mx-auto h-[360px] w-full max-w-[440px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-text-primary)]">
              <Cropper
                image={loaded.image.src}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
              {t("dragHint")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={resetCropPosition}>
                <RotateCcw size={14} /> {t("resetCrop")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLoaded(null);
                  setResult(null);
                }}
              >
                {tShared("changePhoto")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{t("outputSize")}</p>
          <div className="space-y-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.labelKey}
                type="button"
                onClick={() => selectPreset(i)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  presetIndex === i
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                }`}
              >
                {t(p.labelKey)}
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
              {t("customDimensions")}
            </button>
          </div>

          {presetIndex === -1 && (
            <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label={t("widthLabel")}
                  type="number"
                  min={20}
                  value={customWidth}
                  onChange={(e) => setCustomAndRefit({ width: Number(e.target.value) || 1 })}
                />
                <TextField
                  label={t("heightLabel")}
                  type="number"
                  min={20}
                  value={customHeight}
                  onChange={(e) => setCustomAndRefit({ height: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label={t("minSizeLabel")}
                  type="number"
                  min={1}
                  value={customMinKB}
                  onChange={(e) => setCustomMinKB(Number(e.target.value) || 1)}
                />
                <TextField
                  label={t("maxSizeLabel")}
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
          {processing ? t("processing") : t("cropButton")}
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
                  {t("targetLabel", { min: target.minKB, max: target.maxKB })}
                  {!withinRange && ` ${t("couldntFit")}`}
                </p>
              </div>
            </div>
            <Button
              className="mt-3 w-full"
              onClick={() => downloadBlob(result.blob, `photo-${target.width}x${target.height}.jpg`)}
            >
              <Download size={14} /> {t("download")}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
