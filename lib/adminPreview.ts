export const PREVIEW_STORAGE_KEY = "admin_preview_entity";

export function openPreviewWindow(payload: unknown): void {
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
  window.open("/admin/preview", "_blank", "noopener");
}
