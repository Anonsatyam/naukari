"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImageDropzone({
  label,
  onFile,
  className,
}: {
  label: string;
  onFile: (file: File) => void;
  className?: string;
}) {
  const t = useTranslations("toolsShared");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center transition-colors",
        isDragActive
          ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)]"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]",
        className
      )}
    >
      <input {...getInputProps()} className="sr-only" />
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        {isDragActive ? <Upload size={18} /> : <ImageIcon size={18} />}
      </span>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {t("dropHint")}
      </p>
    </div>
  );
}
