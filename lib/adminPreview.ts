import { toast } from "sonner";

export const PREVIEW_STORAGE_KEY = "admin_preview_entity";

/**
 * Stores the built preview and prompts the admin to open it via a toast
 * action button, rather than a speculative window.open() timed around the
 * fetch. A window.open() tied to the ORIGINAL click only stays "trusted" by
 * the browser for a very short, inconsistent window — some browsers (and
 * popup-blocking extensions) reject it the moment any async gap passes,
 * even a single microtask, which is exactly what a network round trip is.
 * The toast button's click is a brand-new, guaranteed-safe user gesture, so
 * this works regardless of how long the preview took to build.
 */
export function offerPreview(payload: unknown): void {
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    toast.error("Could not prepare the preview.");
    return;
  }
  toast.success("Preview ready", {
    description: "Click below to open it in a new tab.",
    duration: 15000,
    action: {
      label: "Open Preview",
      onClick: () => {
        window.open("/admin/preview", "_blank");
      },
    },
  });
}
