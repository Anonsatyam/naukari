"use client";

import { useTranslations } from "next-intl";
import { MousePointer2, Type, Eraser, ImagePlus, ZoomIn, ZoomOut, Download, PanelLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { ToolMode, TEXT_SIZES, TEXT_COLORS, COVER_COLORS, MIN_ZOOM, MAX_ZOOM } from "./types";

export default function EditPdfToolbar({
  tool,
  setTool,
  fontSize,
  setFontSize,
  color,
  setColor,
  coverColor,
  setCoverColor,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSave,
  processing,
  onToggleSidebar,
}: {
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  color: string;
  setColor: (v: string) => void;
  coverColor: string;
  setCoverColor: (v: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSave: () => void;
  processing: boolean;
  onToggleSidebar: () => void;
}) {
  const t = useTranslations("editPdfPage");

  const toolButtonClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
        : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
    }`;

  return (
    <div className="sticky top-0 z-20 space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon={<PanelLeft size={15} />} label={t("pagesLabel")} size="sm" onClick={onToggleSidebar} className="lg:hidden" />

        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setTool("select")} className={toolButtonClass(tool === "select")}>
            <MousePointer2 size={13} /> {t("toolSelect")}
          </button>
          <button type="button" onClick={() => setTool("text")} className={toolButtonClass(tool === "text")}>
            <Type size={13} /> {t("toolText")}
          </button>
          <button type="button" onClick={() => setTool("cover")} className={toolButtonClass(tool === "cover")}>
            <Eraser size={13} /> {t("toolCover")}
          </button>
          <button type="button" onClick={() => setTool("image")} className={toolButtonClass(tool === "image")}>
            <ImagePlus size={13} /> {t("toolImage")}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <IconButton icon={<ZoomOut size={14} />} label={t("zoomOut")} size="sm" onClick={onZoomOut} disabled={zoom <= MIN_ZOOM} />
          <button
            type="button"
            onClick={onZoomReset}
            title={t("zoomReset")}
            className="w-12 text-center text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
          >
            {zoom}%
          </button>
          <IconButton icon={<ZoomIn size={14} />} label={t("zoomIn")} size="sm" onClick={onZoomIn} disabled={zoom >= MAX_ZOOM} />
          <Button onClick={onSave} disabled={processing} size="sm" className="ml-1">
            <Download size={14} /> {t("saveButton")}
          </Button>
        </div>
      </div>

      {tool === "text" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("textSizeLabel")}
            </span>
            {TEXT_SIZES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFontSize(opt.value)}
                className={toolButtonClass(fontSize === opt.value)}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("textColorLabel")}
            </span>
            {TEXT_COLORS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-label={t(opt.labelKey)}
                onClick={() => setColor(opt.value)}
                className={`h-6 w-6 rounded-full border-2 ${
                  color === opt.value ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                }`}
                style={{ backgroundColor: opt.value }}
              />
            ))}
          </div>
        </div>
      )}

      {tool === "cover" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {t("coverColorLabel")}
          </span>
          {COVER_COLORS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-label={t(opt.labelKey)}
              onClick={() => setCoverColor(opt.value)}
              className={`h-6 w-6 rounded-full border-2 ${
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
            className="h-6 w-6 cursor-pointer rounded-full border-2 border-[var(--color-border)] p-0"
          />
        </div>
      )}

      <p className="text-xs text-[var(--color-text-secondary)]">
        {tool === "select" && t("hintSelect")}
        {tool === "text" && t("hintText")}
        {tool === "cover" && t("hintCover")}
        {tool === "image" && t("hintImage")}
      </p>
    </div>
  );
}
