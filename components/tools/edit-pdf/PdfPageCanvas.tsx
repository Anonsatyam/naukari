"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Bold, Italic, Check } from "lucide-react";
import { clamp } from "@/lib/image-tools";
import { PageEntry, TextAnnotation, RectAnnotation, ImageAnnotation, ExistingTextRun, ToolMode } from "./types";

type DragKind = "rect-move" | "rect-resize" | "image-move" | "image-resize" | "text-move" | "run-move";

const CSS_FONT_FAMILY: Record<ExistingTextRun["fontFamily"], string> = {
  serif: "Georgia, 'Times New Roman', Times, serif",
  monospace: "'Courier New', Courier, monospace",
  sans: "Arial, Helvetica, sans-serif",
};

interface Box {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

interface DragState {
  kind: DragKind;
  id: string;
  startX: number;
  startY: number;
  startBox: Box;
}

function beginDrag(
  e: React.PointerEvent,
  dragRef: React.RefObject<DragState | null>,
  kind: DragKind,
  id: string,
  startBox: Box
) {
  e.stopPropagation();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  dragRef.current = { kind, id, startX: e.clientX, startY: e.clientY, startBox };
}

const MIN_BOX_SIZE = 0.02;

export default function PdfPageCanvas({
  page,
  pageIndex,
  tool,
  containerHeightPx,
  registerContainer,
  onPageClick,
  onUpdateText,
  onRemoveText,
  onUpdateRect,
  onRemoveRect,
  onUpdateImage,
  onRemoveImage,
  onUpdateRun,
}: {
  page: PageEntry;
  pageIndex: number;
  tool: ToolMode;
  containerHeightPx: number;
  registerContainer: (el: HTMLDivElement | null) => void;
  onPageClick: (pageIndex: number, xPct: number, yPct: number) => void;
  onUpdateText: (pageIndex: number, id: string, patch: Partial<TextAnnotation>) => void;
  onRemoveText: (pageIndex: number, id: string) => void;
  onUpdateRect: (pageIndex: number, id: string, patch: Partial<RectAnnotation>) => void;
  onRemoveRect: (pageIndex: number, id: string) => void;
  onUpdateImage: (pageIndex: number, id: string, patch: Partial<ImageAnnotation>) => void;
  onRemoveImage: (pageIndex: number, id: string) => void;
  onUpdateRun: (pageIndex: number, id: string, patch: Partial<ExistingTextRun>) => void;
}) {
  const t = useTranslations("editPdfPage");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);

  useEffect(() => {
    if (editingRunId) activeInputRef.current?.focus();
  }, [editingRunId]);

