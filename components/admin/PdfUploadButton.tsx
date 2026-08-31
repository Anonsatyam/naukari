"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { IconButton } from "@/components/admin/IconButton";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function PdfUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("PDF must be under 20MB.");
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/admin/uploads/pdf/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(signData.error || "Could not prepare the upload.");

      const supabase = getSupabaseBrowser();
      const { error: uploadError } = await supabase.storage
        .from(signData.bucket)
        .uploadToSignedUrl(signData.path, signData.token, file);
      if (uploadError) throw uploadError;

      onUploaded(signData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <IconButton
        icon={<Upload size={15} />}
        label={uploading ? "Uploading…" : "Upload a PDF instead of pasting a link"}
        tone="primary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      />
      {error && <span className="max-w-[140px] text-[11px] leading-tight text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
