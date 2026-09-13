export type ToolMode = "select" | "text" | "cover" | "image";
export type DetectedFontFamily = "serif" | "sans" | "monospace";

export interface TextAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface RectAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  color: string;
}

export interface ImageAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  bytes: ArrayBuffer;
  previewUrl: string;
}

export interface ExistingTextRun {
  id: string;
  originalText: string;
  currentText: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  color: string;
  originalColor: string;
  coverColor: string;
  bold: boolean;
  italic: boolean;
  fontFamily: DetectedFontFamily;
  fontBytes: Uint8Array | null;
}

export interface PageEntry {
  originalIndex: number;
  previewUrl: string;
  rotation: number;
  width: number;
  height: number;
  texts: TextAnnotation[];
  rects: RectAnnotation[];
  images: ImageAnnotation[];
  existingRuns: ExistingTextRun[];
}

export const TEXT_SIZES = [
  { value: 10, labelKey: "textSizeSmall" as const },
  { value: 14, labelKey: "textSizeMedium" as const },
  { value: 22, labelKey: "textSizeLarge" as const },
];

export const TEXT_COLORS = [
  { value: "#111111", labelKey: "colorBlack" as const },
  { value: "#d13438", labelKey: "colorRed" as const },
  { value: "#2050c9", labelKey: "colorBlue" as const },
];

export const COVER_COLORS = [
  { value: "#ffffff", labelKey: "colorWhite" as const },
  { value: "#000000", labelKey: "colorBlack" as const },
  { value: "#f2f2f2", labelKey: "colorGray" as const },
];

export const MIN_ZOOM = 50;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 10;
export const BASE_PAGE_WIDTH = 760;
