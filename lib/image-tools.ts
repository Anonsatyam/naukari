export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
}

export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ image: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("Could not load image. Please try a different file."));
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export image."));
      },
      type,
      quality
    );
  });
}

/**
 * Repeatedly re-encodes a canvas as JPEG at decreasing quality until the
 * result fits at or under maxKB (best effort — won't force it under any cost).
 * Returns the smallest-quality-search result found within a handful of tries.
 */
export async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  maxKB: number
): Promise<{ blob: Blob; quality: number }> {
  const maxBytes = maxKB * 1024;

  let lo = 0.05;
  let hi = 0.95;
  let best: { blob: Blob; quality: number } | null = null;

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, "image/jpeg", mid);

    if (blob.size <= maxBytes) {
      best = { blob, quality: mid };
      lo = mid; // try to push quality up while staying under the limit
    } else {
      hi = mid; // too big, reduce quality
    }
  }

  if (best) return best;

  // Even at the lowest quality tried, still too big — return the smallest we found.
  const fallback = await canvasToBlob(canvas, "image/jpeg", 0.05);
  return { blob: fallback, quality: 0.05 };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
