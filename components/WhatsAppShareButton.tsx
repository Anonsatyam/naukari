"use client";

import { cn } from "@/lib/utils";

export default function WhatsAppShareButton({
  path,
  text,
  className,
}: {
  /** Relative path to the item's dedicated page, e.g. `/jobs/some-slug` */
  path: string;
  /** Short text shown alongside the link in the WhatsApp message */
  text: string;
  className?: string;
}) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${path}`;
    const message = `${text}\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share on WhatsApp"
      title="Share on WhatsApp"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#25D366] transition-colors hover:bg-[#25D366]/10",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.921.556 3.71 1.514 5.221L2 22l4.899-1.485A9.953 9.953 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.15a8.13 8.13 0 0 1-4.145-1.131l-.297-.176-3.09.937.947-3.014-.194-.31A8.13 8.13 0 1 1 12.001 20.15z" />
      </svg>
    </button>
  );
}