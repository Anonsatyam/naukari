"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { IconButton } from "@/components/admin/IconButton";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function PdfUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("PDF must be under 20MB.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading “${file.name}”…`);
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

      toast.loading("Adding watermark…", { id: toastId });
      const watermarkRes = await fetch("/api/admin/uploads/pdf/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: signData.path }),
      });
      const watermarkData = await watermarkRes.json().catch(() => ({}));
      if (!watermarkRes.ok) throw new Error(watermarkData.error || "Could not add the watermark.");

      toast.success(`"${file.name}" uploaded and watermarked.`, { id: toastId });
      onUploaded(signData.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.", { id: toastId });
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
        label={uploading ? "Uploading & watermarking…" : "Upload a PDF instead of pasting a link"}
        tone="primary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      />
    </div>
  );
}