  useEffect(() => {
    const handleMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      const box = containerRef.current?.getBoundingClientRect();
      if (!drag || !box) return;
      const dx = (ev.clientX - drag.startX) / box.width;
      const dy = (ev.clientY - drag.startY) / box.height;
      const { startBox } = drag;

      if (drag.kind === "rect-move") {
        onUpdateRect(pageIndex, drag.id, {
          xPct: clamp(startBox.xPct + dx, 0, 1 - startBox.widthPct),
          yPct: clamp(startBox.yPct + dy, 0, 1 - startBox.heightPct),
        });
      } else if (drag.kind === "rect-resize") {
        onUpdateRect(pageIndex, drag.id, {
          widthPct: clamp(startBox.widthPct + dx, MIN_BOX_SIZE, 1 - startBox.xPct),
          heightPct: clamp(startBox.heightPct + dy, MIN_BOX_SIZE, 1 - startBox.yPct),
        });
      } else if (drag.kind === "image-move") {
        onUpdateImage(pageIndex, drag.id, {
          xPct: clamp(startBox.xPct + dx, 0, 1 - startBox.widthPct),
          yPct: clamp(startBox.yPct + dy, 0, 1 - startBox.heightPct),
        });
      } else if (drag.kind === "image-resize") {
        onUpdateImage(pageIndex, drag.id, {
          widthPct: clamp(startBox.widthPct + dx, MIN_BOX_SIZE, 1 - startBox.xPct),
          heightPct: clamp(startBox.heightPct + dy, MIN_BOX_SIZE, 1 - startBox.yPct),
        });
      } else if (drag.kind === "text-move") {
        onUpdateText(pageIndex, drag.id, {
          xPct: clamp(startBox.xPct + dx, 0, 1),
          yPct: clamp(startBox.yPct + dy, 0, 1),
        });
      } else if (drag.kind === "run-move") {
        onUpdateRun(pageIndex, drag.id, {
          xPct: clamp(startBox.xPct + dx, 0, 1 - startBox.widthPct),
          yPct: clamp(startBox.yPct + dy, 0, 1 - startBox.heightPct),
        });
      }
    };
    const handleUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [pageIndex, onUpdateRect, onUpdateImage, onUpdateText, onUpdateRun]);

  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    registerContainer(el);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (tool === "select") return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPageClick(pageIndex, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div
        ref={setContainerRef}
        className="relative mx-auto overflow-hidden rounded"
        style={{ transform: `rotate(${page.rotation}deg)` }}
      >
        <img
          src={page.previewUrl}
          alt={`Page ${pageIndex + 1}`}
          className="block w-full select-none rounded"
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
          onClick={handleImageClick}
          draggable={false}
        />

        {page.existingRuns.map((run) => {
          const isEditing = editingRunId === run.id;
          const isModified = run.currentText !== run.originalText;
          const showOpaque = isEditing || isModified;
          const fontSizePx = Math.max(run.heightPct * containerHeightPx * 0.85, 6);
          return (
            <div
              key={run.id}
              className={`absolute ${tool === "select" ? "cursor-move hover:outline hover:outline-1 hover:outline-[var(--color-primary)]" : "pointer-events-none"}`}
              style={{
                left: `${run.xPct * 100}%`,
                top: `${run.yPct * 100}%`,
                width: `${run.widthPct * 100}%`,
                height: `${run.heightPct * 100}%`,
              }}
              onPointerDown={
                tool === "select" && !isEditing
                  ? (e) => beginDrag(e, dragRef, "run-move", run.id, run)
                  : undefined
              }
              onDoubleClick={(e) => {
                if (tool !== "select") return;
                e.stopPropagation();
                setEditingRunId(run.id);
              }}
            >
              {isEditing && (
                <div
                  className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onUpdateRun(pageIndex, run.id, { bold: !run.bold })}
                    className={`rounded p-1 ${run.bold ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"}`}
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateRun(pageIndex, run.id, { italic: !run.italic })}
                    className={`rounded p-1 ${run.italic ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"}`}
                  >
                    <Italic size={13} />
                  </button>
                  <input
                    type="color"
                    value={run.color}
                    onChange={(e) => onUpdateRun(pageIndex, run.id, { color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border border-[var(--color-border)] p-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRun(pageIndex, run.id, {
                        currentText: run.originalText,
                        color: run.originalColor,
                        bold: false,
                        italic: false,
                      });
                      setEditingRunId(null);
                    }}
                    aria-label={t("cancelEdit")}
                    className="rounded bg-[var(--color-danger)] p-1 text-white"
                  >
                    <X size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRunId(null)}
                    aria-label={t("doneEdit")}
                    className="rounded bg-[var(--color-primary)] p-1 text-white"
                  >
                    <Check size={13} />
                  </button>
                </div>
              )}
              <input
                ref={isEditing ? activeInputRef : undefined}
                value={run.currentText}
                onChange={(e) => onUpdateRun(pageIndex, run.id, { currentText: e.target.value })}
                readOnly={!isEditing}
                tabIndex={isEditing ? 0 : -1}
                style={{
                  color: showOpaque ? run.color : "transparent",
                  backgroundColor: showOpaque ? run.coverColor : "transparent",
                  fontWeight: run.bold ? 700 : 400,
                  fontStyle: run.italic ? "italic" : "normal",
                  fontFamily: CSS_FONT_FAMILY[run.fontFamily],
                  fontSize: `${fontSizePx}px`,
                  lineHeight: 1,
                }}
                className={`h-full w-full overflow-hidden p-0 outline-none ${
                  isEditing ? "border border-dashed border-[var(--color-primary)]" : "border-none"
                }`}
              />
            </div>
          );
        })}

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
            onPointerDown={(e) => beginDrag(e, dragRef, "rect-move", rectAnn.id, rectAnn)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveRect(pageIndex, rectAnn.id);
              }}
              className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white"
            >
              <X size={9} />
            </button>
            <div
              onPointerDown={(e) => beginDrag(e, dragRef, "rect-resize", rectAnn.id, rectAnn)}
              className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-full border border-white bg-[var(--color-primary)]"
            />
          </div>
        ))}

        {page.images.map((imgAnn) => (
          <div
            key={imgAnn.id}
            className="absolute border border-dashed border-[var(--color-primary)]"
            style={{
              left: `${imgAnn.xPct * 100}%`,
              top: `${imgAnn.yPct * 100}%`,
              width: `${imgAnn.widthPct * 100}%`,
              height: `${imgAnn.heightPct * 100}%`,
            }}
            onPointerDown={(e) => beginDrag(e, dragRef, "image-move", imgAnn.id, imgAnn)}
          >
            <img src={imgAnn.previewUrl} alt="" className="h-full w-full object-contain" draggable={false} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(pageIndex, imgAnn.id);
              }}
              className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-white"
            >
              <X size={9} />
            </button>
            <div
              onPointerDown={(e) => beginDrag(e, dragRef, "image-resize", imgAnn.id, imgAnn)}
              className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-full border border-white bg-[var(--color-primary)]"
            />
          </div>
        ))}

        {page.texts.map((ann) => (
          <div
            key={ann.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${ann.xPct * 100}%`, top: `${ann.yPct * 100}%` }}
            onPointerDown={(e) => beginDrag(e, dragRef, "text-move", ann.id, { ...ann, widthPct: 0, heightPct: 0 })}
          >
            <div className="flex items-center gap-0.5">
              <input
                value={ann.text}
                onChange={(e) => onUpdateText(pageIndex, ann.id, { text: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t("addTextPlaceholder")}
                autoFocus
                style={{ color: ann.color, fontSize: `${Math.max(ann.fontSize * 0.5, 9)}px` }}
                className="w-28 cursor-move rounded border border-dashed border-[var(--color-primary)] bg-[var(--color-surface)]/90 px-1 py-0.5 outline-none"
              />
              <button
                type="button"
                onClick={() => onRemoveText(pageIndex, ann.id)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-white"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">{pageIndex + 1}</p>
    </div>
  );
}
