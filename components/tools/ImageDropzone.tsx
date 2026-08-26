"use client";

import { useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFile(file);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center transition-colors",
        dragOver
          ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)]"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]",
        className
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        {dragOver ? <Upload size={18} /> : <ImageIcon size={18} />}
      </span>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Click to browse, or drag and drop a JPG or PNG here
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // reset so re-selecting the same file still fires onChange
          e.target.value = "";
        }}
      />
    </div>
  );
}
