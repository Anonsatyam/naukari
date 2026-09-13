export const PREVIEW_STORAGE_KEY = "admin_preview_entity";

/**
 * Opens a blank tab. Must be called synchronously inside the click handler,
 * before any `await` — once an async gap passes, browsers no longer treat a
 * later window.open() as tied to the user gesture and silently block it.
 * Severs `tab.opener` (reverse-tabnabbing mitigation) while keeping our own
 * reference so we can still navigate it once the preview data is ready.
 */
export function openPreviewTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.opener = null;
    } catch {
      // ignore — some browsers make this read-only
    }
  }
  return tab;
}

/** Fills the already-open tab (from openPreviewTab) with preview data. */
export function fillPreviewTab(tab: Window | null, payload: unknown): void {
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    tab?.close();
    return;
  }
  if (tab && !tab.closed) {
    tab.location.href = "/admin/preview";
  } else {
    // Fallback: the synchronous open above was itself blocked (rare, strict
    // settings). This one won't have a user-gesture either, but it's better
    // than silently doing nothing.
    window.open("/admin/preview", "_blank");
  }
}

/** @deprecated kept for compatibility; prefer openPreviewTab + fillPreviewTab so the tab opens synchronously with the click. */
export function openPreviewWindow(payload: unknown): void {
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
  window.open("/admin/preview", "_blank", "noopener");
}
